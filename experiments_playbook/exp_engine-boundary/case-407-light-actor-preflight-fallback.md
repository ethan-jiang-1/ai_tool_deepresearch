---
schema: command-experiment/v2
experiment: engine-boundary
case: case-407-light-actor-preflight-fallback
case_goal: "验证 role-bound actor preflight 在 allocation 前 no-claim，并让显式单项 Phase Agent fallback 通过同一 submit/ledger authority。"
verdict_mode: all
required_checks: [later-normal-batch, single-fallback-submit, unavailable-no-claim]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: DEW-016, DEW-017, DEW-018, AGQ-024, RWP-019, SRL-006
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

# case-407-light-actor-preflight-fallback

## Execution Contract

Fixture-backed controlled Engine proof. The normalized observations are synthetic inputs used only to exercise production claim branches; they do not prove real host availability. No external calls or fake research claims occur.

## Step 1: [MAIN/SHELL] Run Controlled Proof

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs actor_preflight --case case-407 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  recordPlaybookCheck,
  runJsonCli,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit,
  writeMinimalPlan,
  writeMinimalStatus,
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const cli = path.resolve('DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs');
writeMinimalStatus(bundle);
writeMinimalPlan(bundle);

for (let index = 0; index < 5; index += 1) enqueueWorkUnitTask(bundle, queueItemForWorkUnit({ queue_item_id: `case407-${index}`, topic_slug: 'topic-a' }));
const queuePath = path.join(bundle, 'rb_queue.json');
const queueBefore = readFileSync(queuePath, 'utf-8');
const unavailableArgs = [cli, 'claim', bundle, '--phase', 'wave0', '--count', '5', '--actor-outcome', 'unavailable', '--actor-source', 'native_probe', '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_capacity_unavailable', '--execution-actor', 'delegated_subagent'];
const blocked = runJsonCli(unavailableArgs, { expectStatus: 1 });
const blockedRepeat = runJsonCli(unavailableArgs, { expectStatus: 1 });
recordPlaybookCheck(bundle, { gate: 'unavailable-no-claim', passed: blocked.claimed_count === 0 && blockedRepeat.claimed_count === 0 && readFileSync(queuePath, 'utf-8') === queueBefore && !existsSync(path.join(bundle, '_work_units', '_index.json')), detail: JSON.stringify(blocked.actor_preflight) });

const fallback = runJsonCli([cli, 'claim', bundle, '--phase', 'wave0', '--count', '5', '--actor-outcome', 'unavailable', '--actor-source', 'native_probe', '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_capacity_unavailable', '--execution-actor', 'phase_agent_fallback']);
const fallbackId = fallback.claimed_work_ids[0];
const fixture = writeFixtureResultForWorkUnit(bundle, { work_id: fallbackId, source_url: 'https://research-source.test/case407/fallback' });
submitWorkUnitViaCli(bundle, { work_id: fallbackId, resultPath: fixture.resultPath });
const ledger = readFileSync(path.join(bundle, 'rb_output_declarations.jsonl'), 'utf-8').trim().split(/\r?\n/).map(JSON.parse);
recordPlaybookCheck(bundle, { gate: 'single-fallback-submit', passed: fallback.claimed_count === 1 && ledger[0]?.actor_execution?.execution_actor_class === 'phase_agent_fallback', detail: JSON.stringify({ fallback, ledger_actor: ledger[0]?.actor_execution }) });

const available = runJsonCli([cli, 'claim', bundle, '--phase', 'wave0', '--count', '5', '--actor-outcome', 'available', '--actor-source', 'native_probe', '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_succeeded', '--execution-actor', 'delegated_subagent']);
recordPlaybookCheck(bundle, { gate: 'later-normal-batch', passed: available.claimed_count > 0 && available.prompt_refs.every((entry) => entry.actor_execution.execution_actor_class === 'delegated_subagent'), detail: JSON.stringify(available.claimed_work_ids) });

console.log('Recorded native playbook checks; Supervisor finalizer is authoritative.');
JS
```

Expected: three checks pass. The first two no-claim calls preserve queue bytes and allocate no index; fallback claims/submits exactly one actor-distinguishable work unit; a later available observation claims a normal delegated batch.

## Native completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.
