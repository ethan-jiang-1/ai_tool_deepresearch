// @impl DEW-022, DEW-023, DEW-024, CHI-004

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { claimWorkUnits } from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import {
  availableActorDecision,
  cleanupWorkUnitBundle,
  delegatedQueueItem,
  seedDelegatedQueue,
  tempWorkUnitBundle,
} from '../../engine/work-unit-test-helpers.mjs';

const read = (relativePath) => readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8');

const publicRecoveryRequirements = Object.freeze([
  {
    id: 'supersede caller',
    pattern: /operate-work-unit\.mjs supersede[^\n`]*<bundle[^\n`]*--work-id[^\n`]*--reason/i,
  },
  {
    id: 'recover-transaction caller',
    pattern: /operate-work-unit\.mjs recover-transaction[^\n`]*<bundle[^\n`]*--tx-id/i,
  },
  {
    id: 'recover-declaration caller',
    pattern: /operate-work-unit\.mjs recover-declaration[^\n`]*<bundle[^\n`]*--work-id/i,
  },
  {
    id: 'busy and suspect roots',
    pattern: /`busy`[\s\S]{0,1800}`suspect_transaction`|`suspect_transaction`[\s\S]{0,1800}`busy`/i,
  },
  {
    id: 'caller and holder coordinates',
    pattern: /caller[\s\S]{0,350}holder[\s\S]{0,500}(?:work\/queue|work[^\n.]{0,100}queue)|holder[\s\S]{0,350}caller[\s\S]{0,500}(?:work\/queue|work[^\n.]{0,100}queue)/i,
  },
  {
    id: 'same-checkpoint rerun',
    pattern: /rerun[\s\S]{0,240}(?:same|preserved|original)[\s\S]{0,200}(?:checkpoint|inspect\/Gate|inspect, dry-submit)|(?:same|preserved|original)[\s\S]{0,240}(?:checkpoint|inspect\/Gate)[\s\S]{0,200}rerun/i,
  },
  {
    id: 'declaration recovery precedence',
    pattern: /recover-declaration[\s\S]{0,500}(?:precede|precedence|takes precedence|sole nearest)[\s\S]{0,250}supersede/i,
  },
  {
    id: 'successor coordinate',
    pattern: /successor_queue_item_id/,
  },
  {
    id: 'manual authority-edit boundary',
    pattern: /(?:never|do not)[^\n]{0,60}(?:manually |by hand-?)?edit[^\n]{0,260}(?:ledger|rb_output_declarations)[^\n]{0,260}(?:queue|lock|journal)[^\n]{0,220}(?:hash|result_hash|ledger_record_hash)/i,
  },
  {
    id: 'physical actor and liveness boundary',
    pattern: /(?:does not|do not|without|not)[^\n.]{0,180}(?:physical actor|physical writer)[^\n.]{0,180}liveness|(?:does not|do not|without|not)[^\n.]{0,180}liveness[^\n.]{0,180}(?:physical actor|physical writer)/i,
  },
]);

function guidanceFindings(content) {
  return publicRecoveryRequirements
    .filter(({ pattern }) => !pattern.test(content))
    .map(({ id }) => id);
}

function assertPublicRecoveryGuidance(content, label) {
  assert.deepEqual(guidanceFindings(content), [], `${label} has incomplete attempt-recovery guidance`);
}

function removeAllMatches(content, pattern) {
  let mutated = content;
  let removed = 0;
  for (let index = 0; index < 50; index += 1) {
    const match = pattern.exec(mutated);
    if (!match) break;
    mutated = `${mutated.slice(0, match.index)}<removed>${mutated.slice(match.index + match[0].length)}`;
    removed += 1;
  }
  assert.ok(removed > 0, `validator fixture does not contain ${pattern}`);
  return mutated;
}

const publicSurfaces = Object.freeze([
  ['RUN.md', 'DEEP_RESEARCH_HARNESS/RUN.md'],
  ['COMMANDS.md', 'DEEP_RESEARCH_HARNESS/COMMANDS.md'],
  ['cli/README.md', 'DEEP_RESEARCH_HARNESS/cli/README.md'],
  ['shared-subagent-protocol.md', 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md'],
  ['provenance-forensics-guide.md', 'DEEP_RESEARCH_HARNESS/command_playbook/provenance-forensics-guide.md'],
]);

const phaseSurfaces = Object.freeze([
  ['Wave0', 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md'],
  ['Wave1', 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md'],
  ['Wave2', 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md'],
]);

describe('work-unit attempt-recovery Agent-facing guidance', () => {
  it('keeps Wave0 fan-out target-exclusive while preserving serial contribution handoff', () => {
    const wave0 = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md');
    const shared = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md');

    assert.match(wave0, /exactly one standard delegated demand for each new Topic/i);
    assert.match(wave0, /research dimensions[\s\S]{0,240}combined[\s\S]{0,180}serial supplements/i);
    assert.match(wave0, /Different exact `source_yaml` targets remain eligible for normal bounded fan-out/i);
    assert.match(wave0, /wave0_source_target_conflict[\s\S]{0,600}named owner[\s\S]{0,500}(?:--count 1|reduced conflict-free count)/i);
    assert.match(wave0, /strict append[\s\S]{0,180}<work_id>\/<global ordinal>/i);
    assert.match(wave0, /user direction does not manufacture target independence/i);

    assert.match(shared, /Wave0[\s\S]{0,180}pairwise-distinct exact `source_yaml` targets/i);
    assert.match(shared, /Different Topic targets remain batchable/i);
    assert.match(shared, /same-target demands[\s\S]{0,220}serial supplement/i);
    assert.match(shared, /wave0_source_target_conflict[\s\S]{0,500}same-claim `rerun`/i);
    assert.match(shared, /Do not[^\n]*seek user permission to create concurrent same-target writers/i);
  });

  it('wires every public operation to exact coordinates and a same-checkpoint rerun', () => {
    for (const [label, relativePath] of publicSurfaces) {
      assertPublicRecoveryGuidance(read(relativePath), label);
    }
  });

  it('fails when a caller, coordinate, rerun, or safety boundary is removed', () => {
    const commands = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');
    assertPublicRecoveryGuidance(commands, 'validator baseline');
    for (const requirement of publicRecoveryRequirements) {
      const mutated = removeAllMatches(commands, requirement.pattern);
      assert.ok(
        guidanceFindings(mutated).includes(requirement.id),
        `validator accepted a missing ${requirement.id}`,
      );
    }
  });

  it('keeps every Phase loop on the same logical actor and recovery boundary', () => {
    for (const [label, relativePath] of phaseSurfaces) {
      const content = read(relativePath);
      assert.match(content, /actor_execution[\s\S]{0,120}work_id[\s\S]{0,120}receipt_nonce/i, label);
      assert.match(content, /delegated_subagent[\s\S]{0,220}must not author substitute content under that binding/i, label);
      assert.match(content, /phase_agent_fallback[\s\S]{0,120}exact fallback attempt/i, label);
      assert.match(content, /busy[\s\S]{0,600}suspect_transaction/i, label);
      assert.match(content, /recover-transaction <bundle> --tx-id <id>/, label);
      assert.match(content, /recover-declaration[\s\S]{0,180}precedence over `supersede`/i, label);
      assert.match(content, /supersede <bundle> --work-id <submitted_id> --reason <audit-reason>/, label);
      assert.match(content, /successor_queue_item_id[\s\S]{0,220}same inspect\/Gate rerun/i, label);
      assert.match(content, /not physical actor authentication or host\/sub-agent liveness proof/i, label);
      assert.match(content, /Do not reactivate the predecessor or manually edit ledger\/index\/status\/queue\/lock\/journal\/hash authority/i, label);
    }
  });

  it('delivers the actor binding and control-plane handoff in generated task guidance', () => {
    const bundleDir = tempWorkUnitBundle('wu-attempt-guidance-');
    try {
      seedDelegatedQueue(bundleDir, [delegatedQueueItem('attempt-guidance', {
        phase: 'wave0',
        kind: 'wave0_source_intake',
      })]);
      const claim = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      assert.equal(claim.claimed_count, 1);
      const prompt = claim.prompt_refs[0];
      const task = readFileSync(path.join(bundleDir, prompt.task_ref), 'utf8');

      assert.match(task, /Logical actor route: `delegated_subagent`/);
      assert.match(task, /exact attempt: work_id[^\n]+receipt_nonce/);
      assert.match(task, /Assigned candidate coordinate:[^\n]+assigned receipt coordinate:/);
      assert.match(task, /must not author substitute content under this binding/i);
      assert.match(task, /does not authenticate a physical writer or prove host\/sub-agent liveness/i);
      assert.match(task, /`busy`, `suspect_transaction`, `recover-declaration`, or `supersede` feedback to the Phase Agent/);
      assert.match(task, /does not edit ledger\/index\/status\/queue\/lock\/journal\/hash authority or create a successor/);
      assert.match(prompt.spawn_prompt, /Only this delegated route authors candidate content/);
      assert.match(prompt.spawn_prompt, /not physical actor authentication or liveness proof/i);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('keeps setup guidance from creating a physical-actor or authority-edit claim', () => {
    const setup = read('DEEP_RESEARCH_HARNESS/command_playbook/setup-real-subagents.md');
    assert.match(setup, /actor_execution[\s\S]{0,100}work_id[\s\S]{0,100}receipt_nonce/i);
    assert.match(setup, /must not author substitute content under that same delegated binding/i);
    assert.match(setup, /does not authenticate a physical writer, prove host\/sub-agent liveness/i);
    assert.match(setup, /busy[\s\S]{0,100}suspect_transaction[\s\S]{0,180}Phase Agent/i);
    assert.match(setup, /never edits ledger, index, status, queue, lock, journal, or hash authority/i);
  });
});
