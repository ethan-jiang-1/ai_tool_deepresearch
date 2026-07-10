---
schema: command-experiment/v1
experiment: wff-pre-research-repair
case: case-115-heavy-hitl1-research-access-probe
weight: heavy
case_goal: "Real Agent canary: HITL1 performs one bounded dynamic search/fetch probe, records research_access, and either passes with available access or fails closed at HITL1 with honest unavailable access."
runner: coding-agent
agent_mode: real-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-115_research_access_*
trace: dpt_disp_case-115_research_access_*/rb_trace.jsonl
verdict: trace-jsonl
req: SCO-002, PRP-002, PRP-005, PRG-002
---

## Execution Contract

Heavy real-Agent canary. PASS requires the current Agent to attempt the HITL1 research-access probe with the actual search/fetch surfaces available in this runtime. Do not use fixture URLs, fixed URLs from this file, mock fetch output, search snippets, or hand-written page content to claim `available`.

Both honest branches are valid:

- `available`: exactly one dynamic search yields a first usable HTTP(S) result, exactly one fetch returns real page content, `research_access.status: available`, and `hitl1-recorded` gate passes.
- `unavailable`: search/fetch is missing, blocked, fails, or yields no usable HTTP(S) result, `research_access.status: unavailable`, and `hitl1-recorded` gate fails without authorizing Setup.

Probe URL/content is not research evidence and must not be written to `reference/`, `_cache/`, `artifacts/`, `_work_units/`, ledgers, output declarations, or Wave coverage surfaces.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Disposable bundle from `new-disposable-bundle.mjs` |
| Agent actor | Required for the probe step |
| External calls | Required for the `available` branch; honest missing/blocked tooling records `unavailable` |
| Fixture boundary | HITL1 choices/style are deterministic setup only; probe observation is not fixture-backed |
| Verdict source | `rb_profile.yaml`, gate JSON, leakage scan, and trace checks |
| Does not prove | Research quality, source quality, or Wave evidence collection |

# case-115-heavy-hitl1-research-access-probe

## Expected Runtime Path

1. Create a disposable bundle with fixed HITL1 choices and style params.
2. Agent performs one neutral dynamic search and, when possible, one fetch of the first usable HTTP(S) result.
3. Agent writes the direct observation to `rb_profile.yaml#/research_access`.
4. Run `hitl1-recorded` gate.
5. Available branch must pass; unavailable branch must fail closed at HITL1 with no Setup route.
6. Scan evidence surfaces for probe URL leakage.
7. Verdict from `rb_trace.jsonl`; cleanup only after PASS.

## Step 1: [MAIN/SHELL] Create Bundle And Fixed HITL1 Choices

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs research_access --case case-115 --force)
echo "Bundle: $B"
echo "$B" > /tmp/pb_case_115_bundle

cat > $B/rb_plan.md << 'EOF'
---
plan_basename: research_access
derived_topic_count: 1
topic_registry:
  - id: "01"
    slug: 01_capability-probe-placeholder
    title: Capability Probe Placeholder
---
# Research Access Probe Plan

This bundle exists only to test HITL1 research access. The probe URL is not evidence.
EOF

cat > $B/rb_profile.yaml << 'EOF'
plan_basename: research_access
research_profile: quick_factual
root_must_answer_set:
  - "Can the current Agent environment perform real search and fetch before silent waves?"
research_access:
  status: unprobed
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-10T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF

