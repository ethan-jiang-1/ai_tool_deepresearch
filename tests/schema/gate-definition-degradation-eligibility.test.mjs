// @impl GSK-013
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseGateDefinition,
  readGateDefinitionSnapshot,
} from '../../DPT_FRAMEWORK/schema/contracts/gate-definition.mjs';

function definitionWith(rule) {
  return {
    gate: 'synthetic-gate',
    description: 'Synthetic degradation-eligibility fixture.',
    rules: [rule],
  };
}

function floorRule(overrides = {}) {
  return {
    id: 'quality_floor',
    check: 'count_floor',
    target: 'reference/*.md',
    failure_message: 'Quality floor is not met.',
    finding: {
      source: 'definition',
      blocking_basis: 'required_floor',
    },
    repair: {
      kind: 'agent_action',
      write_to: 'reference/',
    },
    ...overrides,
  };
}

function activeDefinition(filename) {
  return readGateDefinitionSnapshot(new URL(
    `../../DPT_FRAMEWORK/schema/gate_definitions/${filename}`,
    import.meta.url,
  )).definition;
}

describe('Gate definition degradation eligibility', () => {
  it('parses absent eligibility as false and preserves an explicit true', () => {
    const defaulted = parseGateDefinition(definitionWith(floorRule()));
    const explicit = parseGateDefinition(definitionWith(floorRule({ degradation_eligible: true })));

    assert.equal(defaulted.rules[0].degradation_eligible, false);
    assert.equal(explicit.rules[0].degradation_eligible, true);
  });

  it('keeps non-Wave definitions compatible through the common false default', () => {
    const definition = activeDefinition('gate-setup-ready.definition.json');
    assert.equal(definition.rules.every((rule) => rule.degradation_eligible === false), true);
  });
});
