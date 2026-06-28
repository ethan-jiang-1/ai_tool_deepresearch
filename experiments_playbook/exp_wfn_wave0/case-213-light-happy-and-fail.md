---
schema: command-experiment/v1
experiment: wfn-wave0
case: case-213-light-happy-and-fail
weight: light
case_goal: "验证 inspect-wave0-output.mjs：happy path 全部通过，fail path 正确检测 3 类结构错误（子目录、缺 metadata、缺 section）。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_213_iw_*
trace: dpt_disp_213_iw_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、CLI 调用和 stdout JSON 解析；禁止 mock、手写假结果、伪造 trace，或用 console output 代替裁决。

# case-401-light-happy-and-fail

验证 `inspect-wave0-output.mjs`：合法 wave0 产出全部通过 + 3 类故意错误全部被检测。

## Expected Runtime Path

1. 创建 disposable bundle
2. 构造 happy path artifacts → 跑 inspect → 预期 passed=true
3. 引入 3 个错误 → 跑 inspect → 预期 passed=false，inspect 含 3 条
4. 从 trace 裁决
5. 清理（PASS 才清理，FAIL 保留现场）

---

## Step 1: 创建 disposable bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs iw0 --case case-213 --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
echo "BUNDLE=$B"
```

---

## Step 2: Happy path — 构造合法 wave0 产出

创建完整合法的 reference/ 结构：一个 00-shared-*.md（完整 metadata + 5 section）、_INDEX.md、README.md、平铺目录、per-topic thin YAML。

```bash
B=$(echo dpt_disp_213_iw_*)

# Create artifacts/wave0/ directory
mkdir -p "$B/artifacts/wave0/01_test-topic"

# Create a valid 00-shared-*.md with complete metadata + 5 sections
cat > "$B/reference/00-shared-test-taxonomy.md" << 'EOF'
# Test AI Taxonomy

- source_url: https://arxiv.org/abs/2401.00001
- acceptance_status: accepted
- source_type: secondary (synthesis)
- tier: Tier 2
- evidence_role: foundation
- trust_level: practitioner
- why_it_matters: Provides shared terminology for cross-topic analysis.
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts

- Fact 1: AI agents are a distinct category from traditional automation.
- Fact 2: The market is projected to grow significantly.

## Core Content Capture

This source provides a foundational taxonomy for understanding AI agent capabilities.

## Relevance To This Research

The taxonomy enables consistent comparison across all research topics.

## Quotable Terms / Concepts

- "Agents sense and respond; scripts simply run"

## Risks And Limitations

- Taxonomy is consensus-based, not empirically validated.
EOF

# Create _INDEX.md with 8-column table
cat > "$B/reference/_INDEX.md" << 'EOF'
# Reference Index

Run: inspect-wave0-test
Last updated: 2026-06-26

| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00-shared-test-taxonomy.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-26 |
EOF

# Create README.md
cat > "$B/reference/README.md" << 'EOF'
# Reference Evidence

Flat reference directory. Naming: 00-shared-*.md / 0N-*.md / 00-cross-*.md.
See _INDEX.md for canonical inventory.
EOF

# Create thin YAML per topic
cat > "$B/artifacts/wave0/01_test-topic/source.yaml" << 'EOF'
- url: https://example.com/source
  title: Test Source
  retrieved_date: "2026-06-26"
  topic_tag: "01_test-topic"
  notes: Foundation reference
EOF

# Set up rb_plan.md with topic_registry so CLI can read it
cat > "$B/rb_plan.md" << 'EOF'
---
plan_basename: test-plan
derived_topic_count: 1
topic_registry:
  - id: topic-01
    slug: 01_test-topic
    title: Test Topic 01
---
# Test Plan
EOF

echo "Happy path artifacts created."
```

→ 预期：所有文件创建成功。

---

## Step 3: Happy path — 跑 inspect-wave0-output

```bash
B=$(echo dpt_disp_213_iw_*)
OUTPUT=$(node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle "$B" || true)
echo "$OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed
echo "$OUTPUT" | node experiments_env/shared/extract-field.mjs check.checks_failed
```

→ 预期：`check.passed = true`，`checks_failed = 0`。

---

## Step 4: Fail path — 引入 3 个结构错误

1. 创建子目录 `reference/bad_subdir/`
2. 创建一个 metadata 缺 `trust_level` 的文件
3. 创建一个缺 `## Risks And Limitations` 的文件

