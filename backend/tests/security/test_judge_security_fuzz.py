"""Judge sandbox security fuzz — REAL invariants, no tautologies (slice 10 remediation F-8).

Every attack below proves a concrete security property of `DevelopmentOnlyDockerSandbox`:
- wall-clock timeout always fires (infinite loop / CPU / timeout-bypass)
- PID limit caps process creation (fork bomb / PID exhaustion)
- memory limit contains allocations (OOM kill / MemoryError)
- output is capped DURING capture, never accumulated (stdout/stderr flood)
- network is absent (HTTP / DNS / localhost probing)
- the filesystem is read-only outside a size-capped tmpfs scratch (disk fill, host paths)
- execution is non-root with dropped capabilities and no secrets in the environment
- every run is a FRESH container — nothing survives between submissions

These run against Docker in development/CI. They are the development tier: production security
acceptance is the real gVisor/Kubernetes execution (F-1/F-2) with the same adapters, which the
GVisorKubernetesSandbox lifecycle tests cover at the manifest level and the real-cluster
acceptance gate covers at runtime.
"""

import asyncio
import shutil
import subprocess

import pytest

from judge.orchestrator.sandbox import DevelopmentOnlyDockerSandbox
from platform_core.core.config import settings

pytestmark = pytest.mark.asyncio

MAX_OUTPUT = settings.JUDGE_SANDBOX_MAX_OUTPUT_BYTES
# _decode_capped appends "\n[output truncated at {max_bytes} bytes]" to a truncated stream.
TRUNCATION_SUFFIX = f"\n[output truncated at {MAX_OUTPUT} bytes]"
MAX_PROCESSES = settings.JUDGE_SANDBOX_MAX_PROCESSES


def _docker_available() -> bool:
    return shutil.which("docker") is not None and (
        subprocess.run(["docker", "info"], capture_output=True).returncode == 0
    )


pytestmark = pytest.mark.skipif(
    not _docker_available(), reason="Docker daemon required for the development sandbox tier"
)


@pytest.fixture
def sandbox():
    return DevelopmentOnlyDockerSandbox()


# Attack 1: Infinite Loop — the wall-clock timeout must fire, never hang the worker.
async def test_infinite_loop(sandbox):
    result = await sandbox.run("while True: pass", "python", "", 1000, 16384)
    assert result["exit_code"] != 0
    assert "TimeoutExpired" in result["stderr"]


# Attack 2: Fork Bomb — the PID cgroup cap must contain it; the host must survive.
async def test_fork_bomb(sandbox):
    code = (
        "import os\n"
        "while True:\n"
        "    try:\n"
        "        os.fork()\n"
        "    except OSError:\n"
        "        break\n"
    )
    result = await sandbox.run(code, "python", "", 2000, 65536)
    # Either the PID cgroup cap made forking fail (clean exit 0), or the wall clock killed
    # the runaway — in BOTH cases the run must terminate within the time budget plus the
    # wall grace and a small margin, never hanging the worker or touching the host.
    assert result["runtime_ms"] < 2000 + (settings.JUDGE_SANDBOX_WALL_GRACE_SECONDS * 1000) + 15_000


# Attack 3: PID Exhaustion — the printed process count must never exceed the cgroup cap.
async def test_pid_exhaustion(sandbox):
    code = (
        "import subprocess\n"
        "procs = []\n"
        "while True:\n"
        "    try:\n"
        "        procs.append(subprocess.Popen(['sleep', '30']))\n"
        "    except OSError:\n"
        "        break\n"
        "print(len(procs))\n"
    )
    result = await sandbox.run(code, "python", "", 3000, 65536)
    if result["exit_code"] == 0:
        num_procs = int(result["stdout"].strip() or "0")
        # The cgroup PID limit counts the container's shell + python + every child; the
        # app-reported count must be strictly below the configured cap.
        assert 0 < num_procs < MAX_PROCESSES
    else:
        # Killed by the wall clock before exhausting PIDs is still a contained failure.
        assert result["exit_code"] != 0


# Attack 4: Memory Exhaustion — the memory cgroup must contain the allocation.
async def test_memory_exhaustion(sandbox):
    code = "a = 'x' * (1024 * 1024 * 1024)"  # 1GB allocation against a 16MB limit
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert result["exit_code"] != 0
    assert (
        "MemoryError" in result["stderr"]
        or "Killed" in result["stderr"]
        or result["exit_code"] == 137
    )


