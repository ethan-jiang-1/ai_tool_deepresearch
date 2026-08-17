// run-contract-surfaces-doc-lock.test.mjs
// Static doc-lock for BUG-227/228/229/230/225(hash)/231: the Agent-facing contract surfaces
// (envelope example, gate definition wording, setup phase status window, finding-index required
// keys, result_hash basis, run-scoped script location) must stay aligned with the deterministic
// contracts they present. Deterministic static facts; no network, no Agent execution.
// @impl SUD-008 (derived), PRP-003 (derived), CMI-001 (derived), WDC-004 (derived)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const H = (rel) => join('DEEP_RESEARCH_HARNESS', rel);

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

const envelope = read(H('workflows/nodes/shared/shared-hitl1-research-access-envelope.md'));
const schemas = read(H('workflows/nodes/shared/shared-schemas.md'));
const setup = read(H('workflows/nodes/phases/phase-setup.md'));
const readme = read(H('README.md'));
const bundleMap = read(H('rb_templates/BUNDLE_MAP.md.tmpl'));
const playbook = read(H('command_playbook/instantiate-run-bundle.md'));
const agents = read('AGENTS.md');
const claude = read('CLAUDE.md');
const gitignore = read('.gitignore');
const gateDefinition = JSON.parse(read(H('schema/gate_definitions/gate-wave1-complete.definition.json')));

const floorRule = gateDefinition.rules.find((rule) => rule.id === 'per_topic_ref_md_count_floor');

describe('BUG-227: research-access envelope example matches ProfileSchema', () => {
  it('never uses whole-probe not_attempted for an individual sample in the Available example', () => {
    // The Available example spans up to the Unavailable block; every single-sample outcome in it
    // must be a closed per-sample terminal (content/transport_inconclusive/round_budget_not_attempted).
    const availableExample = envelope.slice(envelope.indexOf('status: available'), envelope.indexOf('status: unavailable'));
    assert.ok(
      availableExample.includes('outcome: round_budget_not_attempted'),
      'Available example must mark the unstarted reserve sample as round_budget_not_attempted',
    );
    assert.ok(
      !/outcome:\s*not_attempted/.test(availableExample),
      'Available example must not use whole-probe not_attempted for a single sample',
    );
  });
});

describe('BUG-228: Wave1 ref floor definition states effective semantics', () => {
  it('failure_message names the profile threshold source and the countable scope', () => {
    assert.ok(floorRule, 'per_topic_ref_md_count_floor rule must exist');
    assert.ok(
      floorRule.failure_message.includes('rb_profile.yaml#/research_style_params/wave1_per_topic_ref_floor'),
      'failure_message must name the profile-driven effective threshold source',
    );
    assert.ok(
      /submitted.backing/i.test(floorRule.failure_message),
      'failure_message must state that only Wave1 submitted-backing canonical candidates count',
    );
  });
});

describe('BUG-229: setup phase documents the pre-gate status window', () => {
  it('phase-setup.md §3 names the pre-gate window and the bootstrap advance-status prerequisite', () => {
    assert.ok(
      setup.includes('current_gate: hitl1_recorded') && setup.includes('next_gate: setup_ready'),
      '§3 must describe the pre-gate window (hitl1_recorded -> setup_ready)',
    );
    assert.ok(
      setup.includes('advance-status.mjs --bundle <path> --to setup_ready'),
      '§3/§5 must instruct the bootstrap advance-status --to setup_ready gate prerequisite',
    );
  });
});

describe('BUG-230: finding-index required keys documented', () => {
  it('shared-schemas.md marks ledger/synthesis required and resolution origin_refs non-empty', () => {
    assert.ok(
      /Top-level keys（全部必填）/.test(schemas) && schemas.includes('`ledger` 与 `synthesis` 是必填 key'),
      'shared-schemas must mark ledger and synthesis as required top-level keys',
    );
    assert.ok(
      /cross_topic_resolution` 必填\*\*非空\*\*/.test(schemas),
      'shared-schemas must state cross_topic_resolution origin_refs is required non-empty',
    );
  });
});

describe('BUG-225: result_hash basis documented', () => {
  it('shared-schemas.md documents sha256(stableStringify(result)) as the basis', () => {
    assert.ok(
      schemas.includes('sha256(stableStringify(result))') && schemas.includes('work-unit-utils.mjs'),
      'shared-schemas must document the result_hash basis and its source of record',
    );
  });
});

describe('BUG-231: run-scoped script location sanctioned across surfaces', () => {
  it('harness README runtime boundary names _scripts/ and the write rule', () => {
    assert.ok(
      readme.includes('`_scripts/`') && readme.includes('必须写入 current run bundle root 的 `_scripts/`'),
      'harness README must list _scripts/ and require run-scoped scripts there',
    );
  });
  it('BUNDLE_MAP template and instantiate playbook name _scripts/', () => {
    assert.ok(bundleMap.includes('_scripts/'), 'BUNDLE_MAP.md.tmpl must list _scripts/');
    assert.ok(playbook.includes('_scripts/'), 'instantiate-run-bundle.md playbook must name _scripts/');
  });
  it('root AGENTS.md and CLAUDE.md carry the identical hard rule', () => {
    const rule = '必须写入 current run bundle root 的 `_scripts/`';
    assert.ok(agents.includes(rule), 'AGENTS.md must carry the run-scoped script hard rule');
    assert.ok(claude.includes(rule), 'CLAUDE.md must carry the run-scoped script hard rule');
    const ruleLine = (text) => text.split('\n').find((line) => line.includes('Run-scoped helper scripts'));
    assert.equal(ruleLine(agents), ruleLine(claude), 'AGENTS.md and CLAUDE.md hard-rule lines must be identical');
  });
  it('gitignore masking patch patterns are removed', () => {
    assert.ok(!gitignore.includes('/.gen-*.mjs'), 'gitignore must not mask repo-root generator scripts');
    assert.ok(!gitignore.includes('/.wu*-*.mjs'), 'gitignore must not mask repo-root executor scripts');
  });
});
