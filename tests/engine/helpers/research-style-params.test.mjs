// @impl RES-001, RES-002

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ResearchStyleParamsSchema } from '../../../DPT_FRAMEWORK/schema/index.mjs';

const STYLE_ROOT = resolve('DPT_FRAMEWORK/schema/research-styles');
const STYLE_NAMES = ['debug', 'quick_factual', 'exploratory_map', 'claim_verification'];

async function computation() {
  const module = await import('../../../DPT_FRAMEWORK/engine/helpers/research-style-params.mjs');
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
