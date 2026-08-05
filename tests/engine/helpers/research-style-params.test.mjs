// @impl RES-001, RES-002

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ResearchStyleParamsSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/index.mjs';
import {
  buildResearchStyleApplyCommand,
  evaluateResearchStyleProjectionFreshness,
  readResearchStyleDefinition,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/research-style-projection.mjs';

const STYLE_ROOT = resolve('DEEP_RESEARCH_HARNESS/schema/research-styles');
const STYLE_NAMES = ['debug', 'quick_factual', 'exploratory_map', 'claim_verification'];

async function computation() {
  const module = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/research-style-params.mjs');
  assert.equal(typeof module.computeResearchStyleParams, 'function');
  return module.computeResearchStyleParams;
}

function loadStyle(name) {
  return JSON.parse(readFileSync(resolve(STYLE_ROOT, `${name}.json`), 'utf8'));
}

describe('computeResearchStyleParams', () => {
  for (const styleName of STYLE_NAMES) {
    it(`returns a complete schema-valid ${styleName} projection without mutating inputs`, async () => {
      const compute = await computation();
      const styleDefinition = loadStyle(styleName);
      const before = structuredClone(styleDefinition);
      const params = compute({ styleDefinition, topicCount: 3 });

      assert.deepEqual(Object.keys(params).sort(), Object.keys(ResearchStyleParamsSchema.parse(params)).sort());
      assert.equal(params.wave0_shared_ref_total, styleDefinition.wave0_shared_ref.base + styleDefinition.wave0_shared_ref.per_topic * 3);
      assert.deepEqual(styleDefinition, before);
    });
  }

  it('accepts zero topics and preserves the complete constant projection', async () => {
    const compute = await computation();
    const style = loadStyle('quick_factual');
    const params = compute({ styleDefinition: style, topicCount: 0 });
    assert.equal(params.wave0_shared_ref_total, style.wave0_shared_ref.base);
    assert.equal(Object.keys(params).length, 12);
  });

  it('fails closed for malformed definitions and invalid counts', async () => {
    const compute = await computation();
    const style = loadStyle('quick_factual');
    for (const topicCount of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, '2', null]) {
      assert.throws(() => compute({ styleDefinition: style, topicCount }));
    }
    for (const styleDefinition of [null, [], {}, { ...style, wave0_shared_ref: null }, { ...style, wave0_per_topic_source_floor: 0 }]) {
      assert.throws(() => compute({ styleDefinition, topicCount: 2 }));
    }
  });
});

describe('evaluateResearchStyleProjectionFreshness', () => {
  it('reuses the complete pure style computation for a fresh projection without mutating inputs', async () => {
    const compute = await computation();
    const styleDefinition = readResearchStyleDefinition('quick_factual');
    const params = compute({ styleDefinition, topicCount: 2 });
    const styleBefore = structuredClone(styleDefinition);
    const paramsBefore = structuredClone(params);

    const freshness = evaluateResearchStyleProjectionFreshness({
      selectedProfile: 'quick_factual',
      styleDefinition,
      topicCount: 2,
      researchStyleParams: params,
    });

    assert.equal(freshness.passed, true);
    assert.equal(freshness.state, 'fresh');
    assert.equal(freshness.topic_count, 2);
    assert.deepEqual(freshness.expected_params, params);
    assert.deepEqual(styleDefinition, styleBefore);
    assert.deepEqual(params, paramsBefore);
  });

  it('classifies absent and partial parameters without reading or writing a bundle', () => {
    const styleDefinition = readResearchStyleDefinition('quick_factual');
    const absent = evaluateResearchStyleProjectionFreshness({
      selectedProfile: 'quick_factual',
      styleDefinition,
      topicCount: 1,
      researchStyleParams: undefined,
    });
    const partial = evaluateResearchStyleProjectionFreshness({
      selectedProfile: 'quick_factual',
      styleDefinition,
      topicCount: 1,
      researchStyleParams: { wave0_shared_ref_total: 1 },
    });

    assert.deepEqual({ passed: absent.passed, state: absent.state }, { passed: false, state: 'absent' });
    assert.ok(absent.missing_fields.includes('wave0_shared_ref_total'));
    assert.deepEqual({ passed: partial.passed, state: partial.state }, { passed: false, state: 'partial' });
    assert.ok(partial.missing_fields.includes('wave0_per_topic_source_floor'));
  });

  it('classifies stale or wrong-profile complete parameters and returns the one existing writer command', async () => {
    const compute = await computation();
    const wrongProfileParams = compute({
      styleDefinition: readResearchStyleDefinition('claim_verification'),
      topicCount: 3,
    });
    const freshness = evaluateResearchStyleProjectionFreshness({
      selectedProfile: 'quick_factual',
      styleDefinition: readResearchStyleDefinition('quick_factual'),
      topicCount: 3,
      researchStyleParams: wrongProfileParams,
    });
    const command = buildResearchStyleApplyCommand({
      bundlePath: '/tmp/style projection bundle',
      selectedProfile: 'quick_factual',
    });

    assert.deepEqual({ passed: freshness.passed, state: freshness.state }, { passed: false, state: 'stale_or_wrong_profile' });
    assert.ok(freshness.differing_fields.length > 0);
    assert.match(command, /^node DEEP_RESEARCH_HARNESS\/cli\/apply-research-style\.mjs --bundle /);
    assert.match(command, /--style quick_factual$/);
  });
});
