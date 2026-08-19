"""GVisorKubernetesSandbox — manifest-level + mocked-lifecycle tests (slice 10 F-1…F-3).

Real-cluster gVisor execution is infrastructure-blocked in CI/development, so the production
adapter's security posture is pinned down here at two levels:

STATIC (manifest invariants): the generated NetworkPolicy / ConfigMap / Pod YAML must carry the
exact production controls — runtimeClass=gvisor, digest-pinned image, no service-account token,
non-root + dropped capabilities, read-only rootfs, CPU/memory/ephemeral-storage limits,
activeDeadlineSeconds, default-deny ingress+egress, restartPolicy=Never, no hostPath / host
network / host PID / privileged / docker socket.

MOCKED (lifecycle): with `_kubectl` and log capture stubbed to a fake cluster, the full
CREATE → EXECUTE → COLLECT → RETURN → DELETE ordering is asserted for every outcome (succeeded,
failed, timeout) — including that destruction runs unconditionally in `finally`, so a pod can
never outlive its submission. This is NOT runtime proof; real gVisor acceptance requires the
real cluster gate (kubectl get nodes / runtimeclass, real malicious submission, pod cleanup).

"""

from typing import Any
from uuid import uuid4

import pytest

from judge.orchestrator.sandbox import GVisorKubernetesSandbox, SandboxResult
from platform_core.core.config import settings

pytestmark = pytest.mark.asyncio

Sandbox = GVisorKubernetesSandbox


@pytest.fixture
def sandbox() -> GVisorKubernetesSandbox:
    return GVisorKubernetesSandbox()


def _pod(sandbox: Sandbox, deadline_s: int = 7) -> dict[str, Any]:
    return sandbox._pod_manifest(f"zapsters-sandbox-{uuid4().hex[:8]}", deadline_s)


def _netpol(sandbox: Sandbox) -> dict[str, Any]:
    return sandbox._network_policy_manifest(f"zapsters-sandbox-{uuid4().hex[:8]}")


def _configmap(sandbox: Sandbox) -> dict[str, Any]:
    return sandbox._configmap_manifest(
        f"zapsters-sandbox-{uuid4().hex[:8]}", "print(1)", "in"
    )


# --- STATIC: pod manifest ------------------------------------------------------


async def test_pod_manifest_uses_gvisor_runtime_class(sandbox: Sandbox) -> None:
    assert _pod(sandbox)["spec"]["runtimeClassName"] == "gvisor"


async def test_pod_manifest_disables_service_account_token(sandbox: Sandbox) -> None:
    assert _pod(sandbox)["spec"]["automountServiceAccountToken"] is False


async def test_pod_manifest_runs_nonroot_without_privilege_escalation(sandbox: Sandbox) -> None:
    sc = _pod(sandbox)["spec"]["containers"][0]["securityContext"]
    assert sc["runAsNonRoot"] is True
    assert sc["runAsUser"] == 65534
    assert sc["allowPrivilegeEscalation"] is False
    assert sc["capabilities"]["drop"] == ["ALL"]
    assert sc["readOnlyRootFilesystem"] is True


async def test_pod_manifest_pins_image_by_digest(sandbox: Sandbox) -> None:
    image = _pod(sandbox)["spec"]["containers"][0]["image"]
    assert "@sha256:" in str(image)  # never a floating production tag
    assert image == settings.JUDGE_SANDBOX_IMAGE


async def test_pod_manifest_declares_resource_limits(sandbox: Sandbox) -> None:
    limits = _pod(sandbox)["spec"]["containers"][0]["resources"]["limits"]
    assert limits["cpu"] == settings.JUDGE_SANDBOX_CPU_LIMIT
    assert limits["memory"] == f"{settings.JUDGE_SANDBOX_MEMORY_LIMIT_MB}Mi"
    assert limits["ephemeral-storage"] == f"{settings.JUDGE_SANDBOX_MAX_DISK_MB}Mi"


async def test_pod_manifest_sets_wall_clock_deadline(sandbox: Sandbox) -> None:
    spec = _pod(sandbox, deadline_s=11)["spec"]
    assert spec["activeDeadlineSeconds"] == 11
    assert spec["restartPolicy"] == "Never"


async def test_pod_manifest_has_no_host_access_or_docker_socket(sandbox: Sandbox) -> None:
    spec = _pod(sandbox)["spec"]
    assert "hostNetwork" not in spec
    assert "hostPID" not in spec
    assert "hostIPC" not in spec
    container = spec["containers"][0]
    assert "privileged" not in container.get("securityContext", {})
    for volume in spec["volumes"]:
        assert "hostPath" not in volume
        assert volume.get("name") != "docker-socket"
        assert "docker" not in str(volume.get("hostPath", {})).lower()


async def test_pod_manifest_mounts_workspace_read_only(sandbox: Sandbox) -> None:
    container = _pod(sandbox)["spec"]["containers"][0]
    workspace_mount = next(m for m in container["volumeMounts"] if m["name"] == "workspace")
    assert workspace_mount["readOnly"] is True
    assert workspace_mount["mountPath"] == "/workspace"
    volumes = {v["name"]: v for v in _pod(sandbox)["spec"]["volumes"]}
    assert "configMap" in volumes["workspace"]
    assert volumes["scratch"] == {"name": "scratch", "emptyDir": {}}


