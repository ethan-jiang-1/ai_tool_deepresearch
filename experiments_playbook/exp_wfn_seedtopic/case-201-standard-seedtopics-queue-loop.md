---
schema: command-experiment/v1
experiment: wfn-seedtopic
case: case-201-standard-seedtopics-queue-loop
weight: light
case_goal: "验证 Agent 加载 phase-seed-topics.md 后能正确执行 queue-driven 三阶段（灌料→执行循环→gate pass），产出文件遵循 {slug}.md 命名（slug 含 NN_ 前缀），frontmatter slug 与文件名 stem 一致（gate 三重一致校验），必需字段齐全，缺失信息标注为 gap。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-201_agql_seed_
trace: dpt_disp_case-201_agql_seed_*/rb_trace.jsonl
verdict: trace-jsonl
req: AGQ-010
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。Agent 必须加载 `phase-seed-topics.md` 并按其 §3 三阶段指令执行：从灌料（enqueue task cards）到执行循环（claim→execute→complete）到收尾（gate）。所有产出必须来自实际的 `operate-queue` CLI 调用、文件写入和 gate 输出；禁止 mock 返回、跳过 queue 直接写文件、手写假 trace、或用 console output 代替 trace 裁决。


## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Runtime context** | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| **Framework path** | `operate-queue.mjs` CLI, gate CLI, `wff-playbook-utils.mjs` |
| **Fixture input** | task card JSON, registry, status 在 playbook 内写入 — Engine-layer fixture |
| **Agent actor** | 无（fixture-backed）|\n| **External calls** | 无 |
| **Verdict source** | `rb_trace.jsonl` `check` events |
| **不证明** | Agent queue 决策、semantic work — 仅证明 queue loop + gate 机械结构 |

# case-201-standard-seedtopics-queue-loop

验证 Agent 通过 Agentic Queue 物化 3 个 seed topic 文件，产出文件遵循 `{slug}.md` 命名（slug 含 NN_ 前缀），gate pass 且 trace 可审计。

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed topic_registry（3 topics）+ rb_profile.yaml
2. Agent 加载 `phase-seed-topics.md`，执行 §3.1 灌料：为每个 topic 生成 task card JSON → `operate-queue enqueue` ×3
3. Agent 执行 §3.2 执行循环：`operate-queue claim` → execute（Phase Agent 写入 seed topic 文件；`main-agent` 仅是 CLI actor wire value）→ `operate-queue complete` ×3
4. Agent 执行 §3.3 收尾：`check-gate-seed-topics-ready.mjs` → gate pass
5. 命名约定验证（见下方 Checklist）
6. 从 `rb_trace.jsonl` 裁决
7. Cleanup

---

## Case Goal

证明三件事：
1. Agent 能正确执行 queue-driven seed topic 物化闭环（灌料→执行→gate）
2. 产出文件遵循 `{slug}.md` 命名（slug 含 NN_ 前缀——gate 通过三重一致传递性强制前缀，因为 registry slug 含 NN_）
3. 每个 seed topic 文件是合格的 search-relevant decision document（含必需字段 + gap 标注机制）

---

## File Naming Convention Checklist

本 playbook 的核心验证目标之一。执行完成后逐项检查：

| # | 检查项 | 判定方式 |
|---|--------|----------|
| N1 | `seed_topics/` 下有 3 个文件，文件名 = `{slug}.md`（slug 含 NN_ 前缀，如 `01_claude-code-cli-tool`） | `ls -1 $B/seed_topics/` |
| N2 | 文件名与 registry slug 一一对应（registry 中每个 topic.slug 都有对应的 `{slug}.md`） | 对照 registry 检查 `ls` 输出 |
| N3 | 每个文件的 frontmatter `slug` 与文件名 stem 完全一致（byte-for-byte），gate 三重一致校验 | `grep 'slug:' $B/seed_topics/*.md` |
| N4 | frontmatter `id` 与 registry 中的 `id` 一致 | 逐文件对照 |
| N5 | frontmatter `title` 与 registry 中的 `title` 一致，非空 | 逐文件对照 |

---

## Step 1: 创建 disposable bundle + pre-seed

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs agql_seed --case case-61 --force)
echo "Bundle: $B"

# Validate initial structure
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B

# Write rb_plan.md with topic_registry (3 topics)
cat > $B/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_seed",
  "derived_topic_count": 3,
  "topic_registry": [
    {
      "id": "t-claude-code",
      "slug": "01_claude-code-cli-tool",
      "title": "Claude Code CLI 工具的能力边界"
    },
    {
      "id": "t-agentic-queue",
      "slug": "02_agentic-queue-architecture",
      "title": "Agentic Queue 架构模式"
    },
    {
      "id": "t-deep-research",
      "slug": "03_deep-research-methodology",
      "title": "Deep Research 方法论"
    }
  ]
}
---
# Research Plan: Agentic Queue Loop Experiment
PLANEOF

