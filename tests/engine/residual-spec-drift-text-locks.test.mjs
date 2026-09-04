// tests/engine/residual-spec-drift-text-locks.test.mjs
// C1 `2026-08-31-repair-residual-spec-drift` 的文本回归锁：
// 1) 涉改 requirement 块内旧漂移句不再出现、新锚点句存在；
// 2) delta 块与 main spec 对应 requirement 块逐字同步（整块替换语义）。
// @impl CHI-004
// @impl WSU-003 (DEW-012 migrated 2026-09-04)
// @impl AGQ-007
// @impl AGQ-027
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const CIF = 'openspec/specs/engine/check-inspect-feedback/spec.md';
const DEW = 'openspec/specs/agent/work-unit-submission/spec.md'; // DEW-012 migrated to WSU-003 (2026-09-04 dwu split)
const AGQ = 'openspec/specs/agent/agentic-queue/spec.md';
const CDP = 'openspec/specs/research/content-delivery-phase-content/spec.md';

function mainBlock(mainPath, heading) {
  const lines = read(mainPath).split('\n');
  const start = lines.findIndex((l) => l === heading);
  assert.ok(start !== -1, `heading not found in ${mainPath}: ${heading}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('### Requirement: ')) { end = i; break; }
  }
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end).join('\n');
}

function deltaBlocks(deltaPath) {
  const lines = read(deltaPath).split('\n');
  const blocks = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### Requirement: ')) {
      if (current) blocks.push(current);
      current = [line];
    } else if (current && (line.startsWith('## ') || line.startsWith('> req:'))) {
      // section-boundary only when this line is followed (after blanks) by a '## ' section header;
      // otherwise it is a legitimate inline req line inside the requirement block
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      const isBoundary = line.startsWith('## ') || (j < lines.length && lines[j].startsWith('## '));
      if (isBoundary) {
        blocks.push(current);
        current = null;
      } else {
        current.push(line);
      }
    } else if (current) {
      current.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks.map((b) => {
    const arr = [...b];
    while (arr.length && arr[arr.length - 1].trim() === '') arr.pop();
    return arr.join('\n');
  });
}

test('CHI-004: recovery vocabulary is export-pointer based, gate-hint example corrected, disposition set enumerated', () => {
  const t = read(CIF);
  assert.ok(!t.includes('`semantic_boundary`'), 'cross-vocabulary contamination must be gone');
  assert.ok(
    /gate-hint kinds\s*`agent_action`, `engine_operation`, `user_decision`, `external_action`, `missing_contract`/.test(t),
    'gate-hint kinds example must carry the correct GATE_REPAIR_KINDS fifth value',
  );
  assert.ok(!t.includes('that no CLI verb matches'), 'stale CLI-verb-spelling ban must be gone');
  assert.ok(!t.includes('SHALL use the CLI-verb spelling'), 'stale 5-value spelling rule must be gone');
  assert.ok(
    t.includes('`recover-transaction`, `recover-declaration`,\n`supersede`, `wait`, `missing_contract`') === false,
    'stale 5-value recovery enumeration must be gone',
  );
  assert.ok(t.includes('`WORK_UNIT_RECOVERY_ACTIONS`'), 'export pointer required');
  assert.ok(t.includes('`RECOVERY_ACTION_CLI_VERB`'), 'verb-mapping pointer required');
  assert.ok(
    t.includes('`unsupported_current_contract`, `not_submitted`, `historical`, `unresolved`, `current`'),
    'disposition closed set must be enumerated for the C2 lock/checker to guard',
  );
  assert.ok(
    /closed disposition vocabulary `unsupported_current_contract`/.test(t) &&
    /locked by its unit test/.test(t),
    'disposition set must be enumerated with owner pointer and lock reference',
  );
  assert.ok(t.includes('WORK_UNIT_ATTEMPT_DISPOSITIONS'), 'frozen export owner pointer required');
});

test('DEW-012: strict-attempt-binding single generation, retired clauses annotated', () => {
  const t = read(DEW);
  assert.ok(!t.includes('filling missing receipt binding identity fields'), 'autofill promise must be gone');
  assert.ok(!t.includes('applies only to nonce correction'), 'stale containment-scoping must be gone');
  assert.ok(!t.includes('submit MAY normalize the nonce'), 'nonce normalization authorization must be gone');
  assert.ok(t.includes('filling a missing receipt `schema_version`'), 'schema-version fill must be retained');
  assert.ok(
    (t.match(/retained only as the OpenSpec delta-sync key/g) || []).length >= 2,
    'both rewritten scenario titles must carry retention notes',
  );
  assert.ok(t.includes('DEW-004'), 'strict boundary must cite DEW-004');
});

test('AGQ-027/AGQ-007: drained wording and source-intake discriminator match code', () => {
  const t = read(AGQ);
  assert.ok(
    t.includes('`drained: true` emitted alongside `passed: false`'),
    'drained/passed coexistence must be stated as designed',
  );
  assert.ok(t.includes('non-zero check exit status'), 'exit-status fact must be explicit');
  assert.ok(t.includes('kind `wave0_source_intake`'), 'operative discriminator must be named');
  assert.ok(t.includes('not an admission discriminator'), 'historical label must be de-scoped');
});

test('CDP Final: final_delivery normalized as reserved stop-authorization value', () => {
  const t = read(CDP);
  assert.ok(t.includes('is a queue stop state, not a trace event name'), 'enum-collision normalization required');
  assert.ok(t.includes('stop-authorization or satisfaction trace event'), 'prohibition wording updated');
});

test('Purpose/guidance/catalog prose fixes', () => {
  const gsk = read('openspec/specs/engine/gate-skeleton/spec.md');
  assert.ok(gsk.includes('10 个 Gate definition JSON 骨架和 10 个 Gate CLI 骨架'));
  assert.ok(!gsk.includes('9 个 Gate'));
  const cts = read('openspec/specs/research/canonical-topic-state/spec.md');
  assert.ok(cts.includes('plus the read-only `schema` authoring projection'));
  const rwg = read('openspec/specs/research/research-wave-gate-implementation/spec.md');
  assert.ok(rwg.includes('`setup-ready`'));
  const ib = read('openspec/guidance/models/invariants-brief.md');
  assert.ok(ib.includes('`WORK_UNIT_RECOVERY_ACTIONS`'));
  assert.ok(!ib.includes('（`recover-transaction` / `recover-declaration` / `supersede` / `wait` / `missing_contract`）'));
  const cat = read('openspec/specs/README.md');
  assert.ok(cat.includes('Deterministic inspection verifies projection readiness (RRM-006/007)'));
  assert.ok(!cat.includes('No deterministic owner; Node does not judge claim interpretation.'));
});

test('C2 residue: engine sources carry no superseded leniency tokens', () => {
  const workUnitModules = readdirSync(join(process.cwd(), 'DEEP_RESEARCH_HARNESS', 'engine'))
    .filter((name) => /^work-unit-.*\.mjs$/.test(name))
    .map((name) => `DEEP_RESEARCH_HARNESS/engine/${name}`);
  assert.ok(workUnitModules.length >= 26, `expected the post-C4 work-unit module family, found ${workUnitModules.length}`);
  for (const required of ['work-unit-submit-snapshot.mjs', 'work-unit-submit-late-retry.mjs', 'work-unit-submit-declaration-recovery.mjs', 'work-unit-transaction-primitives.mjs', 'work-unit-transaction-projection.mjs']) {
    assert.ok(workUnitModules.some((rel) => rel.endsWith(required)), `missing C4 module: ${required}`);
  }
  for (const token of ['allowNonceNormalization', 'receipt_binding_identity_autofilled', 'nonce_normalized_from_record']) {
    for (const rel of workUnitModules) {
      assert.ok(!read(rel).includes(token), `${token} must be absent from ${rel}`);
    }
  }
  // strict rejection paths and the surviving schema-version fill must remain
  const validation = read('DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs');
  assert.ok(validation.includes('runtime receipt missing exact attempt binding'));
  assert.ok(validation.includes('receipt_schema_defaulted'));
  // A7: recover-declaration write_to names the submit/late-submit/new-attempt boundary
  // (C4: the payload builder moved to work-unit-submit-declaration-recovery.mjs)
  const recoveryModule = read('DEEP_RESEARCH_HARNESS/engine/work-unit-submit-declaration-recovery.mjs');
  assert.ok(recoveryModule.includes('the submit/late-submit/new-attempt boundary'));
});

test('delta blocks are verbatim-synced with main spec requirement blocks', () => {
  const C = 'openspec/changes/archive/2026-08-31-repair-residual-spec-drift/specs';
  const pairs = [
    [`${C}/engine/check-inspect-feedback/spec.md`, CIF],
    // DEW pair retired: 2026-09-01-slim-dwu-requirements 重构了 DEW-012 块
    // （文本守恒由 tests/engine/dwu-slim-structure-locks.test.mjs 接管）。
    [`${C}/agent/agentic-queue/spec.md`, AGQ],
    [`${C}/research/content-delivery-phase-content/spec.md`, CDP],
  ];
  for (const [deltaPath, mainPath] of pairs) {
    for (const block of deltaBlocks(deltaPath)) {
      const heading = block.split('\n')[0];
      assert.equal(mainBlock(mainPath, heading), block, `delta/main drift at ${mainPath} :: ${heading}`);
    }
  }
});

test('C3: RWP pointer rewrites replace Engine-rule restatements', () => {
  const t = read('openspec/specs/research/research-wave-phase-content/spec.md');
  assert.ok(t.includes('as a pointer to its single Source of Record: the provenance-gate requirement'), 'rerun_count teaching pointer required');
  assert.ok(t.includes('(WPG-015, `agent/work-unit-provenance-gate`)'), 'WPG-015 owner attribution required');
  assert.ok(t.includes('(WTS-012, `research/wave2-synthesis`)'), 'WTS-012 owner attribution required');
  assert.ok(t.includes('canonical entry fields owned by the research-return-map contract'), 'return-map field pointer required');
  assert.ok(t.includes('limitation: not materializable; process-only output'), 'no-projection example must use the RRM canonical form');
  assert.ok(!t.includes('limitation: process-only output, not consumer-facing'), 'divergent example string must be gone');
  assert.ok(!t.includes('The field SHALL be a non-negative integer or absent'), 'rerun_count field contract restatement must be gone');
  assert.ok(!t.includes('finding-index.yaml`\'s per-finding contract SHALL include'), 'created_in_rerun_count contract restatement must be gone');
  assert.ok((t.match(/retained only as the OpenSpec delta-sync key/g) || []).length >= 4, 'all retained scenario titles must carry retention notes');
});

