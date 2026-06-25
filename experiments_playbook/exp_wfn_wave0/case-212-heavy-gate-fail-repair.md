---
schema: command-experiment/v1
experiment: wfn-wave0
case: case-212-heavy-gate-fail-repair
weight: heavy
case_goal: "验证 wave0-complete gate 的 count_floor 能检测缺失 source.yaml，inspect 明确指出缺失 topic；repair 后 gate pass；trace 含 fail+pass 两条 gate_attempt"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-212_agql_w0_fail_
trace: dpt_disp_case-212_agql_w0_fail_*/_trace.jsonl
verdict: trace-jsonl
req: AGQ-008
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。S2（gate fail）使用 local fixture 数据；S3（repair）在同一个 bundle 上继续以验证连续 trace。所有产出来自实际 CLI 调用和 gate 输出。禁止 mock 返回、手写假 trace。

# case-212-heavy-gate-fail-repair

两个连续场景验证 gate fail 检测和 repair 闭环，共享同一个 bundle。

## Expected Runtime Path

1. Scenario A: 创建 bundle + 3 topics, 仅 2 个有 source.yaml → gate fail [MAIN/SHELL]
2. Scenario B: Repair (补写缺失 source.yaml) → rerun gate → pass [MAIN/SHELL]
3. Trace 验证: 2 条 gate_attempt (1 fail + 1 pass) + Cleanup

## Scenario A: Gate Fail — count_floor 检测缺失 topic

### Step A1: 创建 bundle + 物化 seed_topics（3 topics）

```bash
REPO_ROOT=$(pwd)
B2=$(node experiments_env/shared/new-disposable-bundle.mjs agql_w0_fail --case case-212 --force)
echo "Bundle: $B2"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B2

# 3 topics: topic-x, topic-y, topic-z
cat > $B2/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_w0_fail",
  "derived_topic_count": 3,
  "topic_registry": [
    { "id": "t-x", "slug": "topic-x", "title": "Topic X" },
    { "id": "t-y", "slug": "topic-y", "title": "Topic Y" },
    { "id": "t-z", "slug": "topic-z", "title": "Topic Z" }
  ]
}
---
# Research Plan: Wave0 Gate Fail + Repair
PLANEOF

cat > $B2/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
EOF

cat > $B2/rb_profile.yaml << 'PROFEOF'
root_must_answer_set: ["验证 gate fail 检测 + repair 闭环"]
research_profile: { depth: foundation, scope: "gate fail + repair test" }
PROFEOF

mkdir -p $B2/reference/topic-x $B2/reference/topic-y $B2/reference/topic-z
mkdir -p $B2/seed_topics
```

### Step A2: 物化 3 个 seed topic 文件

为 topic-x, topic-y, topic-z 各创建 `seed_topics/{slug}.md`（格式同 happy path，含 search_guardrails 和 `__BACKFILL_WAVE0_EVIDENCE__` 占位符）。topic-z 的 hypothesis 明确标注为 repair target。

```bash
# topic-x, topic-y, topic-z 各一个 seed topic 文件
# 格式: YAML frontmatter (id/slug/title/must_answer/hypothesis/search_guardrails/evidence_route) + 正文初始化区 + 轮次追加区
# 验证
echo "seed_topics:" && ls $B2/seed_topics/
# 预期: topic-x.md  topic-y.md  topic-z.md
```

### Step A3: 只写入 2/3 source.yaml（topic-z 故意缺失）

```bash
# topic-x source.yaml (fixture)
cat > $B2/reference/topic-x/source.yaml << 'EOF'
- url: "https://example.com/topic-x-ref-1"
  title: "Reference for Topic X"
  retrieved_date: "2026-06-23"
  topic_tag: "topic-x"
EOF

# topic-y source.yaml (fixture)
cat > $B2/reference/topic-y/source.yaml << 'EOF'
- url: "https://example.com/topic-y-ref-1"
  title: "Reference for Topic Y"
  retrieved_date: "2026-06-23"
  topic_tag: "topic-y"
EOF

# topic-z: intentionally left empty — no source.yaml

echo "=== reference/ tree ==="
find $B2/reference -type f | sort
# 预期: 只有 topic-x/source.yaml 和 topic-y/source.yaml
```

