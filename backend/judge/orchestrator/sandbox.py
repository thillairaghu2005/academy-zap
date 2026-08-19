"""Sandbox execution adapters (platform §2.4 / §5 / §6.3).

Two adapters implement the same `SandboxOrchestrator` protocol:

- `GVisorKubernetesSandbox` — the PRODUCTION adapter. Provisions a fresh, gVisor-isolated
  (runtimeClass) Kubernetes pod per submission inside a default-deny namespace (NetworkPolicy:
  no ingress, no egress), transfers source/input via an ephemeral ConfigMap, enforces wall-clock
  (activeDeadlineSeconds), CPU/memory/ephemeral-storage limits, non-root execution with dropped
  capabilities and no service-account token, captures stdout/stderr/exit code with bounded
  output, and DELETES the pod + ConfigMap + NetworkPolicy in `finally` — never reused.
- `DevelopmentOnlyDockerSandbox` — local development/testing only. NOT A SECURITY BOUNDARY.
  Hardened (read-only rootfs, cap-drop, no-new-privileges, pids-limit, no network, tmpfs
  scratch) and, like the pod adapter, enforces output caps DURING capture so an output flood
  can never accumulate unbounded memory or stall a grader.

Selection is configuration-driven (`JUDGE_SANDBOX_TYPE`) and FAIL-CLOSED: production may never
select the Docker adapter (enforced both at Settings construction and here).
"""

import asyncio
import os
import tempfile
import uuid
from typing import Protocol, TypedDict

import structlog
import yaml  # type: ignore[import-untyped]

from platform_core.core.config import settings

logger = structlog.get_logger(__name__)


class SandboxResult(TypedDict):
    stdout: str
    stderr: str
    exit_code: int
    runtime_ms: int
    memory_kb: int


class SandboxOrchestrator(Protocol):
    async def run(
        self,
        source_code: str,
        language: str,
        input_data: str,
        time_limit_ms: int,
        memory_limit_kb: int,
    ) -> SandboxResult: ...


class SandboxInfrastructureError(RuntimeError):
    """The execution environment (kubectl/cluster/Docker daemon) is unavailable or failed.

    Distinct from a user-code failure: the worker treats this as a retryable infrastructure
    outage (F-10), never as a graded verdict.
    """


async def _read_bounded(stream: asyncio.StreamReader, max_bytes: int) -> tuple[bytes, bool]:
    """Read `stream` to EOF, retaining at most `max_bytes` and DISCARDING the remainder.

    Memory stays bounded no matter how much the child writes; the wall-clock budget is the
    caller's `asyncio.wait_for` around process completion. Returns (retained bytes, truncated).
    """
    retained = bytearray()
    truncated = False
    while True:
        chunk = await stream.read(8192)
        if not chunk:
            break
        if not truncated and len(retained) < max_bytes:
            room = max_bytes - len(retained)
            retained += chunk[:room]
            if len(chunk) > room:
                truncated = True
        else:
            truncated = True
    return bytes(retained), truncated


def _decode_capped(data: bytes, truncated: bool, max_bytes: int) -> str:
    text = data.decode("utf-8", errors="replace")
    if truncated:
        text += f"\n[output truncated at {max_bytes} bytes]"
    return text


def _write_sources(temp_dir: str, source_code: str, input_data: str) -> tuple[str, str]:
    """Synchronous helper: write the submission source and input files into `temp_dir`.

    Kept out of the async path so blocking file I/O never stalls the event loop.
    """
    source_path = os.path.join(temp_dir, "solution.py")
    input_path = os.path.join(temp_dir, "input.txt")
    with open(source_path, "w", encoding="utf-8") as f:
        f.write(source_code)
    with open(input_path, "w", encoding="utf-8") as f:
        f.write(input_data)
    return source_path, input_path


def _write_manifest(temp_dir: str, kind: str, manifest: dict[str, object]) -> str:
    """Synchronous helper: serialise one Kubernetes manifest to a temp file (ASYNC230)."""
    path = os.path.join(temp_dir, f"{kind.lower()}.yaml")
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(manifest, f, default_flow_style=False)
    return path


