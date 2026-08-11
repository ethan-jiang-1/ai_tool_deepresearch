// @impl REA-001, REA-002, REA-003
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SELECTED_RESEARCH_ACCESS_ADAPTER,
  buildSelectedResearchAccessAdapterInvocation,
  callerSuppliedPermissionBypass,
  readSelectedResearchAccessAdapterContract,
  selectedAdapterBoundaryFact,
  validateSelectedAdapterSameUrlBinding,
} from '../../DEEP_RESEARCH_HARNESS/host_tools/lib/research-access-adapter.mjs';

describe('selected research-access adapter', () => {
  it('reads the one selected generic non-bypass declaration', () => {
    const contract = readSelectedResearchAccessAdapterContract();

    assert.equal(contract.adapter_id, SELECTED_RESEARCH_ACCESS_ADAPTER.id);
    assert.equal(contract.launcher.entry, 'DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs');
    assert.equal(contract.launcher.routing, 'deepseek_anthropic_compatible');
    assert.equal(contract.launcher.permission_mode, 'generic_non_bypass');
    assert.equal(contract.operations.search.surface, 'WebSearch');
    assert.equal(contract.operations.fetch.surface, 'WebFetch');
  });

  it('fails closed when fetch or result URL differs from the selected returned candidate', () => {
    const binding = validateSelectedAdapterSameUrlBinding({
      candidateUrl: 'https://example.com/returned',
      fetchTargetUrl: 'https://example.net/invented',
      resultUrl: 'https://example.com/returned',
    });

    assert.deepEqual(binding, {
      same_url_bound: false,
      code: 'same_url_mismatch',
      provider_availability_proven: false,
    });
  });

  it('fails closed when search supplied no eligible candidate', () => {
    const binding = validateSelectedAdapterSameUrlBinding({
      candidateUrl: 'not a URL',
      fetchTargetUrl: 'https://example.com/returned',
      resultUrl: 'https://example.com/returned',
    });

    assert.deepEqual(binding, {
      same_url_bound: false,
      code: 'no_eligible_candidate',
      provider_availability_proven: false,
    });
  });

  it('maps each boundary location to one owner and derives repair kind without reason prose', () => {
    const expected = new Map([
      ['host_surface', ['selected Claude CLI host runtime', 'external', 'external_action']],
      ['host_policy', ['selected Claude CLI host policy', 'external', 'external_action']],
      ['network_path', ['network environment', 'external', 'external_action']],
      ['probe_relay', ['Agent', 'agent', 'agent_action']],
    ]);

    for (const [location, [owner, actor, repairKind]] of expected) {
      const fact = selectedAdapterBoundaryFact(location);
      assert.equal(fact.location, location);
      assert.equal(fact.owner, owner);
      assert.equal(fact.actor, actor);
      assert.equal(fact.repair_kind, repairKind);
      assert.ok(fact.repair.includes('same bounded probe'));
    }

    assert.equal(selectedAdapterBoundaryFact('permission_required'), null);
    assert.equal(selectedAdapterBoundaryFact('network_error: temporary upstream failure'), null);
  });

  it('rejects caller-supplied permission bypass options for the selected invocation', () => {
    assert.deepEqual(callerSuppliedPermissionBypass(['-p', 'probe', '--permission-mode', 'bypassPermissions']), {
      option: '--permission-mode bypassPermissions',
      index: 2,
    });
    assert.throws(() => buildSelectedResearchAccessAdapterInvocation({
      launcherPath: '/tmp/claude-deepseek.mjs',
      claudeArgs: ['--dangerously-skip-permissions', '-p', 'probe'],
    }), /rejects caller-supplied permission bypass/);
  });

  it('does not turn a deterministic same-URL success into provider availability evidence', () => {
    const binding = validateSelectedAdapterSameUrlBinding({
      candidateUrl: 'https://example.com/returned',
      fetchTargetUrl: 'https://example.com/returned',
      resultUrl: 'https://example.com/returned',
    });

    assert.equal(binding.same_url_bound, true);
    assert.equal(binding.provider_availability_proven, false);
  });
});