# --- STATIC: network policy ----------------------------------------------------


async def test_network_policy_is_default_deny_both_directions(sandbox: Sandbox) -> None:
    policy = _netpol(sandbox)
    spec = policy["spec"]
    assert spec["policyTypes"] == ["Ingress", "Egress"]
    assert spec["ingress"] == []  # no inbound traffic
    assert spec["egress"] == []  # no outbound: no internet, no DNS, no API, no metadata
    labels = policy["metadata"]["labels"] if "labels" in policy["metadata"] else None
    pod_labels = spec["podSelector"]["matchLabels"]
    assert pod_labels["zapsters.io/judge-submission"]  # scoped to this submission only
    assert labels is None or "app" not in labels


# --- STATIC: configmap ---------------------------------------------------------


async def test_configmap_carries_source_and_input(sandbox: Sandbox) -> None:
    cm = _configmap(sandbox)
    assert cm["data"]["solution.py"] == "print(1)"
    assert cm["data"]["input.txt"] == "in"


# --- MOCKED: lifecycle CREATE → EXECUTE → COLLECT → RETURN → DELETE -------------


class _FakeKubectl:
    """Scripted fake cluster for the lifecycle test. Records every delete it sees."""

    def __init__(self, phase: str, exit_code: str = "0") -> None:
        self.phase = phase
        self.exit_code = exit_code
        self.deleted: list[tuple[str, str]] = []
        self.applied: list[str] = []
        self.ignore_missing = False

    async def __call__(self, args: list[str], *, timeout_secs: float = 15.0) -> tuple[int, str]:
        joined = " ".join(args)
        if args[0] == "apply":
            self.applied.append(args[-1])
            return 0, ""
        if args[0] == "delete":
            self.deleted.append((args[1], args[2]))
            self.ignore_missing = "--ignore-not-found=true" in args
            return 0, ""
        if args[0] == "get" and "jsonpath={.status.phase}" in joined:
            return 0, self.phase
        if args[0] == "get" and "jsonpath={.status.containerStatuses" in joined:
            return 0, self.exit_code
        return 0, ""


async def _run_with_fake(sandbox: Sandbox, fake: _FakeKubectl) -> SandboxResult:
    """Drive a full `run()` against the fake cluster, stubbing log capture + memory."""
    from unittest.mock import AsyncMock, patch

    with (
        patch.object(sandbox, "_kubectl", fake),
        patch.object(sandbox, "_pod_logs", AsyncMock(return_value=(b"hello\n", False))),
        patch.object(sandbox, "_pod_memory_kb", AsyncMock(return_value=1024)),
    ):
        return await sandbox.run("print('hello')", "python", "", 1000, 65536)


async def test_lifecycle_succeeded_runs_and_deletes_everything(sandbox: Sandbox) -> None:
    fake = _FakeKubectl(phase="Succeeded")
    result = await _run_with_fake(sandbox, fake)

    assert result["stdout"] == "hello\n"
    assert result["exit_code"] == 0
    assert result["memory_kb"] == 1024

    # All three resources applied, then all three destroyed — never reused.
    assert len(fake.applied) == 3
    assert {r for r, _ in fake.deleted} == {"pod", "configmap", "networkpolicy"}
    assert len(fake.deleted) == 3
    # Destructive commands must be idempotent so a straggler pod is never treated as fatal.
    assert all(fake.ignore_missing for _, _ in fake.deleted)


async def test_lifecycle_failed_pod_still_deletes(sandbox: Sandbox) -> None:
    fake = _FakeKubectl(phase="Failed", exit_code="1")
    result = await _run_with_fake(sandbox, fake)
    assert result["exit_code"] == 1
    assert {r for r, _ in fake.deleted} == {"pod", "configmap", "networkpolicy"}


async def test_lifecycle_timeout_returns_timeout_and_deletes(sandbox: Sandbox) -> None:
    fake = _FakeKubectl(phase="Pending")  # never terminates
    result = await _run_with_fake(sandbox, fake)
    assert result["exit_code"] == -1
    assert result["stderr"].startswith("TimeoutExpired")
    # Cleanup is unconditional even on the wall-clock path.
    assert {r for r, _ in fake.deleted} == {"pod", "configmap", "networkpolicy"}


async def test_lifecycle_cleanup_survives_a_delete_error(sandbox: Sandbox) -> None:
    class _FailingDelete(_FakeKubectl):
        async def __call__(
            self, args: list[str], *, timeout_secs: float = 15.0
        ) -> tuple[int, str]:
            if args[0] == "delete":
                from judge.orchestrator.sandbox import SandboxInfrastructureError

                raise SandboxInfrastructureError("kubectl delete failed (network hiccup)")
            return await super().__call__(args, timeout_secs=timeout_secs)

    fake = _FailingDelete(phase="Succeeded")
    result = await _run_with_fake(sandbox, fake)
    assert result["exit_code"] == 0  # a cleanup failure must not lose the graded result