class DevelopmentOnlyDockerSandbox:
    """Deterministic local adapter for testing.

    WARNING: For local development and tests only. Never selectable in production (fail-closed
    in `get_sandbox()` and Settings validation). Requires Docker. NOT A SECURITY BOUNDARY.
    """

    def __init__(self) -> None:
        pass

    async def run(
        self,
        source_code: str,
        language: str,
        input_data: str,
        time_limit_ms: int,
        memory_limit_kb: int,
    ) -> SandboxResult:
        if language != "python":
            raise ValueError(f"Language {language} is not supported by sandbox")

        max_output = settings.JUDGE_SANDBOX_MAX_OUTPUT_BYTES
        max_procs = settings.JUDGE_SANDBOX_MAX_PROCESSES
        max_disk_mb = settings.JUDGE_SANDBOX_MAX_DISK_MB
        # Hard timeout is time limit + grace for image/container startup overhead.
        timeout_s = (time_limit_ms / 1000.0) + settings.JUDGE_SANDBOX_WALL_GRACE_SECONDS
        memory_bytes = memory_limit_kb * 1024

        # Writable scratch is a size-capped tmpfs; the source/input bind is read-only, so a
        # disk-fill attempt is contained (tmpfs runs out, host disk is never touched).
        with tempfile.TemporaryDirectory(prefix="zapsters_judge_") as temp_dir:
            source_path, input_path = await asyncio.to_thread(
                _write_sources, temp_dir, source_code, input_data
            )

            container_name = f"zapsters-sandbox-{uuid.uuid4().hex[:8]}"
            cmd = [
                "docker",
                "run",
                "--rm",
                "--name", container_name,
                "--network", "none",
                "--memory", str(memory_bytes),
                "--cpu-quota", "100000",  # 1 CPU
                "--pids-limit", str(max_procs),
                "--init",  # tini as PID 1: reaps zombies, sane signal handling
                "--user", "nobody",
                "--cap-drop", "ALL",
                "--security-opt", "no-new-privileges",
                "--read-only",
                "--tmpfs", f"/tmp:size={max_disk_mb}m",  # nosec B108 - container-internal tmpfs scratch
                "-v", f"{temp_dir}:/workspace:ro",
                "-w", "/tmp",  # nosec B108 - container working dir, not a host temp path
                settings.JUDGE_SANDBOX_IMAGE,
                "sh", "-c", "python /workspace/solution.py < /workspace/input.txt",
            ]

            start_time = asyncio.get_event_loop().time()
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            if proc.stdout is None or proc.stderr is None:
                raise SandboxInfrastructureError("docker run did not expose output pipes")
            stdout_task = asyncio.create_task(_read_bounded(proc.stdout, max_output))
            stderr_task = asyncio.create_task(_read_bounded(proc.stderr, max_output))

            timed_out = False
            try:
                await asyncio.wait_for(proc.wait(), timeout=timeout_s)
            except TimeoutError:
                timed_out = True
                await self._kill_container(container_name)
                try:
                    await asyncio.wait_for(proc.wait(), timeout=5.0)
                except TimeoutError:
                    proc.kill()
                    await proc.wait()

            stdout_bytes, stdout_trunc = await stdout_task
            stderr_bytes, stderr_trunc = await stderr_task
            end_time = asyncio.get_event_loop().time()

            exit_code = proc.returncode if proc.returncode is not None else -1
            if timed_out:
                exit_code = -1  # grader convention for time_limit_exceeded
            elif exit_code in (137,) and await self._was_oom_killed(container_name):
                exit_code = 137  # memory-limit kill; grader classifies as runtime_error

            stdout_str = _decode_capped(stdout_bytes, stdout_trunc, max_output)
            stderr_str = _decode_capped(stderr_bytes, stderr_trunc, max_output)
            if timed_out:
                stderr_str = "TimeoutExpired\n" + stderr_str

            memory_kb = 0
            if not timed_out:
                memory_kb = await self._docker_memory_kb(container_name)

            return {
                "stdout": stdout_str,
                "stderr": stderr_str,
                "exit_code": exit_code,
                "runtime_ms": int((end_time - start_time) * 1000),
                "memory_kb": memory_kb,
            }

    @staticmethod
    async def _kill_container(container_name: str) -> None:
        try:
            kill_proc = await asyncio.create_subprocess_exec(
                "docker", "kill", container_name,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.wait_for(kill_proc.wait(), timeout=10.0)
        except (FileNotFoundError, TimeoutError):
            logger.exception("docker kill failed", container=container_name)

    @staticmethod
    async def _docker_memory_kb(container_name: str) -> int:
        """Best-effort peak memory via one-shot `docker stats` (requires the daemon)."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "stats", "--no-stream", "--format", "{{.MemUsage}}", container_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            out, _ = await asyncio.wait_for(proc.communicate(), timeout=5.0)
            text = out.decode("utf-8", errors="replace").strip()
            # Format: "12.34MiB / 256MiB"
            usage = text.split(" / ")[0].strip()
            if usage.endswith("MiB"):
                return int(float(usage[:-3]) * 1024)
            if usage.endswith("KiB"):
                return int(float(usage[:-3]))
            if usage.endswith("GiB"):
                return int(float(usage[:-3]) * 1024 * 1024)
            return 0
        except (FileNotFoundError, TimeoutError, ValueError, IndexError):
            return 0

    @staticmethod
    async def _was_oom_killed(container_name: str) -> bool:
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "inspect", "--format", "{{.State.OOMKilled}}", container_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            out, _ = await asyncio.wait_for(proc.communicate(), timeout=5.0)
            return out.decode("utf-8", errors="replace").strip().lower() == "true"
        except (FileNotFoundError, TimeoutError):
            return False


class GVisorKubernetesSandbox:
    """Production execution adapter: fresh gVisor pod per submission, destroyed in `finally`.

    Full lifecycle via kubectl against a real cluster (k3s dev/staging, managed nodes in prod —
    platform §2.4):

    1. apply default-deny NetworkPolicy (no ingress, no egress)
    2. create ephemeral ConfigMap with solution.py + input.txt
    3. apply the Pod (runtimeClass=gvisor, digest-pinned image, non-root, no SA token,
       read-only rootfs, capability drop, CPU/memory/ephemeral-storage limits,
       activeDeadlineSeconds)
    4. wait for Succeeded/Failed (wall-clock bounded)
    5. capture exit code, logs (bounded), best-effort memory
    6. DELETE pod + ConfigMap + NetworkPolicy in `finally` — never reused
    """

    def __init__(self) -> None:
        self._namespace = settings.JUDGE_SANDBOX_NAMESPACE
        self._runtime_class = settings.JUDGE_SANDBOX_RUNTIME_CLASS
        self._image = settings.JUDGE_SANDBOX_IMAGE
        self._max_output = settings.JUDGE_SANDBOX_MAX_OUTPUT_BYTES
        self._max_procs = settings.JUDGE_SANDBOX_MAX_PROCESSES
        self._max_disk_mb = settings.JUDGE_SANDBOX_MAX_DISK_MB
        self._cpu_limit = settings.JUDGE_SANDBOX_CPU_LIMIT
        self._memory_limit_mb = settings.JUDGE_SANDBOX_MEMORY_LIMIT_MB
        self._wall_grace = settings.JUDGE_SANDBOX_WALL_GRACE_SECONDS

    async def run(
        self,
        source_code: str,
        language: str,
        input_data: str,
        time_limit_ms: int,
        memory_limit_kb: int,
    ) -> SandboxResult:
        if language != "python":
            raise ValueError(f"Language {language} is not supported by sandbox")

        pod_name = f"zapsters-sandbox-{uuid.uuid4().hex[:8]}"
        deadline_s = int(time_limit_ms / 1000) + self._wall_grace

        netpol_yaml = self._network_policy_manifest(pod_name)
        configmap_yaml = self._configmap_manifest(pod_name, source_code, input_data)
        pod_yaml = self._pod_manifest(pod_name, deadline_s)

        start_time = asyncio.get_event_loop().time()
        try:
            with tempfile.TemporaryDirectory(prefix="zapsters_kube_") as temp_dir:
                for resource_yaml, kind in (
                    (netpol_yaml, "NetworkPolicy"),
                    (configmap_yaml, "ConfigMap"),
                    (pod_yaml, "Pod"),
                ):
                    path = await asyncio.to_thread(
                        _write_manifest, temp_dir, kind, resource_yaml
                    )
                    await self._kubectl(["apply", "-f", path])

                phase, exit_code = await self._wait_for_pod(pod_name, deadline_s)

                if phase == "timeout":
                    stdout_str = ""
                    stderr_str = "TimeoutExpired\n"
                    exit_code = -1
                    runtime_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
                    memory_kb = 0
                    return {
                        "stdout": stdout_str,
                        "stderr": stderr_str,
                        "exit_code": exit_code,
                        "runtime_ms": runtime_ms,
                        "memory_kb": memory_kb,
                    }

                # `kubectl logs` merges stdout+stderr; the merged stream is surfaced in both
                # channels so the grader can find compile errors (stderr) and diff stdout.
                log_bytes, log_trunc = await self._pod_logs(pod_name)
                stdout_str = _decode_capped(log_bytes, log_trunc, self._max_output)
                stderr_str = stdout_str

                runtime_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
                memory_kb = await self._pod_memory_kb(pod_name)
                return {
                    "stdout": stdout_str,
                    "stderr": stderr_str,
                    "exit_code": exit_code,
                    "runtime_ms": runtime_ms,
                    "memory_kb": memory_kb,
                }
        finally:
            # Destruction is unconditional — the pod is never reused, not even for the same
            # user (platform §5 step 4d), and a stranded pod must never accumulate.
            for resource, name in (
                ("pod", pod_name),
                ("configmap", f"{pod_name}-src"),
                ("networkpolicy", f"{pod_name}-netpol"),
            ):
                try:
                    await self._kubectl(
                        ["delete", resource, name, "--ignore-not-found=true"],
                        timeout_secs=30.0,
                    )
                except SandboxInfrastructureError:
                    logger.exception("judge sandbox cleanup failed", resource=resource, name=name)

    # -- manifests ------------------------------------------------------------------

    def _network_policy_manifest(self, pod_name: str) -> dict[str, object]:
        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "NetworkPolicy",
            "metadata": {"name": f"{pod_name}-netpol", "namespace": self._namespace},
            "spec": {
                "podSelector": {"matchLabels": {"zapsters.io/judge-submission": pod_name}},
                # Explicit empty policyTypes + empty ingress/egress lists = default-deny in
                # BOTH directions: no internet, no DNS, no internal services, no other pods,
                # no cloud metadata, no Kubernetes API (platform §2.4/§6.3).
                "policyTypes": ["Ingress", "Egress"],
                "ingress": [],
                "egress": [],
            },
        }

    def _configmap_manifest(
        self, pod_name: str, source_code: str, input_data: str
    ) -> dict[str, object]:
        return {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "metadata": {"name": f"{pod_name}-src", "namespace": self._namespace},
            "data": {"solution.py": source_code, "input.txt": input_data},
        }

    def _pod_manifest(self, pod_name: str, deadline_s: int) -> dict[str, object]:
        return {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {
                "name": pod_name,
                "namespace": self._namespace,
                "labels": {"zapsters.io/judge-submission": pod_name},
            },
            "spec": {
                "restartPolicy": "Never",
                "automountServiceAccountToken": False,  # no cluster/cloud credentials (F-4)
                "runtimeClassName": self._runtime_class,  # gVisor/runsc (F-1)
                "activeDeadlineSeconds": deadline_s,  # wall clock (F-3)
                "containers": [
                    {
                        "name": "sandbox",
                        "image": self._image,  # digest-pinned (F-4)
                        "imagePullPolicy": "IfNotPresent",
                        "command": [
                            "sh", "-c",
                            f"ulimit -u {self._max_procs} 2>/dev/null || true; "
                            "exec python /workspace/solution.py < /workspace/input.txt",
                        ],
                        "workingDir": "/tmp",  # nosec B108 - container working dir, not a host temp path
                        "resources": {
                            "limits": {
                                "cpu": self._cpu_limit,
                                "memory": f"{self._memory_limit_mb}Mi",
                                "ephemeral-storage": f"{self._max_disk_mb}Mi",
                            }
                        },
                        "securityContext": {
                            "runAsUser": 65534,
                            "runAsNonRoot": True,
                            "readOnlyRootFilesystem": True,
                            "allowPrivilegeEscalation": False,
                            "capabilities": {"drop": ["ALL"]},
                        },
                        "volumeMounts": [
                            {"name": "workspace", "mountPath": "/workspace", "readOnly": True},
                            {"name": "scratch", "mountPath": "/tmp"},  # nosec B108 - container tmpfs scratch
                        ],
                    }
                ],
                "volumes": [
                    {"name": "workspace", "configMap": {"name": f"{pod_name}-src"}},
                    {"name": "scratch", "emptyDir": {}},
                ],
            },
        }

    # -- lifecycle ------------------------------------------------------------------

    async def _kubectl(self, args: list[str], *, timeout_secs: float = 15.0) -> tuple[int, str]:
        try:
            proc = await asyncio.create_subprocess_exec(
                "kubectl",
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as exc:
            raise SandboxInfrastructureError(
                "kubectl not found. Required Kubernetes infrastructure unavailable."
            ) from exc
        try:
            stdout_b, stderr_b = await asyncio.wait_for(
                proc.communicate(), timeout=timeout_secs
            )
        except TimeoutError as exc:
            proc.kill()
            await proc.wait()
            raise SandboxInfrastructureError(f"kubectl {' '.join(args)} timed out") from exc
        if proc.returncode not in (0, None):
            detail = (stdout_b + stderr_b).decode("utf-8", errors="replace").strip()[:1000]
            raise SandboxInfrastructureError(
                f"kubectl {' '.join(args)} failed ({proc.returncode}): {detail}"
            )
        return proc.returncode or 0, (stdout_b + stderr_b).decode("utf-8", errors="replace")

    async def _wait_for_pod(self, pod_name: str, deadline_s: int) -> tuple[str, int]:
        """Poll pod phase until Succeeded/Failed or the wall-clock deadline.

        Returns ("succeeded"/"failed", exit_code) or ("timeout", -1).
        """
        base = ["get", "pod", pod_name, "-n", self._namespace]
        deadline = asyncio.get_event_loop().time() + deadline_s + 3.0  # +3s API latency margin
        while True:
            _, phase_out = await self._kubectl(
                base + ["-o", "jsonpath={.status.phase}"], timeout_secs=10.0
            )
            phase = phase_out.strip()
            if phase == "Succeeded":
                code = await self._pod_exit_code(pod_name)
                return "succeeded", code if code is not None else 0
            if phase == "Failed":
                code = await self._pod_exit_code(pod_name)
                return "failed", code if code is not None else 1
            if asyncio.get_event_loop().time() >= deadline:
                return "timeout", -1
            await asyncio.sleep(0.5)

    async def _pod_exit_code(self, pod_name: str) -> int | None:
        _, out = await self._kubectl(
            [
                "get", "pod", pod_name, "-n", self._namespace,
                "-o", "jsonpath={.status.containerStatuses[0].state.terminated.exitCode}",
            ],
            timeout_secs=10.0,
        )
        text = out.strip()
        if not text:
            return None
        try:
            return int(text)
        except ValueError:
            return None

    async def _pod_logs(self, pod_name: str, *, stderr: bool = False) -> tuple[bytes, bool]:
        # `kubectl logs` merges stdout+stderr; a container that wrote to stderr only is still
        # captured (both streams end up in the same reader), so the `stderr` flag is accepted
        # for symmetry with the Docker adapter but both calls read the merged log.
        args = ["logs", pod_name, "-n", self._namespace]
        try:
            proc = await asyncio.create_subprocess_exec(
                "kubectl",
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
        except FileNotFoundError as exc:
            raise SandboxInfrastructureError(
                "kubectl not found. Required Kubernetes infrastructure unavailable."
            ) from exc
        if proc.stdout is None:
            raise SandboxInfrastructureError("kubectl logs did not expose an output pipe")
        try:
            return await asyncio.wait_for(
                _read_bounded(proc.stdout, self._max_output), timeout=10.0
            )
        finally:
            if proc.returncode is None:
                proc.kill()
            await proc.wait()

    async def _pod_memory_kb(self, pod_name: str) -> int:
        """Best-effort peak memory via `kubectl top pod` (requires metrics-server)."""
        try:
            _, out = await self._kubectl(
                ["top", "pod", pod_name, "-n", self._namespace, "--no-headers"],
                timeout_secs=5.0,
            )
            # "pod-name   12Mi"
            fields = out.split()
            if len(fields) >= 2:
                value, unit = fields[1][:-2], fields[1][-2:]
                number = float(value)
                if unit == "Mi":
                    return int(number * 1024)
                if unit == "Gi":
                    return int(number * 1024 * 1024)
                if unit == "Ki":
                    return int(number)
            return 0
        except (SandboxInfrastructureError, ValueError, IndexError):
            return 0


def get_sandbox() -> SandboxOrchestrator:
    """Fail-closed selection: production can never receive the Docker adapter (F-11).

    The primary guard is the Settings model_validator (fires for every process — API and
    worker alike); this is a second independent check at the selection boundary so a future
    caller cannot bypass it by constructing settings differently.
    """
    if settings.ENV == "production" and settings.JUDGE_SANDBOX_TYPE == "docker":
        raise SandboxInfrastructureError(
            "CRITICAL: DevelopmentOnlyDockerSandbox cannot be used in production. "
            "Set JUDGE_SANDBOX_TYPE=gvisor."
        )
    if settings.JUDGE_SANDBOX_TYPE == "docker":
        return DevelopmentOnlyDockerSandbox()
    return GVisorKubernetesSandbox()