### Step A4: Gate — 预期 fail

```bash
cat > $B2/reference/index.md << 'EOF'
# Reference Index
- topic-x: 1 reference
- topic-y: 1 reference
EOF

echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave0_completion"}' >> $B2/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B2 --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)

echo "=== Gate passed? $PASSED (expected: false) ==="
test "$PASSED" = "false" && echo "SCENARIO A PASS: gate correctly failed" || echo "SCENARIO A FAIL"

# Inspect must identify topic-z
echo "=== Inspect ==="
echo "$GATE_OUTPUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8');const j=JSON.parse(d);j.inspect.forEach(i=>console.log('  -',i))"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B2/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'A: gate fail — 3 topics, only 2 source.yaml, inspect identifies missing topic-z',expected:false})})"
```

预期：
- `check.passed: false`
- inspect 含 3 条：`Missing file: reference/topic-z/source.yaml`、`Cannot read or parse YAML array from reference/topic-z/source.yaml`、`Count floor not met for reference/topic-z/source.yaml: 0 entries (threshold: 1)`
- routing.kind: `no_transition`

---

## Scenario B: Repair — 补写缺失 source.yaml 后 gate pass

### Step B1: 补写 topic-z source.yaml

```bash
# Continue from same bundle ($B2)
cat > $B2/reference/topic-z/source.yaml << 'EOF'
- url: "https://example.com/topic-z-ref-1"
  title: "Reference for Topic Z (repaired)"
  retrieved_date: "2026-06-23"
  topic_tag: "topic-z"
EOF

cat > $B2/reference/index.md << 'EOF'
# Reference Index
- topic-x: 1 reference
- topic-y: 1 reference
- topic-z: 1 reference (repaired)
EOF

echo "=== reference/ tree (after repair) ==="
find $B2/reference -type f | sort
# 预期: 3 个 source.yaml
```

### Step B2: Rerun gate — 预期 pass

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B2 --current-node phases/phase-wave0.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)

echo "=== Gate passed? $PASSED (expected: true) ==="
test "$PASSED" = "true" && echo "SCENARIO B PASS: repair closed the loop" || echo "SCENARIO B FAIL"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B2/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'B: repair — added missing topic-z source.yaml, rerun gate pass',expected:true})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave1.md`。

### Step B3: Trace 验证 — 2 条 gate_attempt

```bash
echo "=== Trace gate_attempt events ==="
grep 'gate_attempt' $B2/rb_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.stringify(JSON.parse(d),null,2))}catch{console.log(d.toString().trim())}})"
done

GATE_ATTEMPTS=$(grep -c 'gate_attempt' $B2/rb_trace.jsonl)
echo "Gate attempts: $GATE_ATTEMPTS (expected: 2)"
test "$GATE_ATTEMPTS" = "2" && echo "TRACE PASS: 2 gate_attempt events (1 fail + 1 pass)" || echo "TRACE FAIL"
```

预期：
- 第一条：`passed: false`, `inspect_count: 3`, `next: null`
- 第二条：`passed: true`, `inspect_count: 0`, `next: phases/phase-wave1.md`

---

## Final Verdict

```bash
# mode=last: 只看每个 gate 的最后一次 check（B 的 repair 替换 A 的 fail）
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B2/_trace.jsonl','last')})"
```

预期：PASS（2 checks: 1 expected-false + 1 expected-true，都匹配）。


## 结果解读

> 验证 wave0 gate fail→repair 闭环：
>   Scenario A: 3 topics 只 2 个 source.yaml → gate fail (count_floor/inspect 指出 topic-z)
>   Scenario B: 补写 topic-z/source.yaml → gate pass
>   trace 含 2 条 gate_attempt (1 fail + 1 pass) → PASS。

## Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B2')})"
```