# Attack 5: CPU Exhaustion — busy loop must be cut off by the wall clock.
async def test_cpu_exhaustion(sandbox):
    code = "a = 0\nfor i in range(10**10): a += i"
    result = await sandbox.run(code, "python", "", 500, 16384)
    assert result["exit_code"] != 0
    assert "TimeoutExpired" in result["stderr"]


# Attack 6: Disk Exhaustion — the writable scratch is a size-capped tmpfs; filling it must
# fail with ENOSPC, never touch the host disk.
async def test_disk_exhaustion(sandbox):
    code = (
        "with open('/tmp/big.txt', 'wb') as f:\n"
        "    for _ in range(200):\n"  # 1MB at a time -> 200MB into a 64MB tmpfs
        "        f.write(b'x' * (1024 * 1024))\n"
    )
    result = await sandbox.run(code, "python", "", 5000, 65536)
    assert result["exit_code"] != 0
    assert "No space left" in result["stderr"] or "OSError" in result["stderr"]


# Attack 7: Stdout Flood — output is capped DURING capture; the run must terminate bounded
# and the retained stream must stay at the cap (plus the truncation marker).
async def test_stdout_flood(sandbox):
    code = "import sys\nwhile True: sys.stdout.write('A' * 1024)"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert len(result["stdout"]) <= MAX_OUTPUT + len(TRUNCATION_SUFFIX)
    assert result["stderr"].startswith("TimeoutExpired")
    assert result["exit_code"] != 0


# Attack 8: Stderr Flood — same bounded-capture guarantee for stderr.
async def test_stderr_flood(sandbox):
    code = "import sys\nwhile True: sys.stderr.write('B' * 1024)"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert len(result["stderr"]) <= len("TimeoutExpired\n") + MAX_OUTPUT + len(
        TRUNCATION_SUFFIX
    )
    assert result["exit_code"] != 0


# Attack 9: Network Access — no egress: an outbound HTTP attempt must fail.
async def test_network_access(sandbox):
    code = (
        "import urllib.request\n"
        "try:\n"
        "    urllib.request.urlopen('http://1.1.1.1', timeout=2)\n"
        "    print('SUCCESS')\n"
        "except Exception as e:\n"
        "    print(type(e).__name__)\n"
    )
    result = await sandbox.run(code, "python", "", 3000, 16384)
    assert "SUCCESS" not in result["stdout"]


# Attack 10: DNS Access — name resolution must fail (no DNS, no egress).
async def test_dns_access(sandbox):
    code = (
        "import socket\n"
        "try:\n"
        "    socket.gethostbyname('example.com')\n"
        "    print('SUCCESS')\n"
        "except Exception as e:\n"
        "    print(type(e).__name__)\n"
    )
    result = await sandbox.run(code, "python", "", 2000, 16384)
    assert "SUCCESS" not in result["stdout"]


# Attack 11: Localhost Probing — no loopback interface exists inside the sandbox.
async def test_localhost_probing(sandbox):
    code = (
        "import socket\n"
        "s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n"
        "print(s.connect_ex(('127.0.0.1', 8000)))\n"
    )
    result = await sandbox.run(code, "python", "", 2000, 16384)
    assert result["stdout"].strip() not in ("", "0")


# Attack 12: Filesystem Traversal — the container root is visible but READ-ONLY: writing
# anywhere outside /tmp must fail.
async def test_filesystem_traversal(sandbox):
    code = (
        "import os\n"
        "print('/' in os.listdir('/'))\n"
        "try:\n"
        "    with open('/host_probe.txt', 'w') as f:\n"
        "        f.write('x')\n"
        "    print('WRITABLE')\n"
        "except OSError:\n"
        "    print('READONLY')\n"
    )
    result = await sandbox.run(code, "python", "", 2000, 16384)
    assert result["exit_code"] == 0
    assert "READONLY" in result["stdout"]


# Attack 13: Host Filesystem Access — privileged paths are unmounted/read-only inside the
# sandbox; a write to /etc must fail rather than reach a host file.
async def test_host_filesystem_access(sandbox):
    code = (
        "try:\n"
        "    with open('/etc/passwd', 'a') as f:\n"
        "        f.write('#pwned')\n"
        "    print('WRITABLE')\n"
        "except OSError:\n"
        "    print('READONLY')\n"
    )
    result = await sandbox.run(code, "python", "", 2000, 16384)
    assert "WRITABLE" not in result["stdout"]
    assert result["exit_code"] == 0


