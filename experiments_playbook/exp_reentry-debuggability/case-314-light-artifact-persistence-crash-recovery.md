---
schema: command-experiment/v2
experiment: reentry-debuggability
case: case-314-light-artifact-persistence-crash-recovery
case_goal: "验证 production persistence helper/CLI 对 prepared-before-rename、committed-before-cleanup、incomplete workspace 与 target conflict 给出 finalized/cleaned/blocked，且 Agent cleanup/retry 后 sweep 幂等、control authority 零 mutation。"
verdict_mode: all
required_checks: [prepared-finalized, post-rename-cleaned, preparing-blocked, agent-cleanup-retry, conflict-no-mutation, incomplete-no-deletion, repeat-idempotent, zero-control-mutation]
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
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 逐 step 执行。不得手写 sweep/persist verdict、promote 任意 `.tmp`、并发运行 persist/sweep，或修改 control authority 来制造 PASS。

# case-314-light-artifact-persistence-crash-recovery

## Step 1: 创建 bundle 并运行真实 crash/recovery path

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs artifact_persistence --case case-314 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  ARTIFACT_PERSISTENCE_ROOT,
  ArtifactPersistenceCrashError,
  persistBundleFile,
  sha256File,
} from './DPT_FRAMEWORK/engine/helpers/artifact-persistence.mjs';

const bundle = resolve(process.argv[2]);
for (const directory of ['reference', 'artifacts/wave0', 'final', '_cache/source', '_logs', '_work_units']) mkdirSync(join(bundle, directory), { recursive: true });
const controls = {
  'rb_status.json': '{"bundle":"artifact_persistence","current_gate":"wave0_complete"}\n',
  'rb_queue.json': '{"active_window":[],"refill_pool":[],"delegated_in_flight":{}}\n',
  'rb_output_declarations.jsonl': '',
  'rb_profile.yaml': 'research_style: quick_factual\n',
  'rb_plan.md': '# Plan\n',
};
for (const [relative, content] of Object.entries(controls)) writeFileSync(join(bundle, relative), content);
writeFileSync(join(bundle, 'rb_trace.jsonl'), '');

const controlSnapshot = () => Object.fromEntries(Object.keys(controls).map((relative) => [relative, createHash('sha256').update(readFileSync(join(bundle, relative))).digest('hex')]));
const beforeControls = controlSnapshot();
const cli = (...args) => {
  const result = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs', ...args], { encoding: 'utf8' });
  return { status: result.status, json: JSON.parse(result.stdout) };
};
const stage = (name, content) => {
  const file = join(bundle, '_logs', name);
  writeFileSync(file, content);
  return file;
};
const crash = (source, target, expectedTarget, hook) => {
  try {
    persistBundleFile({ bundlePath: bundle, sourcePath: source, target, expectedTarget, hooks: { [hook]: () => { throw new ArtifactPersistenceCrashError(hook); } } });
  } catch (error) {
    if (!(error instanceof ArtifactPersistenceCrashError)) throw error;
  }
};

const preparedSource = stage('prepared.md', 'prepared\n');
crash(preparedSource, 'reference/prepared.md', { kind: 'absent' }, 'afterPreparedPublished');
const finalized = cli('sweep', '--bundle', bundle);

const cleanedSource = stage('cleaned.md', 'cleaned\n');
crash(cleanedSource, 'artifacts/wave0/cleaned.md', { kind: 'absent' }, 'afterTargetRename');
const cleaned = cli('sweep', '--bundle', bundle);

const preparingSource = stage('preparing.md', 'preparing\n');
crash(preparingSource, '_cache/source/preparing.md', { kind: 'absent' }, 'afterPreparingPublished');
const preparingBlocked = cli('sweep', '--bundle', bundle);
const preparingWorkspace = join(bundle, preparingBlocked.json.entries[0].workspace);
rmSync(preparingWorkspace, { recursive: true });
const retried = cli('persist', '--bundle', bundle, '--source', preparingSource, '--target', '_cache/source/preparing.md', '--expect-absent');
const retrySweep = cli('sweep', '--bundle', bundle);

const conflictTarget = join(bundle, 'final/conflict.md');
writeFileSync(conflictTarget, 'old\n');
const conflictSource = stage('conflict.md', 'prepared-conflict\n');
crash(conflictSource, 'final/conflict.md', { kind: 'sha256', value: sha256File(conflictTarget) }, 'afterPreparedPublished');
writeFileSync(conflictTarget, 'newer\n');
const conflictBlocked = cli('sweep', '--bundle', bundle);
const conflictWorkspace = join(bundle, conflictBlocked.json.entries[0].workspace);

const persistenceRoot = join(bundle, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
mkdirSync(join(persistenceRoot, 'incomplete'));
const incompleteBlocked = cli('sweep', '--bundle', bundle);

const repeatBlocked = cli('sweep', '--bundle', bundle);
const checks = [
  ['prepared-finalized', finalized.status === 0 && finalized.json.entries.some((entry) => entry.verdict === 'finalized') && readFileSync(join(bundle, 'reference/prepared.md'), 'utf8') === 'prepared\n'],
  ['post-rename-cleaned', cleaned.status === 0 && cleaned.json.entries.some((entry) => entry.verdict === 'cleaned') && readFileSync(join(bundle, 'artifacts/wave0/cleaned.md'), 'utf8') === 'cleaned\n'],
  ['preparing-blocked', preparingBlocked.status === 1 && preparingBlocked.json.entries[0].reason_code === 'operation_not_prepared'],
  ['agent-cleanup-retry', retried.status === 0 && retried.json.verdict === 'committed' && retrySweep.status === 0 && retrySweep.json.entries.length === 0],
  ['conflict-no-mutation', conflictBlocked.status === 1 && conflictBlocked.json.entries.some((entry) => entry.reason_code === 'target_conflict') && readFileSync(conflictTarget, 'utf8') === 'newer\n' && existsSync(conflictWorkspace)],
  ['incomplete-no-deletion', incompleteBlocked.status === 1 && incompleteBlocked.json.entries.some((entry) => entry.reason_code === 'operation_invalid') && existsSync(join(persistenceRoot, 'incomplete'))],
  ['repeat-idempotent', repeatBlocked.status === 1 && JSON.stringify(repeatBlocked.json.entries) === JSON.stringify(incompleteBlocked.json.entries)],
  ['zero-control-mutation', JSON.stringify(beforeControls) === JSON.stringify(controlSnapshot())],
];
for (const [gate, passed] of checks) writeFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true })}\n`, { flag: 'a' });
if (checks.some(([, passed]) => !passed)) process.exit(1);
JS
```

## Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
