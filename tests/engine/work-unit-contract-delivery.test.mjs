// @impl DEW-009

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  describeDirectOutputContract,
  directOutputContractIds,
  evaluateDirectOutputTarget,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs';
import {
  resolveWorkUnitRoleGuidanceForTest,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/work-unit-role-guidance.mjs';

function temporaryFrameworkRoot() {
  return mkdtempSync(path.join(os.tmpdir(), 'work-unit-role-guidance-'));
}

function writeNode(frameworkRoot, ref, frontmatter) {
  const absolute = path.join(frameworkRoot, ref);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `---\n${frontmatter}\n---\n\nTest guidance.\n`);
  return absolute;
}

function createRoleFixture(frameworkRoot, { requires = ['shared/shared-page-fetch-guidance', 'shared/shared-protocol'] } = {}) {
  const roleRef = 'workflows/nodes/phases/subagent-dpt-evidence-extractor.md';
  const roleFrontmatter = [
    'id: dpt-evidence-extractor',
    'requires:',
    ...requires.map((entry) => `  - ${entry}`),
  ].join('\n');
  const sharedRef = 'workflows/nodes/shared/shared-page-fetch-guidance.md';
  const protocolRef = 'workflows/nodes/shared/shared-protocol.md';
  writeNode(frameworkRoot, roleRef, roleFrontmatter);
  writeNode(frameworkRoot, sharedRef, [
    'id: shared-page-fetch-guidance',
    'shared_scope: subagent-fetch',
    'authority: guidance-only',
    'actor_delivery: required',
  ].join('\n'));
  writeNode(frameworkRoot, protocolRef, [
    'id: shared-protocol',
    'shared_scope: protocol',
    'authority: guidance-only',
  ].join('\n'));
  return { roleRef, sharedRef };
}

function roleInput(overrides = {}) {
  return {
    kind: 'wave1_topic_deepening',
    delegated_role_key: 'dpt-evidence-extractor',
    actor_policy: { delegated_role_key: 'dpt-evidence-extractor', phase_agent_fallback: 'allowed' },
    ...overrides,
  };
}

describe('work-unit contract delivery owners', () => {
  it('derives one contained role and only its actor-delivered direct shared guidance from a temporary framework root', () => {
    const frameworkRoot = temporaryFrameworkRoot();
    try {
      const { roleRef, sharedRef } = createRoleFixture(frameworkRoot);
      const projection = resolveWorkUnitRoleGuidanceForTest(roleInput(), { frameworkRoot });
      const resolvedRoot = realpathSync(frameworkRoot);

      assert.equal(projection.role_key, 'dpt-evidence-extractor');
      assert.equal(projection.role_ref, roleRef);
      assert.equal(projection.role_path, path.join(resolvedRoot, roleRef));
      assert.deepEqual(projection.shared_guidance_refs, [{
        id: 'shared-page-fetch-guidance',
        shared_scope: 'subagent-fetch',
        ref: sharedRef,
        path: path.join(resolvedRoot, sharedRef),
      }]);
      assert.equal(Object.isFrozen(projection), true);
      assert.equal(Object.isFrozen(projection.shared_guidance_refs), true);
      assert.equal(Object.isFrozen(projection.shared_guidance_refs[0]), true);
      assert.throws(() => { projection.role_key = 'mutated'; }, TypeError);
    } finally {
      rmSync(frameworkRoot, { recursive: true, force: true });
    }
  });

  it('fails closed for policy mismatch, unknown or missing role, missing actor-delivered dependency, and escaping dependency refs without any bundle', () => {
    const frameworkRoot = temporaryFrameworkRoot();
    try {
      createRoleFixture(frameworkRoot);
      assert.throws(() => resolveWorkUnitRoleGuidanceForTest(roleInput({
        actor_policy: { delegated_role_key: 'dpt-source-intake', phase_agent_fallback: 'allowed' },
      }), { frameworkRoot }), /delegated role key/i);
      assert.throws(() => resolveWorkUnitRoleGuidanceForTest(roleInput({
        delegated_role_key: 'unknown-role',
        actor_policy: { delegated_role_key: 'unknown-role', phase_agent_fallback: 'allowed' },
      }), { frameworkRoot }), /role guidance/i);

      rmSync(path.join(frameworkRoot, 'workflows/nodes/phases/subagent-dpt-evidence-extractor.md'));
      assert.throws(() => resolveWorkUnitRoleGuidanceForTest(roleInput(), { frameworkRoot }), /role guidance/i);

      createRoleFixture(frameworkRoot, { requires: ['shared/shared-missing'] });
      assert.throws(() => resolveWorkUnitRoleGuidanceForTest(roleInput(), { frameworkRoot }), /shared guidance/i);

      createRoleFixture(frameworkRoot, { requires: ['../../outside'] });
      assert.throws(() => resolveWorkUnitRoleGuidanceForTest(roleInput(), { frameworkRoot }), /shared guidance/i);

      assert.equal(existsSync(path.join(frameworkRoot, '_work_units')), false);
      assert.equal(existsSync(path.join(frameworkRoot, 'rb_queue.json')), false);
    } finally {
      rmSync(frameworkRoot, { recursive: true, force: true });
    }
  });

  it('keeps every direct evaluator ID and immutable bounded actor descriptor in the same closed owner', () => {
    const ids = directOutputContractIds();
    assert.equal(Object.isFrozen(ids), true);
    assert.ok(ids.length > 0);
    for (const contractId of ids) {
      const descriptor = describeDirectOutputContract(contractId);
      assert.equal(Object.isFrozen(descriptor), true);
      assert.equal(typeof descriptor.purpose, 'string');
      assert.ok(descriptor.purpose.length > 0);
      assert.ok(Array.isArray(descriptor.minimum_structure));
      assert.equal(Object.isFrozen(descriptor.minimum_structure), true);
      assert.ok(descriptor.minimum_structure.length > 0);
      assert.equal(Object.hasOwn(descriptor, 'evaluator'), false);

      const bundleDir = mkdtempSync(path.join(os.tmpdir(), 'direct-contract-owner-'));
      try {
        const result = evaluateDirectOutputTarget({ bundleDir, target: 'missing-output', contractId });
        assert.equal(result.roots[0].code, 'direct_target_missing');
      } finally {
        rmSync(bundleDir, { recursive: true, force: true });
      }
    }
    assert.throws(() => describeDirectOutputContract('unknown.contract.v1'), /direct contract/i);
  });
});
