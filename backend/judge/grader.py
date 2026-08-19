from typing import Any, TypedDict

from judge.models import Problem, TestCase
from judge.orchestrator.sandbox import SandboxOrchestrator, SandboxResult
from platform_core.contracts.judge import Verdict


class GraderResult(TypedDict):
    verdict: Verdict
    runtime_ms: int
    memory_kb: int
    test_cases_passed: int
    test_cases_total: int
    stdout: str
    stderr: str | None
    compile_output: str | None
    cases: list[dict[str, Any]]


class Grader:
    """
    Deterministic grader for Python execution.
    Contains ZERO AI imports (CI-enforced).
    """

    def __init__(
        self,
        sandbox: SandboxOrchestrator,
        problem: Problem,
        test_cases: list[TestCase],
    ) -> None:
        self._sandbox = sandbox
        self._problem = problem
        self._test_cases = test_cases

    async def grade(self, source_code: str, language: str) -> GraderResult:
        test_cases_total = len(self._test_cases)
        if test_cases_total == 0:
            return self._build_result("accepted", 0, 0, 0, 0, "", None, cases=[])

        test_cases_passed = 0
        total_runtime_ms = 0
        max_memory_kb = 0
        overall_verdict: Verdict = "accepted"
        
        stdout_acc = []
        stderr_acc = []
        cases_details = []

        for case in self._test_cases:
            result = await self._sandbox.run(
                source_code=source_code,
                language=language,
                input_data=case.input,
                time_limit_ms=self._problem.time_limit_ms,
                memory_limit_kb=self._problem.memory_limit_kb,
            )

            total_runtime_ms += result["runtime_ms"]
            max_memory_kb = max(max_memory_kb, result["memory_kb"])
            
            if result["stdout"]:
                stdout_acc.append(result["stdout"])
            if result["stderr"]:
                stderr_acc.append(result["stderr"])
                
            case_verdict = self._evaluate_case(
                result, case.expected_output, self._problem.time_limit_ms
            )
            
            if case_verdict == "accepted":
                test_cases_passed += 1
            elif overall_verdict == "accepted":
                # First failing case dictates overall verdict
                overall_verdict = case_verdict
                
            cases_details.append({
                "index": case.position,
                "status": case_verdict,
                "hidden": True,
                "runtime_ms": result["runtime_ms"],
                "memory_kb": result["memory_kb"],
            })
            
            # Stop grading on first failure to prevent resource exhaustion and fast-fail
            if case_verdict != "accepted":
                break

        return self._build_result(
            verdict=overall_verdict,
            runtime_ms=total_runtime_ms,
            memory_kb=max_memory_kb,
            test_cases_passed=test_cases_passed,
            test_cases_total=test_cases_total,
            stdout="\n".join(stdout_acc)[:65536],
            stderr="\n".join(stderr_acc)[:65536] if stderr_acc else None,
            cases=cases_details,
        )

    def _evaluate_case(
        self,
        sandbox_result: SandboxResult,
        expected_output: str,
        time_limit_ms: int,
    ) -> Verdict:
        # Check for timeout explicitly from sandbox result
        if sandbox_result["exit_code"] == -1 and "TimeoutExpired" in sandbox_result["stderr"]:
            return "time_limit_exceeded"
            
        if sandbox_result["runtime_ms"] > time_limit_ms:
            return "time_limit_exceeded"

        if sandbox_result["exit_code"] != 0:
            # Python compile errors (SyntaxError) exit with non-zero and appear in stderr
            if (
                "SyntaxError" in sandbox_result["stderr"]
                or "IndentationError" in sandbox_result["stderr"]
            ):
                return "compile_error"
            return "runtime_error"

        # Exact match (with trailing whitespace stripped)
        actual = sandbox_result["stdout"].strip()
        expected = expected_output.strip()
        
        # Split into lines and strip trailing whitespace on each line for robust exact-match
        actual_lines = [line.rstrip() for line in actual.splitlines()]
        expected_lines = [line.rstrip() for line in expected.splitlines()]
        
        if actual_lines == expected_lines:
            return "accepted"
            
        return "wrong_answer"

    def _build_result(
        self,
        verdict: Verdict,
        runtime_ms: int,
        memory_kb: int,
        test_cases_passed: int,
        test_cases_total: int,
        stdout: str,
        stderr: str | None,
        cases: list[dict[str, Any]],
    ) -> GraderResult:
        return {
            "verdict": verdict,
            "runtime_ms": runtime_ms,
            "memory_kb": memory_kb,
            "test_cases_passed": test_cases_passed,
            "test_cases_total": test_cases_total,
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": stderr if verdict == "compile_error" else None,
            "cases": cases,
        }
