import asyncio
import logging
import os
import tempfile
import uuid
from typing import Protocol, TypedDict

logger = logging.getLogger(__name__)

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

from platform_core.core.config import settings


class DevelopmentOnlyDockerSandbox:
    """
    Deterministic local adapter for testing.
    WARNING: For local development only. Do not use in production.
    Requires Docker to be installed and accessible.
    NOT A SECURITY BOUNDARY.
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

        # Create temporary directory for the submission
        with tempfile.TemporaryDirectory(prefix="zapsters_judge_") as temp_dir:
            source_path = os.path.join(temp_dir, "solution.py")
            input_path = os.path.join(temp_dir, "input.txt")
            
            with open(source_path, "w") as f:
                f.write(source_code)
                
            with open(input_path, "w") as f:
                f.write(input_data)
                
            container_name = f"zapsters-sandbox-{uuid.uuid4().hex[:8]}"
            
            # Using alpine python image as pinned image
            image = "python:3.12-alpine"
            
            # Enforce limits
            cpu_quota = 100000  # 1 CPU
            memory_bytes = memory_limit_kb * 1024
            
            # Hard timeout is time limit + 1s for overhead
            timeout_s = (time_limit_ms / 1000.0) + 1.0
            
            cmd = [
                "docker", "run", "--rm",
                "--name", container_name,
                "--network", "none",
                "--memory", str(memory_bytes),
                "--cpu-quota", str(cpu_quota),
                "--pids-limit", "64",
                "-v", f"{temp_dir}:/workspace", # Writable for temporary scratch
                "-w", "/workspace",
                # Drop privileges
                "--user", "nobody",
                image,
                "sh", "-c", "python solution.py < input.txt"
            ]
            
            # Convert to async subprocess
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            start_time = asyncio.get_event_loop().time()
            
            try:
                # Wait for process with timeout
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout_s
                )
                exit_code = proc.returncode or 0
            except TimeoutError:
                # Kill container if it times out
                kill_proc = await asyncio.create_subprocess_exec(
                    "docker", "kill", container_name,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                await kill_proc.wait()
                
                # Try to get whatever output was there (using logs)
                log_proc = await asyncio.create_subprocess_exec(
                    "docker", "logs", container_name,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout_bytes, stderr_bytes = await log_proc.communicate()
                exit_code = -1 # Indicate timeout by exit code or verdict
                
            end_time = asyncio.get_event_loop().time()
            
            runtime_ms = int((end_time - start_time) * 1000)
            
            # Memory measurement is complex in docker via CLI without stat stream,
            # We will return 0 for local adapter unless we parse `docker stats`.
            memory_kb = 0 
            
            # Truncate outputs to prevent output flood
            max_output = 65536 # 64KB
            
            stdout_str = stdout_bytes.decode('utf-8', errors='replace')[:max_output]
            stderr_str = stderr_bytes.decode('utf-8', errors='replace')[:max_output]
            
            if exit_code == -1:
                # Internal signal for TLE
                stderr_str = "TimeoutExpired\n" + stderr_str

            return {
                "stdout": stdout_str,
                "stderr": stderr_str,
                "exit_code": exit_code,
                "runtime_ms": runtime_ms,
                "memory_kb": memory_kb,
            }


class GVisorKubernetesSandbox:
    """
    Production execution adapter for gVisor/runsc via Kubernetes.
    Provisions a fresh pod per submission.
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

        pod_name = f"zapsters-sandbox-{uuid.uuid4().hex[:8]}"
        
        # In a real environment, we would use the kubernetes_asyncio library
        # Here we simulate the pod creation via kubectl apply.
        
        manifest = {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {
                "name": pod_name,
                "namespace": "judge-sandboxes"
            },
            "spec": {
                "restartPolicy": "Never",
                "runtimeClassName": "gvisor", # gVisor isolation
                "containers": [
                    {
                        "name": "sandbox",
                        "image": "python:3.12-alpine",
                        "command": ["sh", "-c", "python solution.py < input.txt"],
                        "workingDir": "/workspace",
                        "resources": {
                            "limits": {
                                "memory": f"{memory_limit_kb}Ki",
                                "cpu": "1"
                            }
                        },
                        "securityContext": {
                            "runAsUser": 65534,
                            "runAsNonRoot": True,
                            "readOnlyRootFilesystem": True,
                            "allowPrivilegeEscalation": False,
                            "capabilities": {"drop": ["ALL"]}
                        },
                        "volumeMounts": [
                            {
                                "name": "workspace",
                                "mountPath": "/workspace"
                            }
                        ]
                    }
                ],
                "volumes": [
                    {
                        "name": "workspace",
                        "emptyDir": {} # Ephemeral writable workspace
                    }
                ]
            }
        }
        
        # Wait, local kubectl might not exist or might fail if cluster is not set up.
        # This implementation will attempt to run `kubectl` and if it fails, raise an error.
        
        import yaml
        
        with tempfile.TemporaryDirectory(prefix="zapsters_kube_") as temp_dir:
            manifest_path = os.path.join(temp_dir, "pod.yaml")
            with open(manifest_path, "w") as f:
                yaml.dump(manifest, f)
                
            # Assume kubectl is configured
            try:
                proc = await asyncio.create_subprocess_exec(
                    "kubectl", "apply", "-f", manifest_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await proc.wait()
                if proc.returncode != 0:
                    raise RuntimeError("Failed to spawn Kubernetes Pod. Required infrastructure unavailable.")
            except FileNotFoundError:
                raise RuntimeError("kubectl not found. Required infrastructure unavailable.")
                
            # ... actual orchestration logic would go here (copy files to pod, wait, logs, delete)
            # Since K8s is not available locally, it will fail at kubectl apply or FileNotFoundError.
            
            return {
                "stdout": "",
                "stderr": "Execution failed: Required infrastructure unavailable.",
                "exit_code": 1,
                "runtime_ms": 0,
                "memory_kb": 0,
            }


def get_sandbox() -> SandboxOrchestrator:
    if settings.JUDGE_SANDBOX_TYPE == "docker":
        return DevelopmentOnlyDockerSandbox()
    return GVisorKubernetesSandbox()
