// @impl CDE-001, CDE-002, CDE-003

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { parse } from 'yaml';

import { ProfileSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs';

const PLAYBOOKS = [
  'experiments_playbook/exp_wff_delivery/case-131-standard-delivery-full-chain.md',
  'experiments_playbook/exp_wff_delivery/case-132-standard-hitl2-decision.md',
];
const CASE_136 = 'experiments_playbook/exp_extrem_slow/case-136-extreme-slow-final-composition.md';
const QUARANTINED_CASE_135 = 'experiments_playbook/exp_extrem_slow/case-135-extreme-slow-readiness-precheck.md';
const MANIFEST = 'experiments_playbook/PLAYBOOK_MANIFEST.md';

function source(path) {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
}

function heredocProfile(markdown, path) {
  const match = markdown.match(/cat > "\$B\/rb_profile\.yaml" <<'YAML'\n([\s\S]*?)\nYAML/);
  assert.ok(match, `${path} has a primary rb_profile.yaml fixture`);
  return parse(match[1]);
}

function activeManifestTable(markdown) {
  const match = markdown.match(/<!-- agent-experiment-manifest:v1 -->\n([\s\S]*?)<!-- \/agent-experiment-manifest -->/);
  assert.ok(match, 'manifest has an active machine table');
  return match[1];
}

describe('delivery playbook fixture profile contract', () => {
  it('uses current profile-readable research-access fixtures', () => {
    for (const path of PLAYBOOKS) ProfileSchema.parse(heredocProfile(source(path), path));

    const case136 = source(CASE_136);
    const match = case136.match(/const profile = parse\(`([\s\S]*?)`\);/);
    assert.ok(match, 'case-136 has its setup profile fixture');
    ProfileSchema.parse(parse(match[1]));
  });

  it('records case-132 fixture prerequisite and isolates rerun from the happy-path bundle', () => {
    const case132 = source(PLAYBOOKS[1]);
    assert.match(case132, /gate: 'wave2-complete',[\s\S]*?event\.gate === 'wave2-complete'/);
    assert.match(case132, /bundle_roles: \[verdict, rerun-probe\]/);
    assert.match(case132, /register-bundle --context \{\{RUN_CONTEXT_SH\}\} --role rerun-probe/);
    assert.match(case132, /for decision in request_view_revision repair stop_blocked;/);
    assert.match(case132, /--bundle "verdict=\$B" --bundle "rerun-probe=\$R"/);
    assert.doesNotMatch(case132, /cp -R "\$B\/\." "\$R\/"/);
  });

  it('keeps the active full-chain Wave1 fixture receipt-bound', () => {
    const case131 = source(PLAYBOOKS[0]);

    assert.match(case131, /import \{ selectWave1CarriedTargetReceipt \} from '\.\/DEEP_RESEARCH_HARNESS\/engine\/helpers\/wave-carried-target-receipts\.mjs';/);
    assert.match(case131, /Cannot create Wave1 fixture receipt/);
    assert.match(case131, /if \(gate === 'wave1-complete'\) \{\s+writeGateAttempt\(bundle, result, \{ carriedTargetReceipt: carriedTargetSelection\.receipt, strictTrace: true \}\);/);
  });

  it('quarantines the slow case-135 without keeping an active runner selection', () => {
    const case135 = source(QUARANTINED_CASE_135);
    const manifest = source(MANIFEST);

    assert.match(case135, /> \*\*QUARANTINED - EXTREME SLOW\.\*\*/);
    assert.match(case135, /b72332ea-b28c-4251-a8ea-86c76b95197d/);
    assert.match(case135, /70796213-e365-4c31-aaf5-34e6ed536db9/);
    assert.match(case135, /364791 ms/);
    assert.doesNotMatch(activeManifestTable(manifest), /case-135-(?:standard|extreme-slow)-readiness-precheck\.md/);
    assert.match(manifest, /- `exp_extrem_slow\/case-135-extreme-slow-readiness-precheck\.md`/);
  });
});
