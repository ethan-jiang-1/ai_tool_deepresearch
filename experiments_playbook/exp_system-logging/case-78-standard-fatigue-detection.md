---
schema: command-experiment/v2
experiment: system-logging
case: case-78-standard-fatigue-detection
case_goal: "验证 gate CLI 在 fail + --attempt >= threshold 时 emit fatigue_warning + step_back + [fatigue] advice；fail + low attempt 时不 emit；pass 时 suppress；advice 使用 Agent-reported 术语、不声称 Engine verified；--attempt 解析边界不崩溃。"
verdict_mode: all
required_checks: [attempt-parse, bundle-init, fatigue-fail-high, fatigue-fail-low, fatigue-pass-high, fatigue-wording]
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

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。所有 gate CLI 调用走生产路径 `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`，stdout JSON 被捕获、解析、转为 trace `check` event 后由 trace 裁决。禁止 mock 返回、手写假 result、用 console.log 代替 trace 裁决。

**本 case 不测试 Agent 行为。** `--attempt` 值由 playbook 直接传入 CLI，不经过 Agent loop。fatigue signal 被 Agent 消费并改变行为这一闭环不在本 case 范围内——那需要 heavy case + 真实 Agent loop。

### Reality Distance Ledger

| Distance Type | Declaration |
|---------------|-------------|
| Runtime context | disposable scaffold bundle (`new-disposable-bundle.mjs`)，gate 对其 fail（缺失 wave0 产出） |
| Framework path | `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`，生产 gate CLI |
| Fixture input — fail case | 无 fixture；scaffold bundle 天然缺 wave0 产出，gate fail 是真实的 |
| Fixture input — pass case | 手填 topic_registry、reference file（含 4 quality threshold 字段）、source.yaml、rb_status.json、rb_output_declarations.jsonl、cache trail 文件。这些 fixture 只证明 gate 的 pass-suppress 分支，不证明 Agent 能产出这些文件 |
| Agent actor | **无**。`--attempt` 值由 shell 传入，非 Agent 上报。case_goal 中 "Agent-reported" 指 advice 文案措辞，非 Agent 实际参与 |
| External calls | 无 WebSearch/WebFetch。cache trail 文件为手建最小骨架 |
| Verdict source | strict playbook-owned `check` events in bundle-root `rb_trace.jsonl` |

**Headline claim**: gate CLI fatigue signal emission logic（`buildGateResult` + `parseGateCliArgs`）通过生产 CLI 路径验证。

**Not claimed**: Agent retry loop、Agent 对 fatigue 的行为响应、Agent attempt 上报准确性。

---

# case-78-standard-fatigue-detection

验证 gate CLI 的 fatigue detection 信号发射：`buildGateResult` 在 `!passed && attemptNumber >= fatigueThreshold` 时注入 `fatigue_warning` + `step_back` + 3 条 `[fatigue]` advice；pass 抑制；低 attempt 不触发。

---

## Expected Runtime Path

1. 创建 disposable scaffold bundle `[MAIN/SHELL]`
2. Fail + high attempt → fatigue `[MAIN/SHELL]`
3. Fail + low attempt → no fatigue `[MAIN/SHELL]`
4. Pass + high attempt → no fatigue `[MAIN/SHELL]`
5. `--attempt` 解析边界（abc / -1 / 3.5 / bare flag）→ 不崩溃，产出合法 JSON `[MAIN/SHELL]`
6. 从 trace 裁决 `[MAIN/SHELL]`
7. 结果解读 `[MAIN/SHELL]`
8. Cleanup（PASS 才清，FAIL 保留） `[MAIN/SHELL]`

---

## Step 1: 创建 disposable scaffold bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs fatigue --case case-78 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
echo "B=$B"