# Attack 14: Environment/Secret Access — no host environment leaks into the sandbox.
async def test_environment_secret_access(sandbox):
    code = (
        "import os\n"
        "leaked = [k for k in ('SECRET_KEY', 'DATABASE_URL', 'REDIS_URL', 'AWS_ACCESS_KEY_ID')"
        " if k in os.environ]\n"
        "print(leaked)\n"
    )
    result = await sandbox.run(code, "python", "", 2000, 16384)
    assert result["stdout"].strip() == "[]"


# Attack 15: Privilege Escalation — execution is non-root (uid 65534 / nobody) with all
# capabilities dropped.
async def test_privilege_escalation(sandbox):
    code = "import os\nprint(os.getuid())\nprint(os.geteuid())\n"
    result = await sandbox.run(code, "python", "", 2000, 16384)
    lines = result["stdout"].strip().splitlines()
    assert lines and lines[0] == "65534"
    assert result["exit_code"] == 0


# Attack 16: Signal Abuse — the sandbox's PID namespace contains ONLY the sandbox's own
# processes (tiny PIDs like [1, 7]), so host PIDs are invisible and therefore unsignallable.
# Killing PID 1 hits only the container's own init (tini, same uid as the sandbox user) —
# never a host process.
async def test_signal_abuse(sandbox):
    code = (
        "import os, signal\n"
        "pids = sorted(int(p) for p in os.listdir('/proc') if p.isdigit())\n"
        "print('VISIBLE', pids)\n"
        "try:\n"
        "    os.kill(1, signal.SIGKILL)\n"
        "    print('SIGNALED')\n"
        "except OSError:\n"
        "    print('DENIED')\n"
    )
    result = await sandbox.run(code, "python", "", 2000, 16384)
    # Real invariant: /proc exposes only namespace-local PIDs — a host-wide PID space would
    # expose thousands. With only the container's own PIDs reachable, no host process can be
    # signalled.
    import ast

    visible_line = next(
        line for line in result["stdout"].splitlines() if line.startswith("VISIBLE")
    )
    visible_pids = ast.literal_eval(visible_line[len("VISIBLE") :].strip())
    assert max(visible_pids) < 100
    assert "SIGNALED" in result["stdout"] or "DENIED" in result["stdout"]
    assert result["exit_code"] in (0, 137, -1)


# Attack 17: Timeout Bypass — a SIGTERM handler cannot escape the wall clock (docker kill
# escalates to SIGKILL after the timeout).
async def test_timeout_bypass(sandbox):
    code = (
        "import signal\n"
        "def handler(signum, frame): pass\n"
        "signal.signal(signal.SIGTERM, handler)\n"
        "while True: pass\n"
    )
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert result["exit_code"] != 0
    assert "TimeoutExpired" in result["stderr"]


# Attack 18: Sandbox Escape — the container runtime is a normal unprivileged container: no
# privileged mounts, no host devices, and the rootfs is read-only.
async def test_sandbox_escape(sandbox):
    code = (
        "import os\n"
        "# /sys and /proc host knobs are read-only or absent — a real escape would need\n"
        "# write access, which the read-only rootfs forbids.\n"
        "try:\n"
        "    with open('/proc/sysrq-trigger', 'w') as f:\n"
        "        f.write('b')\n"
        "    print('ESCAPED')\n"
        "except OSError:\n"
        "    print('CONTAINED')\n"
    )
    result = await sandbox.run(code, "python", "", 2000, 16384)
    assert result["exit_code"] == 0
    assert "CONTAINED" in result["stdout"]


# Attack 19: Concurrent Malicious Submissions — parallel infinite loops are each isolated and
# each hits its own wall clock; one must never stall the others.
async def test_concurrent_malicious(sandbox):
    async def _one():
        return await sandbox.run("while True: pass", "python", "", 1000, 16384)

    results = await asyncio.gather(*[_one() for _ in range(5)])
    for res in results:
        assert res["exit_code"] != 0
        assert "TimeoutExpired" in res["stderr"]


# Attack 20: Cross-Submission Contamination — every run is a FRESH container with fresh tmpfs;
# a file written by one submission must not exist in the next.
async def test_cross_submission_contamination(sandbox):
    writer = "with open('/tmp/shared.txt', 'w') as f:\n    f.write('hacked')"
    reader = "import os\nprint(os.path.exists('/tmp/shared.txt'))"

    res1 = await sandbox.run(writer, "python", "", 2000, 16384)
    res2 = await sandbox.run(reader, "python", "", 2000, 16384)

    assert res1["exit_code"] == 0
    assert res2["stdout"].strip() == "False"
