// @impl EXA-001, EXA-002, EXA-008, PLR-001, VER-006
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const GLOSSARY = [
  'Agent Experiment Autorun',
  'Autorun Supervisor',
  'Agent CLI Launcher',
  'Headless Playbook Agent',
  'Interactive Playbook Agent',
  'Subject Agent/Sub-agent',
];

const read = (file) => readFileSync(file, 'utf8');

describe('Agent Experiment Autorun terminology knowledge surfaces', () => {
  it('keeps the canonical glossary in the guideline and experiment entry README', () => {
    for (const file of [
      'guidelines/command-experiments.md',
      'experiments_playbook/README.md',
    ]) {
      const content = read(file);
      for (const term of GLOSSARY) {
        assert.match(content, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${file} must name ${term}`);
      }
    }
  });

  it('keeps host and Agent-facing surfaces within their actual roles', () => {
    const hostReadme = read('DPT_FRAMEWORK/host_tools/README.md');
    for (const term of ['Agent Experiment Autorun', 'Autorun Supervisor', 'Agent CLI Launcher', 'Headless Playbook Agent']) {
      assert.match(hostReadme, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    const headless = read('experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md');
    for (const term of ['Agent Experiment Autorun', 'Autorun Supervisor', 'Headless Playbook Agent', 'Subject Agent/Sub-agent']) {
      assert.match(headless, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    const interactive = read('experiments_playbook/RUN_INTERACTIVE_EXPS.md');
    for (const term of ['Agent Experiment Autorun', 'Interactive Playbook Agent', 'Subject Agent/Sub-agent']) {
      assert.match(interactive, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('keeps ordinary CI and deterministic fixtures outside Agent-flow proof authority', () => {
    assert.match(read('guidelines/command-experiments.md'), /Ordinary CI and `node:test` cannot execute `agent_flow_e2e` by themselves/);
    assert.match(read('experiments_playbook/README.md'), /Supervisor or `node:test` fixtures can prove host mechanics, but cannot substitute/);
    assert.match(read('DPT_FRAMEWORK/host_tools/README.md'), /`node:test`, CI, or test-owned Claude executable fixtures prove only Autorun Supervisor mechanics/);
    assert.match(read('openspec/config.yaml'), /普通 CI\/`node:test` fixture 只能证明 deterministic Supervisor mechanics/);
  });

  it('does not revive retired autorun instruction or host-entry names', () => {
    const surfaces = [
      'guidelines/command-experiments.md',
      'experiments_playbook/README.md',
      'DPT_FRAMEWORK/host_tools/README.md',
      'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md',
      'experiments_playbook/RUN_INTERACTIVE_EXPS.md',
    ].map(read).join('\n');
    for (const retired of ['RUN_CLI_EXPS.md', 'RUN_TUI_EXPS.md', 'run-experiment.mjs']) {
      assert.equal(surfaces.includes(retired), false, `active knowledge surfaces must not name ${retired}`);
    }
  });
});