node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle "$B" --style quick_factual
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl1_recorded
```

## Step 2: [AGENT] Perform The Real Bounded Probe

Use the current Agent's actual search surface exactly once with a neutral capability-only query. Use the first usable HTTP(S) result in returned order. If a usable URL exists, use the current Agent's actual fetch surface exactly once for that URL.

Do not use a URL from this playbook. Do not choose a nicer second result. Do not use search snippets as fetched content. Do not write the fetched page content anywhere in the bundle.

After the attempt, run exactly one of the following shell blocks with variables filled from the immediately preceding real tool call.

### Available Observation

Use this branch only if the actual fetch returned page content.

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_case_115_bundle)

# Fill from the immediately preceding real search/fetch call.
PROBE_RESULT_URL="<first usable HTTP(S) URL from dynamic search>"
PROBE_SEARCH_SURFACE="<actual search surface label>"
PROBE_FETCH_SURFACE="<actual fetch surface label>"

node --input-type=module - "$B" "$PROBE_RESULT_URL" "$PROBE_SEARCH_SURFACE" "$PROBE_FETCH_SURFACE" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';

const [bundle, resultUrl, searchSurface, fetchSurface] = process.argv.slice(2);
if (!resultUrl || resultUrl.startsWith('<')) throw new Error('PROBE_RESULT_URL must come from the dynamic search result');
const url = new URL(resultUrl);
if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`probe URL must be HTTP(S): ${resultUrl}`);
if (url.hostname === 'example.com') throw new Error('example.com is a fixture URL, not a dynamic probe result');

const profilePath = join(bundle, 'rb_profile.yaml');
const profile = parse(readFileSync(profilePath, 'utf-8'));
profile.research_access = {
  status: 'available',
  probed_at: new Date().toISOString(),
  result_url: resultUrl,
  fetch_outcome: 'success',
  search_surface: searchSurface && !searchSurface.startsWith('<') ? searchSurface : undefined,
  fetch_surface: fetchSurface && !fetchSurface.startsWith('<') ? fetchSurface : undefined,
};
writeFileSync(profilePath, stringify(profile));
JS
```

### Unavailable Observation

Use this branch when search/fetch is missing, blocked, fails, or yields no usable HTTP(S) result.

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_case_115_bundle)

# Fill from the immediately preceding real attempt.
PROBE_FETCH_OUTCOME="not_attempted" # one of: not_attempted, blocked, failed
PROBE_REASON="<direct non-empty reason from the attempted probe>"
PROBE_RESULT_URL="" # optional; set only when search found a URL but fetch failed/blocked
PROBE_SEARCH_SURFACE="<actual search surface label, if known>"
PROBE_FETCH_SURFACE="<actual fetch surface label, if known>"

node --input-type=module - "$B" "$PROBE_FETCH_OUTCOME" "$PROBE_REASON" "$PROBE_RESULT_URL" "$PROBE_SEARCH_SURFACE" "$PROBE_FETCH_SURFACE" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';

const [bundle, outcome, reason, resultUrl, searchSurface, fetchSurface] = process.argv.slice(2);
if (!['not_attempted', 'blocked', 'failed'].includes(outcome)) throw new Error(`invalid unavailable outcome: ${outcome}`);
if (!reason || reason.startsWith('<') || reason.trim().length === 0) throw new Error('PROBE_REASON must be a direct non-empty reason');
const observation = {
  status: 'unavailable',
  probed_at: new Date().toISOString(),
  fetch_outcome: outcome,
  reason,
};
if (resultUrl) {
  const url = new URL(resultUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`probe URL must be HTTP(S): ${resultUrl}`);
  observation.result_url = resultUrl;
}
if (searchSurface && !searchSurface.startsWith('<')) observation.search_surface = searchSurface;
if (fetchSurface && !fetchSurface.startsWith('<')) observation.fetch_surface = fetchSurface;

const profilePath = join(bundle, 'rb_profile.yaml');
const profile = parse(readFileSync(profilePath, 'utf-8'));
profile.research_access = observation;
writeFileSync(profilePath, stringify(profile));
JS
```

## Step 3: [MAIN/SHELL] Validate Observation Shape

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_case_115_bundle)

node --input-type=module - "$B" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ProfileSchema } from './DPT_FRAMEWORK/schema/index.mjs';

const bundle = process.argv[2];
const profile = parse(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf-8'));
const parsed = ProfileSchema.safeParse(profile);
assert.equal(parsed.success, true, parsed.error ? JSON.stringify(parsed.error.issues) : 'profile ok');
const access = profile.research_access;
assert.ok(['available', 'unavailable'].includes(access?.status), 'probe must no longer be unprobed');
if (access.status === 'available') {
  assert.equal(access.fetch_outcome, 'success');
  assert.match(access.result_url, /^https?:\/\//);
  assert.ok(!access.result_url.includes('example.com'), 'available URL must not be a fixture URL');
} else {
  assert.ok(access.reason && access.reason.trim().length > 0);
  assert.notEqual(access.fetch_outcome, 'success');
}
console.log(JSON.stringify({ status: access.status, result_url: access.result_url || null }));
JS
```