```bash
B=$(echo dpt_disp_213_iw_*)

# Error 1: subdirectory under reference/
mkdir -p "$B/reference/bad_subdir"

# Error 2: metadata missing trust_level
cat > "$B/reference/00-shared-no-metadata.md" << 'EOF'
# Missing Metadata

- source_url: https://example.com/incomplete
- acceptance_status: accepted
- tier: Tier 3
- evidence_role: deepening_reference
- why_it_matters: Test case for missing metadata.
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- Incomplete metadata test.

## Core Content Capture
This file has incomplete metadata.

## Relevance To This Research
Testing metadata validation.

## Quotable Terms / Concepts
- None

## Risks And Limitations
- Metadata incomplete.
EOF

# Error 3: missing ## Risks And Limitations section
cat > "$B/reference/00-shared-no-section.md" << 'EOF'
# Missing Section

- source_url: https://example.com/nosec
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 3
- evidence_role: deepening_reference
- trust_level: caution
- why_it_matters: Test case for missing section.
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- Missing section test.

## Core Content Capture
This file has a missing Risks And Limitations section.

## Relevance To This Research
Testing section validation.

## Quotable Terms / Concepts
- None
EOF

echo "Fail path artifacts created."
```

→ 预期：3 个错误被创建。

---

## Step 5: Fail path — 跑 inspect-wave0-output，验证错误检测

```bash
B=$(echo dpt_disp_213_iw_*)
OUTPUT=$(node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle "$B" || true)
echo "=== check.passed ==="
echo "$OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed
echo "=== inspect count ==="
INSPECT_COUNT=$(echo "$OUTPUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.inspect.length)")
echo "$INSPECT_COUNT"
echo "=== inspect output ==="
echo "$OUTPUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);j.inspect.forEach(x=>console.log('  -',x))"
```

→ 预期：`check.passed = false`，`inspect.length >= 3`（子目录 + 缺 metadata + 缺 section 各至少一条）。

---

## Step 6: 裁决 — 两个独立 sub-case

先重建 clean 状态跑 happy，再加错误跑 fail。直接用 stdout JSON 判 `check.passed`。

```bash
B=$(echo dpt_disp_213_iw_*)

cat > "$B/t.mjs" << 'JSTEST'
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const B = process.argv[2];
const t = B + '/rb_trace.jsonl';
const ref = join(B, 'reference');
const aw0 = join(B, 'artifacts', 'wave0', '01_test-topic');

// ── Happy path: clean valid artifacts ──
// Clean up errors from Steps 4-5
rmSync(join(ref, 'bad_subdir'), { recursive: true, force: true });
rmSync(join(ref, '00-shared-no-metadata.md'), { force: true });
rmSync(join(ref, '00-shared-no-section.md'), { force: true });

const happyOut = execSync(`node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle ${B} || true`, { encoding: 'utf8' });
const happy = JSON.parse(happyOut);

const { recordCheck, verdict } = await import('../experiments_env/shared/wff-playbook-utils.mjs');

await recordCheck(t, {
  gate: 'inspect-wave0-happy', passed: happy.check.passed, expected: true,
  detail: `checks_run=${happy.check.checks_run} checks_failed=${happy.check.checks_failed}`
});

// ── Fail path: introduce 3 errors ──
mkdirSync(join(ref, 'bad_subdir'), { recursive: true });

writeFileSync(join(ref, '00-shared-no-meta.md'), `# No Meta
- source_url: https://x.com
- acceptance_status: accepted
- tier: Tier 3
- evidence_role: foundation
- why_it_matters: test
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- test
## Core Content Capture
test
## Relevance To This Research
test
## Quotable Terms / Concepts
- test
## Risks And Limitations
- test
`);

writeFileSync(join(ref, '00-shared-no-sec.md'), `# No Section
- source_url: https://x.com
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 3
- evidence_role: foundation
- trust_level: caution
- why_it_matters: test
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- test
## Core Content Capture
test
## Relevance To This Research
test
## Quotable Terms / Concepts
- test
`);

const failOut = execSync(`node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle ${B} || true`, { encoding: 'utf8' });
const fail = JSON.parse(failOut);

await recordCheck(t, {
  gate: 'inspect-wave0-fail', passed: !fail.check.passed, expected: true,
  detail: `inspect_count=${fail.inspect.length} (expected >=3)`
});

await verdict(t);
JSTEST

node "$B/t.mjs" "$B"
```

→ 预期：`PASS`。

---

## Step 7: 结果解读

> Happy path: inspect-wave0 对合法 wave0 产出返回 passed=true。
> Fail path: 3 个故意错误全部被 detect——子目录错误、缺失 metadata key (trust_level)、缺失 section (Risks And Limitations)。
> 两个 sub-case 均通过 → 实验 PASS。

## Step 8: 清理

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_213_iw_*
echo "✓ Cleaned up."
```