test('C3: GSK-009 morale prohibition is owned by the exit-code convention', () => {
  const t = read('openspec/specs/engine/gate-skeleton/spec.md');
  assert.ok(!t.includes('Gate CLIs SHALL NOT encode morale, fatigue, reassurance, or continuation encouragement'), 'duplicated morale prohibition must be gone');
  assert.ok(t.includes('owned by the framework-wide CLI exit-code convention'), 'convention attribution required');
  assert.ok(t.includes('#### Scenario: High-friction pass keeps pass code'), 'scenario title retained as sync key');
  assert.ok(t.includes('retained only as the OpenSpec delta-sync key'), 'retention note required');
  assert.ok(t.includes('`1` for normal gate failure'), 'gate-specific 0/1/2 mapping retained');
});

test('C3: registry ledger truth (RRM-008/CTS-012, RWP-005/008 retired, AGO-006 aligned)', () => {
  const reg = read('openspec/governance/req-registry.yaml');
  assert.ok(reg.includes('RRM-008: research-return-map — Template and command guidance SHALL preserve separate Seed Topic questions'));
  assert.ok(reg.includes('CTS-012: canonical-topic-state — Canonical reference binding SHALL resolve exact UID subsets'));
  assert.ok(reg.includes('[DEPRECATED] — content no longer exists in any accepted surface (2026-08-31 archaeology)'));
  assert.ok(reg.includes('AGO-006: agent-output-declaration — cache_trails SHALL be Engine-verified during operate-work-unit submit'));
  assert.ok(!reg.includes('cache_trails MUST be populated by Engine during work-unit submit validation, not Agent claims'));
  const rwp = read('openspec/specs/research/research-wave-phase-content/spec.md');
  assert.ok(!rwp.includes('RWP-005') && !rwp.includes('RWP-008'), 'deprecated IDs must not remain in header');
  const rrm = read('openspec/specs/research/research-return-map/spec.md');
  assert.ok(rrm.includes('RRM-008'), 'header must declare RRM-008');
  const cts = read('openspec/specs/research/canonical-topic-state/spec.md');
  assert.ok(cts.includes('CTS-012'), 'header must declare CTS-012');
});
