import pytest

from judge.orchestrator.sandbox import DevelopmentOnlyDockerSandbox, SandboxResult


@pytest.fixture
def sandbox() -> DevelopmentOnlyDockerSandbox:
    return DevelopmentOnlyDockerSandbox()


@pytest.mark.asyncio
async def test_sandbox_network_isolation(sandbox: DevelopmentOnlyDockerSandbox) -> None:
    source_code = """
import urllib.request
try:
    urllib.request.urlopen('http://1.1.1.1', timeout=1)
    print('SUCCESS')
except Exception as e:
    print('FAILED')
"""
    result: SandboxResult = await sandbox.run(
        source_code=source_code,
        language="python",
        input_data="",
        time_limit_ms=2000,
        memory_limit_kb=128000,
    )
    assert "FAILED" in result["stdout"]
    assert "SUCCESS" not in result["stdout"]


@pytest.mark.asyncio
async def test_sandbox_time_limit_infinite_loop(
    sandbox: DevelopmentOnlyDockerSandbox,
) -> None:
    source_code = """
while True:
    pass
"""
    result: SandboxResult = await sandbox.run(
        source_code=source_code,
        language="python",
        input_data="",
        time_limit_ms=1000,
        memory_limit_kb=128000,
    )
    # The sandbox should kill it and exit code -1 or contain TimeoutExpired
    assert result["exit_code"] != 0
    assert "TimeoutExpired" in result["stderr"]


@pytest.mark.asyncio
async def test_sandbox_memory_limit_allocation(
    sandbox: DevelopmentOnlyDockerSandbox,
) -> None:
    source_code = """
a = []
while True:
    a.append(' ' * 10**6)
"""
    result: SandboxResult = await sandbox.run(
        source_code=source_code,
        language="python",
        input_data="",
        time_limit_ms=2000,
        memory_limit_kb=16000,  # 16MB
    )
    # The sandbox should kill it due to OOM
    assert result["exit_code"] != 0