## Step 4: [MAIN/SHELL] Run HITL1 Gate And Check Branch Verdict

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_case_115_bundle)

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle "$B" --current-node phases/phase-hitl1.md || true)
echo "$GATE_OUTPUT" > "$B/case-115-hitl1-gate.json"
echo "$GATE_OUTPUT"

node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const bundle = process.argv[2];
const profile = parse(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf-8'));
const gate = JSON.parse(readFileSync(join(bundle, 'case-115-hitl1-gate.json'), 'utf-8'));
const access = profile.research_access;
const gatePassed = gate.check?.passed === true;
let ok;
let detail;

if (access.status === 'available') {
  ok = gatePassed && gate.check?.next === 'phases/phase-setup.md';
  detail = `available branch: gate passed=${gatePassed}`;
} else {
  const noSetup = gate.check?.next === null && gate.routing?.kind !== 'next' && !JSON.stringify(gate).includes('phases/phase-setup.md');
  ok = !gatePassed && noSetup;
  detail = `unavailable branch: gate passed=${gatePassed}, noSetup=${noSetup}, reason=${access.reason}`;
}

recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'hitl1-research-access-probe',
  passed: ok,
  detail,
});
JS
```

## Step 5: [MAIN/SHELL] Check Probe Did Not Leak Into Evidence Surfaces

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_case_115_bundle)

node --input-type=module - "$B" <<'JS'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const bundle = process.argv[2];
const profile = parse(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf-8'));
const resultUrl = profile.research_access?.result_url || '';
const surfaces = [
  'reference',
  '_cache',
  'artifacts',
  '_work_units',
  'rb_output_declarations.jsonl',
  'rb_work_unit_ledger.jsonl',
];

function walk(path) {
  if (!existsSync(path)) return [];
  const st = statSync(path);
  if (st.isFile()) return [path];
  return readdirSync(path).flatMap((name) => walk(join(path, name)));
}

const leaks = [];
for (const surface of surfaces) {
  for (const file of walk(join(bundle, surface))) {
    const text = readFileSync(file, 'utf-8');
    if (resultUrl && text.includes(resultUrl)) leaks.push(relative(bundle, file));
  }
}

recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'probe-evidence-boundary',
  passed: leaks.length === 0,
  detail: leaks.length === 0 ? 'probe URL absent from evidence surfaces' : `probe URL leaked into ${leaks.join(', ')}`,
});
JS
```

## Step 6: [MAIN/SHELL] Verdict

```bash
B=$(cat /tmp/pb_case_115_bundle)
node -e "import('$PWD/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/rb_trace.jsonl'))"
```

## Step HH: Post-Execution Health

Use the light health profile because this canary stops at HITL1 and intentionally does not create Wave ledgers, cache trails, or submitted reference outputs. The case is still `weight: heavy` because the probe requires real external search/fetch.

```bash
B=$(cat /tmp/pb_case_115_bundle)
node experiments_env/shared/verify-bundle-health.mjs --bundle "$B" --profile light
```

## Step 7: Cleanup

PASS + CLEAN only. FAIL or health issues preserve the bundle.

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_case_115_bundle)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.cleanup('$B', { caseId: 'case-115' }))"
rm -f /tmp/pb_case_115_bundle
```

## Result Interpretation

PASS in the available branch proves the current Agent can perform at least one real search/fetch before silent waves and that the existing HITL1 gate accepts the recorded observation.

PASS in the unavailable branch proves the framework fails fast at HITL1, preserves user choices, and does not authorize Setup when research access is absent or blocked.
