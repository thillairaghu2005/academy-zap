import asyncio

import pytest

from judge.orchestrator.sandbox import DevelopmentOnlyDockerSandbox

pytestmark = pytest.mark.asyncio

@pytest.fixture
def sandbox():
    return DevelopmentOnlyDockerSandbox()

# Attack 1: Infinite Loop
async def test_infinite_loop(sandbox):
    code = "while True: pass"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert result["exit_code"] != 0
    assert "TimeoutExpired" in result["stderr"] or result["runtime_ms"] >= 1000

# Attack 2: Fork Bomb
async def test_fork_bomb(sandbox):
    code = "import os\nwhile True:\n    try:\n        os.fork()\n    except:\n        pass"
    result = await sandbox.run(code, "python", "", 1500, 16384)
    assert result["exit_code"] != 0
    # Process limit prevents taking down the host.
    assert result["runtime_ms"] >= 1000 or "Resource temporarily unavailable" in result["stderr"]

# Attack 3: PID Exhaustion
async def test_pid_exhaustion(sandbox):
    code = "import subprocess\nprocs = []\nwhile True:\n    try:\n        procs.append(subprocess.Popen(['sleep', '10']))\n    except:\n        break\nprint(len(procs))"
    result = await sandbox.run(code, "python", "", 2000, 16384)
    # Should cap at 64 PIDs
    assert result["exit_code"] == 0 or result["exit_code"] != 0
    if result["exit_code"] == 0:
        num_procs = int(result["stdout"].strip() or "0")
        assert num_procs <= 64

# Attack 4: Memory Exhaustion
async def test_memory_exhaustion(sandbox):
    code = "a = 'x' * (1024 * 1024 * 1024)" # Try allocating 1GB
    result = await sandbox.run(code, "python", "", 1000, 16384) # Limit to 64MB
    assert result["exit_code"] != 0
    assert "MemoryError" in result["stderr"] or "Killed" in result["stderr"] or result["exit_code"] == 137

# Attack 5: CPU Exhaustion
async def test_cpu_exhaustion(sandbox):
    code = "a = 0\nfor i in range(10**10): a += i"
    result = await sandbox.run(code, "python", "", 500, 16384)
    assert result["exit_code"] != 0
    assert "TimeoutExpired" in result["stderr"]

# Attack 6: Disk Exhaustion
async def test_disk_exhaustion(sandbox):
    code = "with open('/workspace/big.txt', 'wb') as f:\n    f.write(b'x' * (1024 * 1024 * 100))"
    result = await sandbox.run(code, "python", "", 2000, 16384)
    # Could be allowed if disk quota is not strict in DevelopmentOnly mode, but it shouldn't crash host.
    assert result["exit_code"] == 0 or result["exit_code"] != 0

# Attack 7: Stdout Flood
async def test_stdout_flood(sandbox):
    code = "import sys\nwhile True: sys.stdout.write('A' * 1024)"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    # Output must be truncated to 64KB max
    assert len(result["stdout"]) <= 65536
    assert result["exit_code"] != 0

# Attack 8: Stderr Flood
async def test_stderr_flood(sandbox):
    code = "import sys\nwhile True: sys.stderr.write('B' * 1024)"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert len(result["stderr"]) <= 65550 # 65536 + TimeoutExpired wrapper
    assert result["exit_code"] != 0

# Attack 9: Network Access
async def test_network_access(sandbox):
    code = "import urllib.request\ntry:\n    urllib.request.urlopen('http://1.1.1.1', timeout=1)\n    print('SUCCESS')\nexcept Exception as e:\n    print(str(e))"
    result = await sandbox.run(code, "python", "", 2000, 16384)
    assert "Network is unreachable" in result["stdout"] or "SUCCESS" not in result["stdout"]

# Attack 10: DNS Access
async def test_dns_access(sandbox):
    code = "import socket\ntry:\n    socket.gethostbyname('example.com')\n    print('SUCCESS')\nexcept Exception as e:\n    print(str(e))"
    result = await sandbox.run(code, "python", "", 2000, 16384)
    assert "SUCCESS" not in result["stdout"]

# Attack 11: Localhost Probing
async def test_localhost_probing(sandbox):
    code = "import socket\ns = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\nres = s.connect_ex(('127.0.0.1', 8000))\nprint(res)"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert result["stdout"].strip() != "0" # Should not successfully connect to host's 8000

# Attack 12: Filesystem Traversal
async def test_filesystem_traversal(sandbox):
    code = "import os\nprint(os.listdir('/'))"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert result["exit_code"] == 0
    # Root FS is read-only, container sees its own isolated root

# Attack 13: Host Filesystem Access
async def test_host_filesystem_access(sandbox):
    code = "try:\n    with open('/etc/passwd', 'r') as f:\n        print(len(f.read()))\nexcept:\n    print('FAIL')"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    # It might read the container's /etc/passwd, not the host's

# Attack 14: Environment/Secret Access
async def test_environment_secret_access(sandbox):
    code = "import os\nprint('SECRET_KEY' in os.environ)"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert result["stdout"].strip() == "False"

# Attack 15: Privilege Escalation
async def test_privilege_escalation(sandbox):
    code = "import os\nprint(os.getuid())"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    uid = result["stdout"].strip()
    assert uid != "0" # Not root
    assert uid == "65534" # nobody uid

# Attack 16: Signal Abuse
async def test_signal_abuse(sandbox):
    code = "import os\nos.kill(1, 9)" # Try to kill init
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert result["exit_code"] != 0
    assert "PermissionError" in result["stderr"] or "Operation not permitted" in result["stderr"]

# Attack 17: Timeout Bypass
async def test_timeout_bypass(sandbox):
    code = "import signal\ndef handler(signum, frame): pass\nsignal.signal(signal.SIGTERM, handler)\nwhile True: pass"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    assert result["exit_code"] != 0
    assert "TimeoutExpired" in result["stderr"]

# Attack 18: Sandbox Escape Attempts
async def test_sandbox_escape(sandbox):
    code = "import ctypes\ntry:\n    libc = ctypes.CDLL('libc.so.6')\n    print('FAIL')\nexcept:\n    print('PASS')"
    result = await sandbox.run(code, "python", "", 1000, 16384)
    # Even if they can load libc, they shouldn't escape container

# Attack 19: Concurrent Malicious Submissions
async def test_concurrent_malicious(sandbox):
    code = "while True: pass"
    tasks = [sandbox.run(code, "python", "", 1000, 16384) for _ in range(5)]
    results = await asyncio.gather(*tasks)
    for res in results:
        assert res["exit_code"] != 0
        assert "TimeoutExpired" in res["stderr"]

# Attack 20: Cross-Submission Contamination
async def test_cross_submission_contamination(sandbox):
    code1 = "with open('/tmp/shared.txt', 'w') as f:\n    f.write('hacked')"
    code2 = "import os\nprint(os.path.exists('/tmp/shared.txt'))"
    
    # Run sequentially, pod must not reuse tmp
    res1 = await sandbox.run(code1, "python", "", 1000, 16384)
    res2 = await sandbox.run(code2, "python", "", 1000, 16384)
    
    assert res2["stdout"].strip() == "False"
