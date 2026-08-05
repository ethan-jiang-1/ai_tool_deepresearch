import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = join(import.meta.dirname, '../../..');

const TARGETS = [
  'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-repair-guidance.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-gate-rules.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md',
  'DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave0-complete.definition.json',
  'DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave1-complete.definition.json',
  'DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave2-complete.definition.json',
  'DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs',
  'DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs',
  'DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs',
];

const FORBIDDEN_POSITIVE_ADVICE = [
  /skip (?:the )?(?:gate|phase|required phase)/i,
  /bypass (?:the )?(?:gate|phase|required phase)/i,
  /edit rb_status\.json by hand/i,
  /hand[- ]?edit rb_status\.json(?! or rb_output_declarations\.jsonl)/i,
  /set `?rb_status\.json`?.*state\s*(?:→|to)\s*`?blocked`?/i,
  /surface to the user/i,
  /ask the user/i,
  /write `?final\//i,
  /premature chat synthesis/i,
];

const ALLOWED_NEGATIONS = [
  /do not/i,
  /don't/i,
  /must not/i,
  /shall not/i,
  /not authorize/i,
  /prohibited/i,
  /禁止/,
  /不得/,
  /不要/,
  /不能/,
  /not an emergency/i,
  /does not authorize/i,
];

function contextFor(text, index, length) {
  return text.slice(Math.max(0, index - 90), Math.min(text.length, index + length + 90));
}

function isAllowed(context) {
  return ALLOWED_NEGATIONS.some((pattern) => pattern.test(context));
}

describe('RWG-016 gate guidance does not advise phase bypass or surfacing', () => {
  for (const rel of TARGETS) {
    it(`${rel} keeps repair advice phase-bound and silent`, () => {
      const text = readFileSync(join(REPO_ROOT, rel), 'utf-8');
      const violations = [];
      for (const pattern of FORBIDDEN_POSITIVE_ADVICE) {
        const regex = new RegExp(pattern.source, pattern.flags.includes('i') ? 'gi' : 'g');
        for (const match of text.matchAll(regex)) {
          const context = contextFor(text, match.index ?? 0, match[0].length);
          if (!isAllowed(context)) violations.push(`${match[0]} :: ${context}`);
        }
      }
      assert.deepEqual(violations, []);
    });
  }
});

describe('SWE silent execution degraded handoff guidance', () => {
  it('requires legal degraded handoff or silent hold without final shortcut', () => {
    const text = readFileSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md'), 'utf-8');
    assert.match(text, /check\.degraded: true/);
    assert.match(text, /check\.next/);
    assert.match(text, /enter-phase\.mjs --bundle <path> --node <check\.next>/);
    assert.match(text, /advance-status --to <source_gate_enum>/);
    assert.match(text, /Silent hold/i);
    assert.match(text, /not a clean quality pass/i);
    assert.match(text, /do not.*write `final\/` early|cannot.*final|不能提前写 `final\//i);
  });
});
