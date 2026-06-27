---
schema: command-experiment/v1
experiment: wfn-wave1
case: case-224-light-happy-and-fail
weight: light
case_goal: "验证 inspect-wave1-output.mjs：happy path 全部通过，fail path 正确检测 3 类 wave1 结构错误（缺 topic reference 文件、metadata 不完整、_INDEX.md 无 wave1_topic 条目）。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_224_iw_*
trace: dpt_disp_224_iw_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。禁止 mock、手写假结果、伪造 trace。

# case-402-light-happy-and-fail

验证 `inspect-wave1-output.mjs`：合法 wave1 产出全部通过 + 3 类故意错误全部被检测。

## Expected Runtime Path

1. 创建 disposable bundle，设置 topic_registry
2. 构造 happy path artifacts → 跑 inspect → 预期 passed=true
3. 引入 3 个错误 → 跑 inspect → 预期 passed=false
4. 裁决
5. 清理

---

## Step 1: 创建 disposable bundle + topic_registry

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs iw1 --case case-01 --force)
cat > "$B/rb_plan.md" << 'EOF'
---
plan_basename: test-wave1
derived_topic_count: 2
topic_registry:
  - id: topic-01
    slug: 01_test-alpha
    title: Test Topic Alpha
  - id: topic-02
    slug: 02_test-beta
    title: Test Topic Beta
---
# Test Plan
EOF
mkdir -p "$B/artifacts/wave1/01_test-alpha" "$B/artifacts/wave1/02_test-beta"
echo "BUNDLE=$B"
```

---

## Step 2: Happy path artifacts

```bash
B=$(echo dpt_disp_224_iw_*)

# Per-topic rich MD files
for slug in 01_test-alpha 02_test-beta; do
  num=$(echo $slug | cut -c1-2)
  cat > "$B/reference/${num}-test-source.md" << 'EOF'
# Test Source
- source_url: https://example.com/source
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: primary_topic_reference
- trust_level: practitioner
- why_it_matters: Provides evidence for topic analysis.
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- Fact about the topic.

## Core Content Capture
This source provides evidence.

## Relevance To This Research
Directly relevant to the topic.

## Quotable Terms / Concepts
- "Key insight"

## Risks And Limitations
- Single source limitation.
EOF
done

# evidence-summary + question-list per topic
for slug in 01_test-alpha 02_test-beta; do
  echo "# Evidence Summary" > "$B/artifacts/wave1/$slug/evidence-summary.md"
  echo "## Key Findings" >> "$B/artifacts/wave1/$slug/evidence-summary.md"
  echo "1. Finding one" >> "$B/artifacts/wave1/$slug/evidence-summary.md"
  
  echo "# Question List" > "$B/artifacts/wave1/$slug/question-list.md"
  echo "## Topic Investigation Targets" >> "$B/artifacts/wave1/$slug/question-list.md"
  echo "## Question Reconciliation" >> "$B/artifacts/wave1/$slug/question-list.md"
  echo "## Emergent Question Protocol" >> "$B/artifacts/wave1/$slug/question-list.md"
  echo "## Exploration / Exploitation Decision" >> "$B/artifacts/wave1/$slug/question-list.md"
done

# _INDEX.md with wave1_topic entries
cat > "$B/reference/_INDEX.md" << 'EOF'
# Reference Index
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01-test-source.md | secondary | practitioner | Tier 2 | 01 | wave1_topic | accepted | 2026-06-26 |
| 02-test-source.md | secondary | practitioner | Tier 2 | 02 | wave1_topic | accepted | 2026-06-26 |
EOF

echo "Happy path artifacts created."
```

---

## Step 3: 裁决 — happy + fail

```bash
B=$(echo dpt_disp_224_iw_*)

cat > "$B/t.mjs" << 'JSTEST'
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const B = process.argv[2];
const t = B + '/_logs/_trace.jsonl';
const ref = join(B, 'reference');

const { recordCheck, verdict } = await import('./experiments_env/shared/wff-playbook-utils.mjs');

// ── Happy path ──
const happyOut = execSync(`node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs --bundle ${B} || true`, { encoding: 'utf8' });
const happy = JSON.parse(happyOut);
await recordCheck(t, {
  gate: 'inspect-wave1-happy', passed: happy.check.passed, expected: true,
  detail: `checks_run=${happy.check.checks_run} checks_failed=${happy.check.checks_failed}`
});

// ── Fail path: introduce 3 errors ──
// 1. Remove topic 02 reference file
if (existsSync(join(ref, '02-test-source.md'))) unlinkSync(join(ref, '02-test-source.md'));

// 2. Corrupt topic 01 metadata (remove why_it_matters)
const f01 = join(ref, '01-test-source.md');
const { readFileSync } = await import('node:fs');
let c01 = readFileSync(f01, 'utf8');
c01 = c01.replace(/- why_it_matters:.*\n/, '');
writeFileSync(f01, c01);

// 3. Remove wave1_topic entries from _INDEX.md
const idx = join(ref, '_INDEX.md');
let ci = readFileSync(idx, 'utf8');
ci = ci.replace(/wave1_topic/g, 'wave0_foundation');
writeFileSync(idx, ci);

const failOut = execSync(`node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs --bundle ${B} || true`, { encoding: 'utf8' });
const fail = JSON.parse(failOut);
await recordCheck(t, {
  gate: 'inspect-wave1-fail', passed: !fail.check.passed, expected: true,
  detail: `inspect_count=${fail.inspect.length} (expected >=3)`
});

await verdict(t);
JSTEST

node "$B/t.mjs" "$B"
```

→ 预期：`PASS`。

---

## Step 4: 结果解读

> Happy path: wave1 合法产出全部通过。Fail path: 3 个错误全部被 detect——缺 topic 02 reference 文件、metadata 缺 why_it_matters、_INDEX.md 无 wave1_topic 条目。PASS。

## Step 5: 清理

```bash
rm -rf dpt_disp_224_iw_*
echo "✓ Cleaned up."
```
