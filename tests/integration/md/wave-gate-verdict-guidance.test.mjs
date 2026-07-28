// @impl RWG-021
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const PHASES = ['wave0', 'wave1', 'wave2'];

describe('Wave Gate verdict handoff guidance', () => {
  for (const wave of PHASES) {
    it(`requires ${wave} to inspect degradation before consuming check.next`, () => {
      const text = readFileSync(`DPT_FRAMEWORK/workflows/nodes/phases/phase-${wave}.md`, 'utf8');
      const section = text.match(/## 6\. On Gate Pass\n\n([\s\S]*?)(?=\n## 7\.|$)/)?.[1] || '';
      const degradedIndex = section.indexOf('check.degraded');
      const nextIndex = section.indexOf('check.next');

      assert.notEqual(degradedIndex, -1, `${wave} must read check.degraded`);
      assert.notEqual(nextIndex, -1, `${wave} must consume check.next`);
      assert.ok(degradedIndex < nextIndex, `${wave} must read degradation before check.next`);
      assert.match(section, /carried quality debt/i);
      assert.match(section, /rather than treating this as a clean quality pass/i);
      assert.doesNotMatch(section, /ask (?:the )?user|user interaction|choose (?:a|an) option/i);
    });
  }
});