# Write rb_profile.yaml (minimal)
cat > $B/rb_profile.yaml << 'PROFEOF'
root_must_answer_set:
  - "Agentic Queue 如何与 workflow phase 集成？"
  - "seed topic 物化质量如何保证？"
research_profile:
  depth: foundation
  scope: "验证 queue-driven 物化闭环"
PROFEOF

# Set status to seed-topics (simulating setup gate already passed)
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "seed_topics_ready",
  "next_gate": "wave0_complete"
}
EOF

echo "=== Plan frontmatter ==="
head -30 $B/rb_plan.md
echo "=== Status ==="
cat $B/rb_status.json
```

预期：bundle 创建成功，topic_registry 含 3 个 topic（各有 id/slug/title），status 指向 `seed_topics_ready`。

---

## Step 2: Agent 加载 phase-seed-topics.md，执行 §3.1 灌料

Agent 读取 `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`，按 §3.1 指令执行：

1. 读取 `$B/rb_plan.md` frontmatter 的 `topic_registry`
2. 为每个 topic（按数组顺序，index=01/02/03）创建 task card JSON
3. 使用 `operate-queue enqueue` 逐个灌入

执行命令：
```bash
# Agent 为 3 个 topic 各创建 task card JSON（含所有必需字段），然后 enqueue：
cat > /tmp/wfq-seed-01-claude-code-cli-tool.json << 'JSON'
{"work_id":"seed-topic-01_claude-code-cli-tool","title":"Seed Topic: Claude Code CLI","producer_rule":"seed_topic_materialize","priority_class":"P3_current_gate_gap","completion_receipt":"file:seed_topics/01_claude-code-cli-tool.md","payload":{"topic_slug":"01_claude-code-cli-tool","topic_title":"Claude Code CLI 工具的能力边界","topic_id":"t-claude-code"},"targets":{"controller":"main-agent"},"action":"materialize_seed_topic","lineage":{"parent_gate":"seed_topics_ready"},"required_receipts":[],"done_condition":"file_created_and_valid","verification":{"method":"gate_check"},"writes_to":["seed_topics/01_claude-code-cli-tool.md"],"status_sync":["rb_status.json"],"failure_route":"seed_topic_repair"}
JSON

cat > /tmp/wfq-seed-02-agentic-queue-architecture.json << 'JSON'
{"work_id":"seed-topic-02_agentic-queue-architecture","title":"Seed Topic: Agentic Queue Architecture","producer_rule":"seed_topic_materialize","priority_class":"P3_current_gate_gap","completion_receipt":"file:seed_topics/02_agentic-queue-architecture.md","payload":{"topic_slug":"02_agentic-queue-architecture","topic_title":"Agentic Queue 架构模式","topic_id":"t-agentic-queue"},"targets":{"controller":"main-agent"},"action":"materialize_seed_topic","lineage":{"parent_gate":"seed_topics_ready"},"required_receipts":[],"done_condition":"file_created_and_valid","verification":{"method":"gate_check"},"writes_to":["seed_topics/02_agentic-queue-architecture.md"],"status_sync":["rb_status.json"],"failure_route":"seed_topic_repair"}
JSON

cat > /tmp/wfq-seed-03-deep-research-methodology.json << 'JSON'
{"work_id":"seed-topic-03_deep-research-methodology","title":"Seed Topic: Deep Research Methodology","producer_rule":"seed_topic_materialize","priority_class":"P3_current_gate_gap","completion_receipt":"file:seed_topics/03_deep-research-methodology.md","payload":{"topic_slug":"03_deep-research-methodology","topic_title":"Deep Research 方法论","topic_id":"t-deep-research"},"targets":{"controller":"main-agent"},"action":"materialize_seed_topic","lineage":{"parent_gate":"seed_topics_ready"},"required_receipts":[],"done_condition":"file_created_and_valid","verification":{"method":"gate_check"},"writes_to":["seed_topics/03_deep-research-methodology.md"],"status_sync":["rb_status.json"],"failure_route":"seed_topic_repair"}
JSON

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-seed-01-claude-code-cli-tool.json
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-seed-02-agentic-queue-architecture.json
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-seed-03-deep-research-methodology.json

# 验证 queue 状态
node DPT_FRAMEWORK/cli/operate-queue.mjs check $B
```

预期：`queue_health: "ready"`，active_window 中有 3 个 task card，各含 `producer_rule: seed_topic_materialize`、`targets.controller: "main-agent"`（当前 queue schema wire value）、`priority_class: P3_current_gate_gap`。

---

## Step 3: Agent 执行 §3.2 执行循环

Agent 循环 claim → execute → complete，共 3 轮：

```bash
# Round 1 — topic registry[0]: claude-code-cli-tool
CLAIM1=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM1"  # 确认 item 非 null, work_id = "seed-topic-01_claude-code-cli-tool"

# Agent execute: 创建 seed_topics/01_claude-code-cli-tool.md
# (Agent 按 phase body §3.1 的 Seed Topic 文件结构写入完整 frontmatter + 正文)

# Agent complete:
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-seed-result-seed-topic-01-claude-code-cli-tool.json