# Write initial trace check: bundle created
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const B = process.argv[2];
const check = JSON.stringify({
  ts: new Date().toISOString(),
  event: 'check',
  source: 'playbook',
  gate: 'bundle-init',
  passed: true,
  expected: true,
  detail: `disposable bundle created at ${B}`,
});
writeFileSync(join(B, 'rb_trace.jsonl'), check + '\n', { flag: 'a' });
JS
```

→ 预期：bundle 就绪，`rb_trace.jsonl` 含首条 case-owned check。

---

## Step 2: Fail + high attempt → fatigue_warning + step_back

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# Run gate with --attempt 3 on scaffold bundle (guaranteed fail — no wave0 output)
STDOUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs \
  --bundle "$B" \
  --current-node phases/phase-wave0.md \
  --attempt 3 2>&1) || true

echo "$STDOUT" | B="$B" node -e "
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const B = process.env.B;
let stdin = '';
process.stdin.on('data', d => stdin += d);
process.stdin.on('end', () => {
  const result = JSON.parse(stdin);
  const c = result.check;
  const advice = result.advice || [];
  const fatigueMsgs = advice.filter(a => a.startsWith('[fatigue]'));

  const checks = [
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-fail-high',
      passed: c.fatigue_warning === true,
      expected: true,
      detail: 'fatigue_warning=true on fail + --attempt 3',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-fail-high',
      passed: c.step_back === true,
      expected: true,
      detail: 'step_back=true on fail + --attempt 3',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-fail-high',
      passed: fatigueMsgs.length >= 3,
      expected: true,
      detail: fatigueMsgs.length + ' [fatigue] advice messages (need >=3)',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-wording',
      passed: fatigueMsgs.some(a => a.includes('Agent-reported retry hint')),
      expected: true,
      detail: 'fatigue advice uses Agent-reported terminology',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-wording',
      passed: !fatigueMsgs.some(a => a.includes('verified consecutive') || a.includes('Engine verified')),
      expected: true,
      detail: 'fatigue advice does NOT claim Engine verified consecutive failures',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-wording',
      passed: fatigueMsgs.some(a => a.includes('If this invocation is for a stop:no phase')),
      expected: true,
      detail: 'fatigue advice uses conditional stop:no language',
    },
  ];

  const tracePath = join(B, 'rb_trace.jsonl');
  for (const ch of checks) writeFileSync(tracePath, JSON.stringify(ch) + '\n', { flag: 'a' });
  console.log(JSON.stringify({ checks: checks.length, fatigue: c.fatigue_warning, step_back: c.step_back, fatigueMsgs: fatigueMsgs.length }));
});
"
```

→ 预期：`fatigue_warning=true`, `step_back=true`, ≥3 条 `[fatigue]` advice，含 "Agent-reported"，不含 "Engine verified"。

---

## Step 3: Fail + low attempt → no fatigue

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STDOUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs \
  --bundle "$B" \
  --current-node phases/phase-wave0.md \
  --attempt 1 2>&1) || true

