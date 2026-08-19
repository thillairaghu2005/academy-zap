import uuid

import pytest

from judge.grader import Grader
from judge.models import Problem, TestCase
from judge.orchestrator.sandbox import DevelopmentOnlyDockerSandbox


@pytest.fixture
def sandbox() -> DevelopmentOnlyDockerSandbox:
    return DevelopmentOnlyDockerSandbox()


@pytest.fixture
def problem() -> Problem:
    return Problem(
        id=uuid.uuid4(),
        slug="test-prob",
        title="Test Prob",
        difficulty="easy",
        estimated_minutes=10,
        topics=[],
        statement="print input",
        constraints=[],
        starter_code="",
        time_limit_ms=1000,
        memory_limit_kb=128000,
    )


@pytest.fixture
def test_cases() -> list[TestCase]:
    return [
        TestCase(
            id=uuid.uuid4(),
            problem_id=uuid.uuid4(),
            input="hello\n",
            expected_output="hello\n",
            position=1,
        ),
        TestCase(
            id=uuid.uuid4(),
            problem_id=uuid.uuid4(),
            input="world\n",
            expected_output="world\n",
            position=2,
        ),
    ]


@pytest.mark.asyncio
async def test_grader_accepted(
    sandbox: DevelopmentOnlyDockerSandbox,
    problem: Problem,
    test_cases: list[TestCase],
) -> None:
    grader = Grader(sandbox, problem, test_cases)
    source_code = "print(input())"

    result = await grader.grade(source_code, "python")

    assert result["verdict"] == "accepted"
    assert result["test_cases_passed"] == 2


@pytest.mark.asyncio
async def test_grader_wrong_answer(
    sandbox: DevelopmentOnlyDockerSandbox,
    problem: Problem,
    test_cases: list[TestCase],
) -> None:
    grader = Grader(sandbox, problem, test_cases)
    source_code = "print('wrong')"

    result = await grader.grade(source_code, "python")

    assert result["verdict"] == "wrong_answer"
    assert result["test_cases_passed"] == 0


@pytest.mark.asyncio
async def test_grader_compile_error(
    sandbox: DevelopmentOnlyDockerSandbox,
    problem: Problem,
    test_cases: list[TestCase],
) -> None:
    grader = Grader(sandbox, problem, test_cases)
    source_code = "def foo( \n"  # syntax error

    result = await grader.grade(source_code, "python")

    assert result["verdict"] == "compile_error"


@pytest.mark.asyncio
async def test_grader_runtime_error(
    sandbox: DevelopmentOnlyDockerSandbox,
    problem: Problem,
    test_cases: list[TestCase],
) -> None:
    grader = Grader(sandbox, problem, test_cases)
    source_code = "1 / 0"

    result = await grader.grade(source_code, "python")

    assert result["verdict"] == "runtime_error"