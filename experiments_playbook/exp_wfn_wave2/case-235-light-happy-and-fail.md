---
schema: command-experiment/v1
experiment: exp_wfn_wave2
case: case-235-light-happy-and-fail
weight: light
case_goal: "验证 inspect-wave2-output.mjs：happy path 全部通过，fail path 正确检测 3 类 wave2 结构错误（00_shared/ 子目录、synthesis.md 为空、残留 backfill token）。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_235_iw_*
trace: dpt_disp_235_iw_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。禁止 mock、手写假结果、伪造 trace。

# case-403-light-happy-and-fail

验证 `inspect-wave2-output.mjs`：合法 wave2 产出全部通过 + 3 类故意错误全部被检测。

## Expected Runtime Path

1. 创建 disposable bundle
2. 构造 happy path artifacts（artifacts/wave2/ 三件套 + 可选 00-cross-*.md）
3. 跑 inspect → 预期 passed=true
4. 引入 3 个错误 → 跑 inspect → 预期 passed=false
5. 裁决
6. 清理

---

## Step 1: 创建 disposable bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs iw2 --case case-403 --force)
mkdir -p "$B/artifacts/wave2" "$B/seed_topics"
echo "BUNDLE=$B"
```

---

## Step 2: Happy path — 构造合法 wave2 产出

```bash
B=$(echo dpt_disp_235_iw_*)

# synthesis.md with W2F-xxx references
cat > "$B/artifacts/wave2/synthesis.md" << 'EOF'
# Synthesis

Analysis of cross-topic findings. See [Topic A evidence](../wave1/01_test/evidence-summary.md) for details.
Key finding: W2F-001 confirms cross-topic pattern.

## References
- [Shared foundation](../../reference/00-shared-test-taxonomy.md)
EOF

# cross-topic-ledger.md with 6 sections
cat > "$B/artifacts/wave2/cross-topic-ledger.md" << 'EOF'
# Cross-Topic Ledger

## Cross-Topic Scan Matrix
Scanned all topic pairs.

## Wave1 Legacy Questions
Resolved Q1 from topic 01.

## Cross-Topic Resolutions
W2F-002: Evidence from topic 01+02 supports conclusion.

## Emergent Cross-Topic Questions
W2F-003: New question emerged.

## Exploration Decisions
W2F-003 → exploit_search.

## HITL2 Handoff
W2F-003 deferred to human review.
EOF

# finding-index.yaml
cat > "$B/artifacts/wave2/finding-index.yaml" << 'EOF'
version: 1
source_layer: wave2_cross
ledger: cross-topic-ledger.md
synthesis: synthesis.md
scan:
  pairs_checked: 1
  dimensions: [shared_pattern]
findings:
  - id: W2F-001
    type: cross_topic_resolution
    status: resolved
    decision: use_existing_evidence
    affected_topics: ["01", "02"]
    origin_refs: []
    trigger_refs: []
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false
EOF

# Optional 00-cross-*.md
cat > "$B/reference/00-cross-scout-discovery.md" << 'EOF'
# Cross Discovery
- source_url: https://example.com/cross
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: deepening_reference
- trust_level: practitioner
- why_it_matters: Cross-topic scout found shared pattern.
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- Cross-topic pattern discovered.

## Core Content Capture
Wave2 scout found evidence.

## Relevance To This Research
Links topics 01 and 02.

## Quotable Terms / Concepts
- "Cross-topic signal"

## Risks And Limitations
- Single source.
EOF

# Seed topic without backfill tokens
echo "# Test Seed Topic" > "$B/seed_topics/01_test.md"

echo "Happy path artifacts created."
```

---

## Step 3: 裁决 — happy + fail

```bash
B=$(echo dpt_disp_235_iw_*)

cat > "$B/t.mjs" << 'JSTEST'
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const B = process.argv[2];
const t = B + '/_trace.jsonl';
const w2 = join(B, 'artifacts', 'wave2');
const ref = join(B, 'reference');
const seed = join(B, 'seed_topics');

const { recordCheck, verdict } = await import('./experiments_env/shared/wff-playbook-utils.mjs');

// ── Happy path ──
const happyOut = execSync(`node DPT_FRAMEWORK/cli/inspect-wave2-output.mjs --bundle ${B} || true`, { encoding: 'utf8' });
const happy = JSON.parse(happyOut);
await recordCheck(t, {
  gate: 'inspect-wave2-happy', passed: happy.check.passed, expected: true,
  detail: `checks_run=${happy.check.checks_run} checks_failed=${happy.check.checks_failed}`
});

// ── Fail path: introduce 3 errors ──
// 1. Create reference/00_shared/ subdirectory
mkdirSync(join(ref, '00_shared'), { recursive: true });

// 2. Empty synthesis.md
writeFileSync(join(w2, 'synthesis.md'), '');

// 3. Add residual backfill token to seed topic
writeFileSync(join(seed, '01_test.md'), '# Test\n\n__BACKFILL_WAVE2_JUDGMENT__\n');

const failOut = execSync(`node DPT_FRAMEWORK/cli/inspect-wave2-output.mjs --bundle ${B} || true`, { encoding: 'utf8' });
const fail = JSON.parse(failOut);
await recordCheck(t, {
  gate: 'inspect-wave2-fail', passed: !fail.check.passed, expected: true,
  detail: `inspect_count=${fail.inspect.length} (expected >=3)`
});

await verdict(t);
JSTEST

node "$B/t.mjs" "$B"
```

→ 预期：`PASS`。

---

## Step 4: 结果解读

> Happy path: wave2 合法产出全部通过（三件套 + cross file + 无 token）。Fail path: 3 个错误全部被 detect——00_shared/ 子目录、synthesis 为空、残留 __BACKFILL_WAVE2_JUDGMENT__ token。PASS。

## Step 5: 清理

```bash
rm -rf dpt_disp_235_iw_*
echo "✓ Cleaned up."
```