echo "$STDOUT" | B="$B" node -e "
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const B = process.env.B;
let stdin = '';
process.stdin.on('data', d => stdin += d);
process.stdin.on('end', () => {
  const result = JSON.parse(stdin);
  const c = result.check;
  const advice = result.advice || [];
  const fatigueMsgs = advice.filter(a => a.startsWith('[fatigue]'));

  const checks = [
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-fail-low',
      passed: c.fatigue_warning === undefined,
      expected: true,
      detail: 'fatigue_warning absent on fail + --attempt 1',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-fail-low',
      passed: c.step_back === undefined,
      expected: true,
      detail: 'step_back absent on fail + --attempt 1',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-fail-low',
      passed: fatigueMsgs.length === 0,
      expected: true,
      detail: 'no [fatigue] advice on fail + --attempt 1',
    },
  ];

  const tracePath = join(B, 'rb_trace.jsonl');
  for (const ch of checks) writeFileSync(tracePath, JSON.stringify(ch) + '\n', { flag: 'a' });
  console.log(JSON.stringify({ checks: checks.length, fatigue: c.fatigue_warning, fatigueMsgs: fatigueMsgs.length }));
});
"
```

→ 预期：无 `fatigue_warning`，无 `step_back`，无 `[fatigue]` advice。

---

## Step 4: Pass + high attempt → fatigue suppressed

先用 fixture 填充 bundle 使 gate pass，再以 `--attempt 5` 运行，验证 fatigue 被 pass 抑制。

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# ── Populate bundle for gate pass ──
# reference file meeting all 4 isCountable quality thresholds
# (metadata before first ## section, acceptance_status=accepted,
#  Core Content Capture >=100 chars, article-level source_url, Key Facts >=5 bullets)
cat > "$B/reference/00-shared-foundation.md" << 'REFEOF'
- source_url: https://en.wikipedia.org/wiki/Fatigue
- title: Fatigue - Wikipedia
- retrieved_date: 2026-06-15
- source_type: encyclopedia
- trust_tier: medium
- topic_tag: fatigue-overview
- acceptance_status: accepted

## Core Content Capture
Fatigue is a state of tiredness, exhaustion, or loss of energy that can be physical, mental, or a combination of both. Physical fatigue is the transient inability of muscles to maintain optimal physical performance, made more severe by intense physical exercise. Mental fatigue is a transient decrease in maximal cognitive performance resulting from prolonged periods of cognitive activity. It can manifest as somnolence, lethargy, directed attention fatigue, or disengagement. Fatigue is considered a symptom rather than a medical sign because it is a subjective feeling reported by the patient. The causes of fatigue are diverse, ranging from simple lack of sleep to underlying medical conditions.

## Key Facts
- Fatigue affects up to 45% of the general population at any given time
- The ICD-11 classifies fatigue under symptoms, signs and clinical findings (code MG22)
- Physical fatigue results from depletion of energy resources at the neuromuscular junction
- Mental fatigue is linked to reduced activity in the anterior cingulate cortex
- Chronic fatigue syndrome (ME/CFS) affects approximately 0.2-0.4% of the population
- Sleep disorders including insomnia and sleep apnea are common reversible causes
- The Chalder Fatigue Scale and Fatigue Severity Scale are validated instruments
- Cognitive behavioral therapy for fatigue shows moderate effect sizes in RCTs
REFEOF

# Topic registry + plan
cat > "$B/rb_plan.md" << 'PLANEOF'
---
plan_basename: fatigue
derived_topic_count: 1
topic_registry:
  - slug: fatigue-overview
    title: "Fatigue Overview"
    status: active
---

# Deep Research Plan: fatigue

## Topic Registry
| # | Slug | Title | Status |
|---|------|-------|--------|
| 1 | fatigue-overview | Fatigue Overview | active |
PLANEOF

# Per-topic source YAML
mkdir -p "$B/artifacts/wave0/fatigue-overview"
cat > "$B/artifacts/wave0/fatigue-overview/source.yaml" << 'SRCEOF'
- url: "https://en.wikipedia.org/wiki/Fatigue"
  title: "Fatigue - Wikipedia"
  retrieved_date: "2026-06-15"
  topic_tag: "fatigue-overview"
- url: "https://www.mayoclinic.org/diseases-conditions/fatigue/symptoms-causes/syc-20350822"
  title: "Fatigue - Mayo Clinic"
  retrieved_date: "2026-06-16"
  topic_tag: "fatigue-overview"
SRCEOF

# Status — set to wave0_complete → wave1_complete
cat > "$B/rb_status.json" << 'STATUSEOF'
{
  "bundle": "fatigue",
  "current_mode": "execution",
  "state": "wave0",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
STATUSEOF

# Output declarations (ledger) — two distinct source URLs to avoid dedup
mkdir -p "$B/_cache/fatigue-wikipedia" "$B/_cache/fatigue-mayo"
cat > "$B/rb_output_declarations.jsonl" << 'DECLEOF'
{"task_id":"task-shared-ref","agent_id":"agent-test","completed_at":"2026-07-02T10:00:00Z","output_files":[{"role":"reference","path":"reference/00-shared-foundation.md","source_url":"https://en.wikipedia.org/wiki/Fatigue","cache_dir":"_cache/fatigue-wikipedia","topic":"fatigue-overview"}],"cache_trails":["_cache/fatigue-wikipedia"]}
{"task_id":"task-topic-source","agent_id":"agent-test","completed_at":"2026-07-02T10:05:00Z","output_files":[{"role":"reference","path":"artifacts/wave0/fatigue-overview/source.yaml","source_url":"https://www.mayoclinic.org/diseases-conditions/fatigue/symptoms-causes/syc-20350822","cache_dir":"_cache/fatigue-mayo","topic":"fatigue-overview"}],"cache_trails":["_cache/fatigue-mayo"]}
DECLEOF

# Cache trail files (3 required files per trail for cache_coverage)
for d in "$B/_cache/fatigue-wikipedia" "$B/_cache/fatigue-mayo"; do
  echo '{"query":"fatigue"}' > "$d/websearch.json"
  echo "# Fatigue" > "$d/page.md"
done
# meta.json URLs must match source_url for cache_coverage mapping
cat > "$B/_cache/fatigue-wikipedia/meta.json" << 'METAEOF'
{"url": "https://en.wikipedia.org/wiki/Fatigue", "fetched_at": "2026-07-02T10:00:00Z"}
METAEOF
cat > "$B/_cache/fatigue-mayo/meta.json" << 'METAEOF'
{"url": "https://www.mayoclinic.org/diseases-conditions/fatigue/symptoms-causes/syc-20350822", "fetched_at": "2026-07-02T10:05:00Z"}
METAEOF

# ── Run gate with --attempt 5 (should PASS, fatigue suppressed) ──
STDOUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs \
  --bundle "$B" \
  --current-node phases/phase-wave0.md \
  --attempt 5 2>&1) || true

echo "$STDOUT" | B="$B" node -e "
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const B = process.env.B;
let stdin = '';
process.stdin.on('data', d => stdin += d);
process.stdin.on('end', () => {
  const result = JSON.parse(stdin);
  const c = result.check;
  const advice = result.advice || [];
  const fatigueMsgs = advice.filter(a => a.startsWith('[fatigue]'));

  const checks = [
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-pass-high',
      passed: c.passed === true,
      expected: true,
      detail: 'gate passes with populated fixture bundle',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-pass-high',
      passed: c.fatigue_warning === undefined,
      expected: true,
      detail: 'fatigue_warning absent when gate passes (--attempt 5)',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-pass-high',
      passed: c.step_back === undefined,
      expected: true,
      detail: 'step_back absent when gate passes (--attempt 5)',
    },
    {
      ts: new Date().toISOString(),
      event: 'check', source: 'playbook', gate: 'fatigue-pass-high',
      passed: fatigueMsgs.length === 0,
      expected: true,
      detail: 'no [fatigue] advice when gate passes',
    },
  ];

  const tracePath = join(B, 'rb_trace.jsonl');
  for (const ch of checks) writeFileSync(tracePath, JSON.stringify(ch) + '\n', { flag: 'a' });
  console.log(JSON.stringify({ checks: checks.length, passed: c.passed, fatigue: c.fatigue_warning }));
});
"
```

