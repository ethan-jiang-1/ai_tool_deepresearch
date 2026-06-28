---
schema: command-experiment/v1
experiment: wff-pre-research
case: case-102-standard-instantiation-production
weight: light
case_goal: "Prove that the production bundle creation path (DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs) produces a bundle that passes instantiation-complete gate — and that production and disposable paths produce structurally equivalent bundles."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_rb_wff_prod_*
trace: dpt_rb_wff_prod_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

本 playbook 使用 **production bundle 创建路径**（`DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`），而非 disposable 路径（`experiments_env/shared/new-disposable-bundle.mjs`）。其他 9 个 light playbook 都走 disposable 路径——本 playbook 验证 production 路径同样有效。

Production bundle 命名使用 `dpt_rb_` 前缀，无 random hex suffix。

---

# case-102-standard-instantiation-production

## Expected Runtime Path

1. 通过 `instantiate-run-bundle.mjs` 创建 production bundle
2. Validate + inspect
3. 运行 `instantiation-complete` gate
4. Trace verdict + cleanup

---

## Case Goal

`phase-instantiation.md` 要求 Agent 调用：
```
node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>
```

其他所有 playbook 都用 `experiments_env/shared/new-disposable-bundle.mjs`（disposable 路径）。本 playbook 验证 production 路径创建的 bundle 也能通过 `instantiation-complete` gate。

---

## Step 1: 通过 production CLI 创建 bundle

```bash
REPO_ROOT=$(pwd)
NAME="wff-prod-$(date +%s)"
B=$(node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs $NAME)
echo "Bundle: $B"
```

Production 路径特点：
- 使用 `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`（Agent 在 `phase-instantiation.md` 里被指示调用的 CLI）
- Bundle 目录名为 `dpt_rb_<name>`，无 hex suffix
- Name collision → fail-stop（不会自动追加 `-2`）

## Step 2: Validate + inspect

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

## Step 3: 运行 instantiation-complete gate

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)

GATE=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate instantiation-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle $B --current-node phases/phase-instantiation.md)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'instantiation-complete',passed:$PASSED,detail:'production path: instantiate-run-bundle.mjs'})})"
```

## Step 4: 结果解读

> 验证 production 路径：
>   instantiate-run-bundle.mjs 产出合法 bundle → gate pass。正常路径。
> 
> **PASS 才执行 Cleanup。FAIL 时跳过清理，保留 bundle 现场供排查。**

## Step 5: Verdict + Cleanup

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
