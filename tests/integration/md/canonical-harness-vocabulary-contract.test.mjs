// @impl RUE-002, RUE-004, SWE-004

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const read = (relativePath) => readFileSync(`${ROOT}/${relativePath}`, 'utf8');

const setup = read('SETUP.md');
const runEntry = read('openspec/specs/run-entry/spec.md');
const silentExecution = read('openspec/specs/silent-wave-execution/spec.md');
const queueLifecycle = read('DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs');
const experimentPlaybooks = [
  'experiments_playbook/exp_gate-fork/case-11-light-four-returns.md',
  'experiments_playbook/exp_gate-fork/case-12-standard-repair-retry.md',
  'experiments_playbook/exp_gate-fork/case-13-standard-full-pipeline.md',
  'experiments_playbook/exp_gate-loop/case-21-light-three-returns.md',
  'experiments_playbook/exp_gate-loop/case-22-standard-repair-loop.md',
  'experiments_playbook/exp_gate-loop/case-23-standard-full-pipeline.md',
].map(read);

describe('canonical Deep Research Harness vocabulary', () => {
  it('keeps setup and accepted entry wording aligned with the Harness', () => {
    assert.match(setup, /Deep Research Harness itself is ready/);
    assert.match(setup, /full research run through the Deep Research Harness/);
    assert.equal((runEntry.match(/Deep Research Harness entry/g) ?? []).length, 2);
    assert.equal((runEntry.match(/Deep Research Harness execution path/g) ?? []).length, 5);
  });

  it('keeps authority and runtime truth scoped to their canonical owners', () => {
    assert.match(silentExecution, /outside Deep Research Harness authority/);
    assert.match(silentExecution, /runtime truth in the current run bundle/);
  });

  it('uses run-bundle wording in queue documentation and selected playbooks', () => {
    assert.equal((queueLifecycle.match(/path to the run bundle/g) ?? []).length, 2);

    for (const playbook of experimentPlaybooks) {
      assert.match(playbook, /创建 run bundle，validate \+ inspect/);
    }
  });
});
