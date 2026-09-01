// tests/engine/residual-spec-drift-text-locks.test.mjs
// C1 `2026-08-31-repair-residual-spec-drift` 的文本回归锁：
// 1) 涉改 requirement 块内旧漂移句不再出现、新锚点句存在；
// 2) delta 块与 main spec 对应 requirement 块逐字同步（整块替换语义）。
// @impl CHI-004
// @impl DEW-012
// @impl AGQ-007
// @impl AGQ-027
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const CIF = 'openspec/specs/engine/check-inspect-feedback/spec.md';
const DEW = 'openspec/specs/agent/delegated-work-units/spec.md';
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
    /closed disposition vocabulary `unsupported_current_contract`[^)]*attempt-disposition emission surface/.test(t) &&
    !/closed disposition vocabulary `unsupported_current_contract`[^)]*\.mjs/.test(t),
    'disposition sentence must own the set without naming the implementation file',
  );
  assert.ok(t.includes("attempt-disposition emission surface"), 'disposition owner surface required');
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

test('delta blocks are verbatim-synced with main spec requirement blocks', () => {
  const C = 'openspec/changes/archive/2026-08-31-repair-residual-spec-drift/specs';
  const pairs = [
    [`${C}/engine/check-inspect-feedback/spec.md`, CIF],
    [`${C}/agent/delegated-work-units/spec.md`, DEW],
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
