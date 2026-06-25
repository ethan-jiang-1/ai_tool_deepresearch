---
schema: command-experiment/v1
experiment: wff-pre-research-repair
case: case-112-standard-fault-tolerance
weight: light
case_goal: "Prove that gate CLIs do not crash on malformed state, return clear inspect/advice, and — critically — the MD/Agent can read that feedback and repair the bundle back to a passing state."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-112_wff_fault_*
trace: dpt_disp_case-112_wff_fault_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-112-standard-fault-tolerance

## Expected Runtime Path

三个独立 case：

1. **Case 1**: 非法 JSON — gate 不崩溃，返回清晰 inspect
2. **Case 2**: 多 rule fail → Agent 读 inspect/advice → 修复 → rerun → pass（**完整 PDCA**）
3. **Case 3**: bundle 目录不存在 — gate 不崩溃，返回清晰 inspect

---

## Case Goal

证明 gate CLI 不仅是容错的（不崩溃），而且 inspect/advice 足够清晰，能让 Agent 精准修复。Case 2 是核心：trace 里有 fail→repair→pass 的证据链。

---

## Case 1: 非法 JSON — gate 不崩溃

**模拟场景：** Agent 错误编辑了 `rb_status.json`，写成了非法 JSON。

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_fault --case case-112 --force)
echo "Bundle: $B"
```

破坏 `rb_status.json`：

```bash
echo "this is not valid json {{{" > $B/rb_status.json
echo "=== Corrupted ===" && cat $B/rb_status.json
```

运行 setup-ready gate：

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle $B --current-node phases/phase-setup.md || true)
EXIT=$?
echo "Exit: $EXIT"
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('is JSON: true');console.log('passed:',j.check.passed);console.log('inspect count:',j.inspect.length);console.log('inspect[0]:',j.inspect[0])})"
```

**Agent 读这个 output：**
- `exit code` — 1（不 crash）
- stdout — 合法 JSON ✓
- `passed` — `false`
- `inspect` — 指向 parse 失败

```bash
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/_trace.jsonl', { gate: 'setup-ready', passed: $PASSED, expected: false, detail: 'case1: gate survived bad JSON, returned clear inspect' });
});
"
```

---

## Case 2: 多 rule fail → repair → pass（PDCA 回路）

**模拟场景：** Agent 漏建了 `rb_plan.md` 和 `final/`。gate 检测到 → Agent 读 inspect/advice → 修复 → rerun → pass。

```bash
REPO_ROOT=$(pwd)
rm -rf $B
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_fault2 --case case-112 --force)
echo "Bundle: $B"
```

破坏两个东西，运行 gate：

```bash
rm $B/rb_plan.md
rm -rf $B/final
echo "=== Removed: rb_plan.md + final/ ==="

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle $B --current-node phases/phase-setup.md || true)
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('inspect count:',j.inspect.length);console.log('advice count:',j.advice.length);j.inspect.forEach((x,i)=>console.log('  inspect['+i+']:',x));j.advice.forEach((x,i)=>console.log('  advice['+i+']:',x))})"
```

**Agent 读到了什么：** gate 返回 fail + `inspect` 含两条诊断（一条指向缺失 `rb_plan.md`，一条指向缺失 `final/`）+ `advice` 含两条修复建议。

```bash
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/_trace.jsonl', { gate: 'setup-ready', passed: $PASSED, expected: false, detail: 'case2 attempt 1: multi-rule fail (missing rb_plan.md + final/)' });
});
"
```

**Agent 现在修复：** 基于 inspect/advice，逐条修：
1. 补建 `rb_plan.md`（含正确 frontmatter）
2. 补建 `final/` 目录
3. 写入 HITL1 profile（让 hitl1.status = recorded）
4. basename 一致性由 `rb_plan.md` frontmatter 的 `plan_basename` 保证

```bash
echo "=== Repair: recreate rb_plan.md + final/ + fix profile ==="

cat > $B/rb_plan.md << 'PLANEOF'
---
{"plan_basename":"wff_fault2","derived_topic_count":0,"topic_registry":[]}
---
# Deep Research Plan: wff_fault2
PLANEOF

mkdir -p $B/final

cat > $B/rb_profile.yaml << 'PROFEOF'
plan_basename: wff_fault2
research_profile: quick_factual
root_must_answer_set:
  - "Test question"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T12:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
PROFEOF

echo "=== Repaired ==="
ls $B/rb_plan.md && ls -d $B/final
grep -E 'research_profile|status:|plan_basename' $B/rb_profile.yaml | head -4

# Update status for setup-ready gate (expects next_gate=seed_topics_ready)
cat > $B/rb_status.json << 'STATUSEOF'
{"current_mode":"execution","state":"in_progress","current_gate":"setup_ready","next_gate":"seed_topics_ready"}
STATUSEOF
```

**Rerun same gate：**

```bash
GATE_OUTPUT2=$(node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle $B --current-node phases/phase-setup.md || true)
echo "$GATE_OUTPUT2" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
```

**Agent 修好了。** gate pass。

```bash
PASSED2=$(echo "$GATE_OUTPUT2" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/_trace.jsonl', { gate: 'setup-ready', passed: $PASSED2, detail: 'case2 attempt 2: repaired (recreated rb_plan.md + final/)' });
});
"
```

---

## Case 3: bundle 目录不存在 — gate 不崩溃

**模拟场景：** Agent 传了一个不存在的 `--bundle` 路径。

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle /tmp/nonexistent_bundle_xyz --current-node phases/phase-instantiation.md || true)
EXIT=$?
echo "Exit: $EXIT"
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('is JSON: true');console.log('passed:',j.check.passed)})"
```

**Agent 读这个 output：**
- `exit code` — 1（不崩溃）
- stdout — 合法 JSON ✓
- `passed` — `false`
- `inspect` — 指向 bundle dir 不存在

---

## 裁决

```bash
echo "=== Trace evidence ==="
cat $B/_trace.jsonl | while read line; do echo "$line" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);const icon=j.passed?'\x1b[32m✓\x1b[0m':'\x1b[31m✗\x1b[0m';console.log(icon,j.gate,'|',j.detail)})"; done

echo ""
echo "=== Verdict ==="
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.verdict('$B/_trace.jsonl', 'last');
});
"
```

> Case 3 不写入 trace（bundle 不存在），只验证 gate 不崩溃。


## 结果解读

> 验证 gate CLI 容错：
>   bad JSON → gate 不崩溃，返回 clear inspect/advice
>   multi-rule fail → gate 列出所有问题
>   missing bundle → gate 不崩溃
>   全部 expected:false（gate 该拒时拒了）。

## Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.cleanup('$B');
});
"
rm -rf dpt_disp_case-112_wff_fault_* 2>/dev/null
```