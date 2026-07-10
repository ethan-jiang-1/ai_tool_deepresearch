// @impl IOC-001, IOC-002, IOC-003, IOC-005, RWG-018
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FILES = [
  'DPT_FRAMEWORK/cli/inspect-wave0-output.mjs',
  'DPT_FRAMEWORK/cli/inspect-wave1-output.mjs',
  'DPT_FRAMEWORK/cli/inspect-wave2-output.mjs',
  'DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs',
];

const FORBIDDEN_DURABILITY_IDENTIFIERS = [
  'writeGateAttempt',
  'writeFileSync',
  'appendFileSync',
  'mkdirSync',
  'renameSync',
  'rmSync',
  'emitDelegatedBypassDiagnostic',
  'emitGateResult',
  'resolveRouting',
  'advanceStatus',
  'createTrace',
  'logToRun',
];

describe('wave inspect purity static guard', () => {
  for (const file of FILES) {
    it(`${file} does not own lifecycle durability`, () => {
      const content = readFileSync(file, 'utf8');
      for (const forbidden of FORBIDDEN_DURABILITY_IDENTIFIERS) {
        assert.equal(content.includes(forbidden), false, `${file} must not reference ${forbidden}`);
      }
      assert.doesNotMatch(content, /from ['"][^'"]*(?:checkpoint|routing|logger|trace\.mjs|advance-status)[^'"]*['"]/);
      assert.doesNotMatch(content, /from ['"][^'"]*cli\/gates\//);
      assert.doesNotMatch(content, /readYamlArraySafe\([^\n]+,\s*bundlePath\)/);
    });
  }

  it('shared evaluator imports the pure bypass scanner but not the formal emitter', () => {
    const content = readFileSync('DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs', 'utf8');
    assert.match(content, /scanDelegatedBypassSuspicion/);
    assert.doesNotMatch(content, /emitDelegatedBypassDiagnostic/);
  });
});