→ 预期：gate PASS，无 `fatigue_warning`，无 `step_back`，无 `[fatigue]` advice。

---

## Step 5: --attempt 解析边界 — 不崩溃，产出合法 JSON

测试 `--attempt` 的各种边界值不会导致 gate CLI 崩溃，始终产出合法 JSON。

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const B = process.argv[2];
const gateScript = 'DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs';

const cases = [
  { label: '--attempt 5',       args: '--attempt 5',       expectParse: 'valid' },
  { label: '--attempt abc',     args: '--attempt abc',     expectParse: 'fallback' },
  { label: '--attempt -1',      args: '--attempt -1',      expectParse: 'fallback' },
  { label: '--attempt 3.5',     args: '--attempt 3.5',     expectParse: 'fallback' },
  { label: '--attempt missing', args: '',                   expectParse: 'default' },
];

const checks = [];
for (const tc of cases) {
  const cmd = `node ${gateScript} --bundle "${B}" --current-node phases/phase-wave0.md ${tc.args}`;
  let passed = false;
  let detail = '';
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    JSON.parse(stdout); // must be valid JSON
    passed = true;
    detail = `${tc.label}: valid JSON, no crash`;
  } catch (e) {
    if (e.stdout) {
      try {
        JSON.parse(e.stdout);
        passed = true;
        detail = `${tc.label}: valid JSON (exit 1, gate fail expected)`;
      } catch {
        passed = false;
        detail = `${tc.label}: unparseable JSON — ${(e.message || '').slice(0, 80)}`;
      }
    } else {
      passed = false;
      detail = `${tc.label}: crash — ${(e.message || '').slice(0, 80)}`;
    }
  }
  checks.push({
    ts: new Date().toISOString(),
    event: 'check', source: 'playbook', gate: 'attempt-parse',
    passed, expected: true, detail,
  });
}

