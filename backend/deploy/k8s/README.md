# Zapsters Judge — Kubernetes deployment prerequisites and procedure.
#
# These manifests were written by an AI assistant during Slice 10 finalization. Per
# build.md §12.1 they MUST be reviewed by a human with Kubernetes production
# authority before anything is applied to a real cluster. Apply order is the numeric
# prefix order; the RuntimeClass and the node configuration are infrastructure that
# no manifest can create.

## What these files are

| File | Purpose |
|------|---------|
| `00-namespace.yaml` | `judge-sandboxes` tenant namespace, isolated from the data plane. |
| `10-runtimeclass-gvisor.yaml` | `gvisor` RuntimeClass → `runsc` handler on gVisor-capable nodes. |
| `30-judge-worker-rbac.yaml` | `judge-worker` SA + least-privilege Role/RoleBinding for the sandbox lifecycle. |
| `40-judge-worker-deployment.yaml` | The Arq worker that polls `zapsters:judge:queue`, dispatches the outbox, reconciles stuck submissions, and drives `GVisorKubernetesSandbox`. |

The per-submission NetworkPolicy, ConfigMap, and Pod are NOT here: they are generated
at runtime by `GVisorKubernetesSandbox` in `backend/judge/orchestrator/sandbox.py`
(default-deny both directions, digest-pinned image, non-root, read-only rootfs,
dropped capabilities, no service-account token, resource limits, wall-clock deadline).

## Infrastructure prerequisites (the cluster must provide all of these)

1. **Kubernetes 1.26+** with a CNI that **enforces NetworkPolicy** (Calico, Cilium,
   Weave). If the CNI ignores NetworkPolicy, the default-deny isolation is not real.
2. **gVisor installed on the worker nodes** that will host sandbox pods:
   - `runsc` installed on each node,
   - containerd configured with a runtime handler, e.g. in `/etc/containerd/config.toml`:
     ```toml
     [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
       runtime_type = "io.containerd.runc.v2"
       runtime_engine = "/usr/local/bin/runsc"
       runtime_root = "/run/containerd/runsc"
     ```
   - nodes labelled `zapsters.io/judge-runtime: "true"` so the RuntimeClass scheduling
     affinity lands sandbox pods on gVisor nodes (see `10-runtimeclass-gvisor.yaml`).
   - **Verify before trusting it:** `kubectl get nodes` lists the gVisor nodes and
     `kubectl get runtimeclass gvisor` exists; a hello-world pod with
     `runtimeClassName: gvisor` runs.
3. **metrics-server** for `kubectl top pod` (the memory cap). Without it the sandbox
   reports `memory_kb = 0`; grading still works but the memory bound is not enforced
   by measurement — the pod `resources.limits.memory` still caps it.
4. **Image registry** the nodes can pull from, holding `python:3.12-alpine` (or the
   digest pinned in `JUDGE_SANDBOX_IMAGE`) and the judge-worker backend image.
5. **A DNS/egress posture review**: sandbox pods are blocked from the network by their
   NetworkPolicy, so they cannot reach the registry or the API. The worker pod (which
   is NOT labeled as a submission) is not covered by that policy; consider a
   namespaced NetworkPolicy for the worker allowing only DNS + Redis + Postgres + the
   cluster API + the image registry.

## Secrets required before `kubectl apply`

- `judge-worker-secrets` (in `judge-sandboxes`): `DATABASE_URL`, `REDIS_URL`,
  `SECRET_KEY` (≥32 chars; production guard rejects the default).
- `judge-worker-kubeconfig` (in `judge-sandboxes`): a `kubeconfig` file whose
  token belongs to the `judge-worker` ServiceAccount and whose current context is
  `judge-sandboxes`. Example generation:
  ```
  kubectl create token judge-worker -n judge-sandboxes   # long-lived token for the SA
  # build a kubeconfig: server = cluster API endpoint, token = above, namespace = judge-sandboxes
  ```

## Deploy

```bash
kubectl apply -f backend/deploy/k8s/          # numeric order
kubectl rollout status deployment/judge-worker -n judge-sandboxes
kubectl -n judge-sandboxes get pods -o wide   # confirm worker is Ready
```

## Sanity checks after deploy

- `kubectl get runtimeclass gvisor` and `kubectl get nodes -l zapsters.io/judge-runtime=true`
- Submit a problem in the app and watch `kubectl -n judge-sandboxes get pods -w` — the
  pod reaches `Succeeded`, then disappears (cleanup in `finally`). If a pod lingers,
  the cleanup path is broken and must be treated as an incident, not a cosmetic issue.
- `kubectl -n judge-sandboxes get networkpolicy` shows per-submission policies with
  empty ingress/egress; nothing else lives in that namespace.

## Verdict context

This repository's local/CI environment is a Windows workstation with Docker only — no
cluster exists here, so `GVISOR_ACCEPTANCE_BLOCKED` applies and the runtime tier of the
acceptance gate (real malicious submissions through `GVisorKubernetesSandbox`) has not
executed. The manifest-level and mocked-lifecycle tests
(`backend/tests/security/test_judge_sandbox_k8s_manifests.py`) pin the security
controls at the YAML level; the runtime proof requires the cluster above.