# Round 2 — topic registry[1]: agentic-queue-architecture
CLAIM2=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM2"
# Agent execute: 创建 seed_topics/02_agentic-queue-architecture.md
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-seed-result-seed-topic-02-agentic-queue-architecture.json

# Round 3 — topic registry[2]: deep-research-methodology
CLAIM3=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM3"
# Agent execute: 创建 seed_topics/03_deep-research-methodology.md
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-seed-result-seed-topic-03-deep-research-methodology.json

# 验证 queue 已空
CLAIM4=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM4"  # 预期 item: null
```

Agent 写入每个文件时，按 phase body §3.1 Seed Topic 文件结构：
- frontmatter: `id`/`slug`/`title` + `must_answer`/`hypothesis`/`in_scope`/`out_of_scope`/`search_guardrails`/`evidence_route`
- 正文: 研究骨架（关键维度/已知前提/open questions）+ 原始语境约束 block
- 上游未提供的信息标注为显式 gap

执行完后验证产出：
```bash
echo "=== seed_topics/ directory ==="
ls -1 $B/seed_topics/

echo "=== File slugs (frontmatter) ==="
grep 'slug:' $B/seed_topics/*.md
```

预期输出：
```
01_claude-code-cli-tool.md
02_agentic-queue-architecture.md
03_deep-research-methodology.md
slug: 01_claude-code-cli-tool
slug: 02_agentic-queue-architecture
slug: 03_deep-research-methodology
```

---

## Step 4: Naming Convention Verification

逐项验证 File Naming Convention Checklist：

```bash
echo "=== N1: 3 files with {slug}.md naming ==="
FILE_COUNT=$(ls -1 $B/seed_topics/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "File count: $FILE_COUNT"
test "$FILE_COUNT" = "3" && echo "N1 PASS" || echo "N1 FAIL"

echo "=== N2: Index matches registry position ==="
# registry[0] = claude-code-cli-tool → 01_
# registry[1] = agentic-queue-architecture → 02_
# registry[2] = deep-research-methodology → 03_
ls -1 $B/seed_topics/ | while read f; do
  PREFIX=$(echo "$f" | grep -o '^[0-9][0-9]')
  SLUG=$(echo "$f" | sed 's/^[0-9][0-9]_//;s/\.md$//')
  echo "  $f → prefix=$PREFIX slug=$SLUG"
done
# Agent 人工对照 Step 1 的 registry 数组顺序确认 prefix 正确

echo "=== N3: frontmatter slug matches filename stem (byte-for-byte) ==="
for f in $B/seed_topics/*.md; do
  STEM=$(basename "$f" .md)
  FM_SLUG=$(grep '"slug":' "$f" | head -1 | sed 's/.*"slug": *"//;s/".*//')
  echo "  $STEM → frontmatter slug=\"$FM_SLUG\""
  test "$STEM" = "$FM_SLUG" && echo "    N3 PASS" || echo "    N3 FAIL: stem='$STEM' slug='$FM_SLUG'"
done

echo "=== N4-N5: id/title match registry ==="
# Agent 逐文件对照 frontmatter id/title 与 registry
for f in $B/seed_topics/*.md; do
  echo "--- $(basename $f) ---"
  grep -E '"id"|"title"' "$f" | head -2
done
```

---

## Step 5: Agent 执行 §3.3 收尾 — gate

```bash
# Record seed_topics_completion trace event

# Run gate
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,detail:'queue-driven seed topics materialized — 3 files with {slug}.md naming, required fields, gate pass'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave0.md`。

---

## Step 6: 必需字段完整性抽查

```bash
echo "=== Required fields in 01_claude-code-cli-tool.md ==="
head -20 $B/seed_topics/01_claude-code-cli-tool.md

# Agent 验证以下字段均存在（值可为 pending/gap）：
echo "=== Checking must_answer ==="
grep 'must_answer' $B/seed_topics/01_claude-code-cli-tool.md

echo "=== Checking hypothesis ==="
grep 'hypothesis' $B/seed_topics/01_claude-code-cli-tool.md

echo "=== Checking search_guardrails ==="
grep 'search_guardrails' $B/seed_topics/01_claude-code-cli-tool.md

echo "=== Checking evidence_route ==="
grep 'evidence_route' $B/seed_topics/01_claude-code-cli-tool.md

echo "=== Checking 原始语境约束 block ==="
grep '原始语境约束' $B/seed_topics/01_claude-code-cli-tool.md
```

---

## Step 7: 从 trace 裁决

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```

预期 verdict：**PASS**。trace 含 `queue_enqueued` ×3、`queue_claimed` ×3、`queue_completed` ×3、`gate_attempt(passed: true)`。

---


## Step 8: 结果解读

> ≥4 个 check，验证 seed topic queue-driven 物化：
>   3 轮 claim→execute→complete 全部通过。
>   seed_topics/ 下 3 个文件，命名 {slug}.md，frontmatter slug 匹配文件名（gate 三重一致）。
>   gate seed-topics-ready pass。

## Step 9: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```