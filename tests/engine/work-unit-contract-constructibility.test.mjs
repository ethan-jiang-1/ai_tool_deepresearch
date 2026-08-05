// @impl DEW-021

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ACTOR_OBSERVATION_CASES,
  ActorObservationContractProjectionSchema,
  actorObservationContractProjection,
  describeActorObservationInputIssues,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-actor.mjs';
import {
  describeDirectOutputAuthoringProjection,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs';
import {
  describeCacheLeafAuthoringProjection,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs';
import {
  deriveWorkUnitCandidateProjection,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-candidate-projection.mjs';

describe('DEW-021 delegated-work contract constructibility', () => {
  it('derives the exact seven legal observation tuples and structured malformed issues without choosing a probe result', () => {
    assert.equal(ACTOR_OBSERVATION_CASES.length, 4);
    const contract = actorObservationContractProjection('dpt-source-intake');
    assert.deepEqual(ActorObservationContractProjectionSchema.parse(contract), contract);
    assert.equal(contract.legal_tuples.length, 7);
    assert.deepEqual(contract.legal_tuples[0], {
      outcome: 'available',
      source: 'native_probe',
      reason_code: 'probe_succeeded',
      observation_case: 'normal_available',
    });

    const malformed = describeActorObservationInputIssues({
      outcome: 'available',
      source: 'not_observed',
      role_key: 'dpt-source-intake',
      reason_code: 'probe_succeeded',
    });
    assert.equal(malformed.valid, false);
    assert.ok(malformed.input_issues.some((issue) => issue.field === 'outcome/source/reason_code'));
    assert.equal(malformed.provided_observation.outcome, 'available');
  });

  it('projects validator-owned direct-output and cache authoring facts without creating a second contract', () => {
    const direct = describeDirectOutputAuthoringProjection('wave0.source-metadata-array.v1');
    assert.equal(direct.root_shape, 'yaml_top_level_array');
    assert.deepEqual(direct.required_fields, ['url', 'title', 'retrieved_date', 'topic_tag']);
    assert.deepEqual(direct.optional_fields, ['notes']);

    const cache = describeCacheLeafAuthoringProjection({ leaf_files: ['websearch.json', 'page.md', 'meta.json'] });
    assert.deepEqual(cache.required_leaves, ['websearch.json', 'page.md', 'meta.json']);
    assert.match(cache.page_rule, /non-placeholder|degraded/i);
    assert.deepEqual(cache.allowed_meta_mapping_fields, ['url', 'source_url', 'final_url', 'fetched_url', 'source_slug']);
  });

  it('exposes the selected root that owns recommended action and every public repair detail', () => {
    const derived = deriveWorkUnitCandidateProjection({
      workDone: false,
      violations: [
        {
          code: 'mechanical_declaration_missing',
          phase: 'output_files',
          repair_kind: 'agent_action',
          missing_fact: 'Declare the required output.',
          write_to: 'candidate#/output_files',
          rerun: 'dry-submit',
          scope_hint: 'mechanical',
        },
        {
          code: 'direct_target_missing',
          phase: 'direct_outputs',
          repair_kind: 'agent_action',
          missing_fact: 'Write the assigned direct output.',
          write_to: 'artifacts/wave0/topic-a/source.yaml',
          rerun: 'dry-submit',
          root_class: 'semantic_content',
          coordinate: 'artifacts/wave0/topic-a/source.yaml',
        },
      ],
    });

    assert.equal(derived.projection.recommended_action, 'return_to_actor');
    assert.equal(derived.projection.primary_root_code, 'direct_target_missing');
    assert.equal(derived.selected_primary.code, 'direct_target_missing');
    assert.equal(derived.selected_primary.write_to, 'artifacts/wave0/topic-a/source.yaml');
  });
});