const tracePath = join(B, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });

const failed = checks.filter(c => !c.passed);
console.log(JSON.stringify({ total: checks.length, failed: failed.length }));
if (failed.length) {
  for (const f of failed) console.log('FAIL: ' + f.detail);
}
JS
```

→ 预期：所有 `--attempt` 变体不导致 CLI 崩溃，stdout 始终为合法 JSON。

---

## Step 7: 结果解读

| Check gate | 证明 |
|------------|------|
| `bundle-init` | disposable bundle 创建成功 |
| `fatigue-fail-high` (×3) | gate fail + `--attempt 3` → `fatigue_warning=true`, `step_back=true`, ≥3 `[fatigue]` advice |
| `fatigue-wording` (×3) | advice 使用 "Agent-reported retry hint"、不含 "Engine verified consecutive failures"、stop:no 语言是条件式 |
| `fatigue-fail-low` (×3) | gate fail + `--attempt 1` → 无 fatigue_warning、无 step_back、无 `[fatigue]` advice |
| `fatigue-pass-high` (×4) | gate pass + `--attempt 5` → gate 通过且 fatigue 被抑制 |
| `attempt-parse` (×5) | `--attempt` 边界值（有效整数 / 非数字 / 负数 / 浮点 / 缺失）不导致 CLI 崩溃，始终产出合法 JSON |

**PASS 含义**：gate CLI 的 fatigue signal 发射逻辑正确——只在 `!passed && attemptNumber >= fatigueThreshold` 时注入 diagnostics；pass 抑制 fatigue；`--attempt` 解析在异常输入时安全 fallback 到 0 而不崩溃。

**FAIL 含义**：fatigue 发射条件分支、advice 文案、或 `--attempt` 解析至少一处违背 spec。

### 本 case 不覆盖

- **Agent retry loop**：Agent 在 stop:no phase 中反复跑 gate 直到触发 fatigue 的闭环行为（需要 heavy case + 真实 Agent loop）
- **Agent 对 fatigue 的响应**：Agent 读到 `fatigue_warning` + `step_back` 后是否真的改变策略（需要 Agent 行为观察）
- **`--attempt` 上报准确性**：Agent 是否如实上报 attempt count（gate 信任 Agent 自报，无 Engine 侧校验）
- **AUTONOMOUS header / lifecycle membership / phase body leakage**：这些属于 stop:no 契约加固的结构性回归，由 `tests/engine/workflow-chain.test.mjs`（WNC-008 header injection）和 `tests/engine/static-regression.test.mjs`（WNC-009 + SWE-002 三层回归）覆盖，不在本 command experiment 范围内

---

## Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
