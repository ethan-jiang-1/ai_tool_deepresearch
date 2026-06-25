---
schema: command-experiment/v1
experiment: wff-wave-gates
case: case-124-standard-seed-topics-boundary
weight: light
case_goal: "Prove that seed-topics-ready gate correctly detects empty directory, missing slugs, and extra slugs; bidirectional slug consistency check is trace-backed."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-124_stm_boundary_*
trace: dpt_disp_case-124_stm_boundary_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-124-standard-seed-topics-boundary

## Expected Runtime Path

1. 创建 disposable bundle + 写入 topic_registry
2. 物化全部 seed_topics → gate pass
3. 清空 seed_topics → gate fail（dir_non_empty）
4. 物化部分 topic（slug 缺失）→ gate fail（slug_consistency 报缺失）
5. 写入多余文件 → gate fail（slug_consistency 报多余）
6. 从 `_trace.jsonl` 裁决（预期 4 条 check：1 pass + 3 fail）
7. Cleanup

---

## Case Goal

证明：seed-topics-ready gate 的 `dir_non_empty` 能检测空目录，`cross_field(slug_consistency)` 能双向检测 slug 缺失和多余。裁决从 trace，不靠 console 或感觉。

---

## Step 1: 创建 disposable bundle + 写入 topic_registry

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs stm_boundary --case case-124 --force)
echo "Bundle: $B"

# Validate initial structure
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write topic_registry into rb_plan.md frontmatter (3 topics, YAML format)
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: stm_boundary
derived_topic_count: 3
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
  - id: t2
    slug: topic-b
    title: Topic B
  - id: t3
    slug: topic-c
    title: Topic C
---
# stm_boundary Plan
EOF

# Set status to seed-topics
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "seed_topics_ready",
  "next_gate": "wave0_complete"
}
EOF

echo "=== Plan ==="
head -12 $B/rb_plan.md
echo "=== Status ==="
cat $B/rb_status.json
```

预期：bundle 创建成功，topic_registry 含 3 个 topic，status 指向 `seed_topics_ready`→`wave0_complete`。

## Step 2: 物化全部 seed_topics → gate pass

为 registry 中的 3 个 topic 创建对应的 `seed_topics/<slug>.md` 文件，记录 trace event。

```bash
mkdir -p $B/seed_topics

cat > $B/seed_topics/topic-a.md << 'EOF'
---
id: t1
slug: topic-a
title: Topic A
---

# Topic A

## 关键维度
- 技术层面
- 政策层面

## 已知前提
- Topic A 是本研究的基础维度

## Open Questions
- 如何衡量进展？
EOF

cat > $B/seed_topics/topic-b.md << 'EOF'
---
id: t2
slug: topic-b
title: Topic B
---

# Topic B

## 关键维度
- 经济影响

## 已知前提
- Topic B 与 Topic A 密切相关

## Open Questions
- 成本效益如何？
EOF

cat > $B/seed_topics/topic-c.md << 'EOF'
---
id: t3
slug: topic-c
title: Topic C
---

# Topic C

## 关键维度
- 社会影响

## 已知前提
- Topic C 覆盖更广的社会层面

## Open Questions
- 公众接受度如何？
EOF

# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"seed_topics_completion"}' >> $B/rb_trace.jsonl

echo "=== seed_topics/ ==="
ls -la $B/seed_topics/

# Run gate
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,detail:'all 3 topics materialized, slugs consistent'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave0.md`。

## Step 3: 清空 seed_topics → gate fail（dir_non_empty）

```bash
rm $B/seed_topics/*.md

echo "=== seed_topics/ after removing all files ==="
ls -la $B/seed_topics/

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,detail:'empty dir should fail dir_non_empty',expected:false})})"
```

预期：`check.passed: false`，`inspect` 指向空目录。

## Step 4: 物化部分 topic（slug 缺失）→ gate fail

只恢复 topic-a 和 topic-c，缺 topic-b。

```bash
cat > $B/seed_topics/topic-a.md << 'EOF'
---
id: t1
slug: topic-a
title: Topic A
---

# Topic A
EOF

cat > $B/seed_topics/topic-c.md << 'EOF'
---
id: t3
slug: topic-c
title: Topic C
---

# Topic C
EOF

echo "=== seed_topics/ (topic-b missing) ==="
ls -la $B/seed_topics/

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,detail:'slug missing: topic-b should be detected',expected:false})})"
```

预期：`check.passed: false`，`inspect` 报告缺少 `topic-b`。

## Step 5: 多余文件 → gate fail

恢复 topic-b，再额外写入一个不在 registry 中的 `extra-topic.md`。

```bash
cat > $B/seed_topics/topic-b.md << 'EOF'
---
id: t2
slug: topic-b
title: Topic B
---

# Topic B
EOF

cat > $B/seed_topics/extra-topic.md << 'EOF'
---
id: tx
slug: extra-topic
title: Extra Topic
---

# Extra Topic (not in registry)
EOF

echo "=== seed_topics/ (including extra file) ==="
ls -la $B/seed_topics/

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,detail:'extra slug: extra-topic should be detected',expected:false})})"
```

预期：`check.passed: false`，`inspect` 报告多余 `extra-topic`。

## Step 6: 从 trace 裁决

预期 4 条 `check` event：1 pass（Step 2）+ 3 fail（Step 3, 4, 5）。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```


## Step 7: 结果解读

> 4 个 check（1 pass + 3 fail），验证 seed-topics-ready gate 边界：
>   [PASS] seed_topics 物化完整 → gate pass
>   [FAIL ✅] 空目录 → gate fail
>   [FAIL ✅] slug 缺失 → gate fail
>   [FAIL ✅] 多余文件 → gate fail
>   3 个 FAIL 都是正确的边界拒绝。

## Step 8: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
