---
schema: command-experiment/v2
experiment: wff-wave-gates
case: case-124-standard-seed-topics-boundary
case_goal: "Prove that seed-topics-ready gate correctly detects empty directory, missing slugs, and extra slugs; bidirectional slug consistency check is trace-backed."
verdict_mode: last
required_checks: [empty-directory-rejected, missing-slug-rejected, extra-slug-rejected, slug-consistency-two-way, seed-topics-ready-happy]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: standard
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-124-standard-seed-topics-boundary

## Expected Runtime Path

1. 创建 disposable bundle + 写入 topic_registry
2. 物化全部 seed_topics → gate pass
3. 清空 seed_topics → gate fail（dir_non_empty）
4. 物化部分 topic（slug 缺失）→ gate fail（slug_consistency 报缺失）
5. 写入多余文件 → gate fail（slug_consistency 报多余）
6. 从 `rb_trace.jsonl` 产出 native completion（4 个场景 check + 1 个双向一致性聚合 check）
7. 写出 native completion 后停止

---

## Case Goal

证明：seed-topics-ready gate 的 `dir_non_empty` 能检测空目录，`cross_field(slug_consistency)` 能双向检测 slug 缺失和多余。裁决从 trace，不靠 console 或感觉。

---

## Step 1: 创建 disposable bundle + 写入 topic_registry

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs stm_boundary --case case-124 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
echo "Bundle: $B"

# Validate initial structure
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs $B

# Write topic_registry into rb_plan.md frontmatter (3 topics, YAML format)
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: stm_boundary
derived_topic_count: 3
topic_registry:
  - id: "01"
    slug: 01_topic-a
    title: Topic A
  - id: "02"
    slug: 02_topic-b
    title: Topic B
  - id: "03"
    slug: 03_topic-c
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
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
mkdir -p $B/seed_topics

cat > $B/seed_topics/01_topic-a.md << 'EOF'
---
id: "01"
slug: 01_topic-a
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

cat > $B/seed_topics/02_topic-b.md << 'EOF'
---
id: "02"
slug: 02_topic-b
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

cat > $B/seed_topics/03_topic-c.md << 'EOF'
---
id: "03"
slug: 03_topic-c
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

echo "=== seed_topics/ ==="
ls -la $B/seed_topics/

# Run gate
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate seed-topics-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'seed-topics-ready-happy',passed:$PASSED,expected:true,detail:'all 3 topics materialized, slugs consistent'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave0.md`。

## Step 3: 清空 seed_topics → gate fail（dir_non_empty）

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
rm $B/seed_topics/*.md

echo "=== seed_topics/ after removing all files ==="
ls -la $B/seed_topics/

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate seed-topics-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'empty-directory-rejected',passed:$PASSED,detail:'empty dir should fail dir_non_empty',expected:false})})"
```

预期：`check.passed: false`，`inspect` 指向空目录。

## Step 4: 物化部分 topic（slug 缺失）→ gate fail

只恢复 topic-a 和 topic-c，缺 topic-b。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
cat > $B/seed_topics/01_topic-a.md << 'EOF'
---
id: "01"
slug: 01_topic-a
title: Topic A
---

# Topic A
EOF

cat > $B/seed_topics/03_topic-c.md << 'EOF'
---
id: "03"
slug: 03_topic-c
title: Topic C
---

# Topic C
EOF

echo "=== seed_topics/ (topic-b missing) ==="
ls -la $B/seed_topics/

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate seed-topics-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'missing-slug-rejected',passed:$PASSED,detail:'slug missing: topic-b should be detected',expected:false})})"
```

预期：`check.passed: false`，`inspect` 报告缺少 `topic-b`。

## Step 5: 多余文件 → gate fail

恢复 topic-b，再额外写入一个不在 registry 中的 `extra-topic.md`。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
cat > $B/seed_topics/02_topic-b.md << 'EOF'
---
id: "02"
slug: 02_topic-b
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

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate seed-topics-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'extra-slug-rejected',passed:$PASSED,detail:'extra slug: extra-topic should be detected',expected:false})})"
```

预期：`check.passed: false`，`inspect` 报告多余 `extra-topic`。

## Step 6: 从 trace 裁决

预期四个场景 check 加一条稳定的双向一致性聚合 check。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle] = process.argv.slice(2);
const checks = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter((event) => event.event === 'check' && event.source === 'playbook');
const rejected = (gate) => checks.some((event) => event.gate === gate && event.passed === false && event.expected === false);
const passed = rejected('missing-slug-rejected') && rejected('extra-slug-rejected');
appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts:new Date().toISOString(), event:'check', source:'playbook', gate:'slug-consistency-two-way', passed, expected:true })}\n`);
if (!passed) process.exit(1);
JS
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```


## Step 7: 结果解读

> 5 个 check（1 pass + 3 个预期拒绝 + 1 个双向一致性聚合），验证 seed-topics-ready gate 边界：
>   [PASS] seed_topics 物化完整 → gate pass
>   [FAIL ✅] 空目录 → gate fail
>   [FAIL ✅] slug 缺失 → gate fail
>   [FAIL ✅] 多余文件 → gate fail
>   [PASS] missing + extra 两个方向均被拒绝 → 双向 slug consistency 成立
>   3 个 FAIL 都是正确的边界拒绝。


Stop after native completion. The Autorun Supervisor owns Standard health, audit, preservation, and optional clean-PASS cleanup.
