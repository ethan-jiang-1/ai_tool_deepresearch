// @impl PHS-009, URC-004, PRP-016, STM-009, DEW-026, RWP-022, WAI-012, WTS-013,
// @impl CDP-007, POF-004, REI-007, VER-004

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const setup = read('experiments_env/shared/prepare-iterative-interaction-case.mjs');
const runner = read('experiments_env/shared/run-iterative-interaction-subject.mjs');
const observer = read('experiments_env/shared/observe-iterative-interaction-case.mjs');
const playbookPath = 'experiments_playbook/exp_iterative_interaction/case-717-heavy-multi-rerun-intent-carry-through.md';
const manifestPath = 'exp_iterative_interaction/case-717-heavy-multi-rerun-intent-carry-through.md';
const playbook = read(playbookPath);
const manifest = read('experiments_playbook/PLAYBOOK_MANIFEST.md');
const activeManifest = manifest.slice(
  manifest.indexOf('<!-- agent-experiment-manifest:v1 -->'),
  manifest.indexOf('<!-- /agent-experiment-manifest -->'),
);

describe('case 717 multi-rerun intent carry-through contract', () => {
  it('keeps setup at a legal baseline with no accepted revision semantics', () => {
    assert.match(setup, /function prepare717\(\)/);
    assert.match(setup, /buildHitl2Boundary\('717'\)/);
    assert.match(setup, /baseline_coordinate: 'rb_plan\.md## Constraints > ### User Research Controls'/);
    assert.match(setup, /accepted_revision_count: 0/);
    assert.match(setup, /subject_authored_semantics_absent: true/);
    assert.match(setup, /assert\.equal\(\/\^### Rerun intent revision:\/m\.test\(plan\), false\)/);
  });

  it('uses two fresh single-launch Subject contexts with bounded raw evidence', () => {
    for (const round of ['round1', 'round2']) {
      assert.match(runner, new RegExp(`'717-${round}': \\{`));
      assert.match(runner, new RegExp(`case-717-${round}-subject-transcript\\.jsonl`));
    }
    assert.match(runner, /case 717 round 1, distinct from the Playbook Agent/);
    assert.match(runner, /case 717 round 2, distinct from both the Playbook Agent and the prior Subject context/);
    assert.match(runner, /timeoutMs: 12 \* 60 \* 1000/);
    assert.match(runner, /Task,Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write/);
    assert.match(playbook, /aggregate hard cap of 24 minutes/);
    assert.match(playbook, /Launch exactly two fresh independently authenticated Subject contexts, once\s+each, with no retry/);
    assert.equal((playbook.match(/run-iterative-interaction-subject\.mjs 717-round1 --bundle/g) || []).length, 1);
    assert.equal((playbook.match(/run-iterative-interaction-subject\.mjs 717-round2 --bundle/g) || []).length, 1);
    assert.match(playbook, /byte-for-byte transcript/);
  });

  it('binds immutable history, newest intent, downstream use, contexts, and production routes', () => {
    for (const check of [
      'case-717-two-immutable-revisions',
      'case-717-newest-cumulative-intent',
      'case-717-current-intent-downstream',
      'case-717-independent-context-evidence',
      'case-717-production-routes',
    ]) {
      assert.match(observer, new RegExp(check));
      assert.match(playbook, new RegExp(check));
    }
    assert.match(observer, /round1Snapshot\?\.revision_1\?\.sha256 === older\.sha256/);
    assert.match(observer, /round1Result\.session_id !== round2Result\.session_id/);
    assert.match(observer, /Current active amendments relative to HITL1 baseline/);
    assert.match(observer, /## Current Intent Coverage/);
    assert.match(observer, /post_final_reentry/);
  });

  it('keeps unavailable, error, and native evidence outcomes honest', () => {
    assert.match(playbook, /retains no Subject result is dependency unavailability/);
    assert.match(playbook, /Once a Subject result exists, a non-zero launch, timeout, malformed\s+workflow, or semantic failure remains `ERROR`/);
    assert.match(playbook, /--not-run-reason/);
    for (const role of [
      'round1_subject_prompt',
      'round1_subject_transcript',
      'round1_subject_result',
      'round1_observation',
      'round2_subject_prompt',
      'round2_subject_transcript',
      'round2_subject_result',
    ]) assert.match(playbook, new RegExp(`--evidence "${role}=`));
    assert.match(playbook, /PASS does not prove generic interpretation quality, research quality, or\s+genuine user satisfaction/);
  });

  it('registers the active playbook exactly once', () => {
    assert.equal(activeManifest.split(manifestPath).length - 1, 1);
  });
});
