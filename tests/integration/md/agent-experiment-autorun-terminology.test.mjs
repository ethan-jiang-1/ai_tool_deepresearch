// @impl EXA-001, EXA-002, EXA-008, PLR-001, VER-006
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parsePlaybookManifest, readAndValidateManifest } from '../../../DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs';

const GLOSSARY = [
  'Agent Experiment Autorun',
  'Autorun Supervisor',
  'Agent CLI Launcher',
  'Headless Playbook Agent',
  'Interactive Playbook Agent',
  'Subject Agent/Sub-agent',
];

const read = (file) => readFileSync(file, 'utf8');
const RETIRED_SURFACES = [
  ['RUN', 'CLI', 'EXPS.md'].join('_'),
  ['RUN', 'TUI', 'EXPS.md'].join('_'),
  ['run', 'experiment.mjs'].join('-'),
];
const RETIRED_PATHS = [
  `experiments_playbook/${RETIRED_SURFACES[0]}`,
  `experiments_playbook/${RETIRED_SURFACES[1]}`,
  `DPT_FRAMEWORK/host_tools/${RETIRED_SURFACES[2]}`,
];
const STATIC_KNOWLEDGE_SURFACES = [
  'openspec/config.yaml',
  'guidelines/command-experiments.md',
  'experiments_playbook/README.md',
  'DPT_FRAMEWORK/host_tools/README.md',
];
const ACTIVE_DELTA_SPECS_ROOT = 'openspec/changes/experiment-auto-runner/specs';
const SPEC_SENTINELS = {
  'agent-testing': 'native completion',
  'agentic-queue': 'native completion',
  'experiment-agent-autorun': 'Agent Experiment Autorun',
  'experiment-observability': 'Agent Experiment Autorun',
  'local-deepseek-claude-launcher': 'Agent Experiment Autorun',
  'playbook-runner': 'Agent Experiment Autorun',
  'pre-research-experiments': 'native completion',
  'pre-research-gate-implementation': 'native completion',
  'research-wave-experiments': 'native completion',
  'research-wave-gate-implementation': 'native completion',
  'seed-topic-materialization': 'native completion',
  'trace-writer': 'native completion',
  'verification-routing': 'Agent Experiment Autorun',
};

function testSources(path = 'tests') {
  const files = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) files.push(...testSources(child));
    else if (entry.isFile() && entry.name.endsWith('.mjs')) files.push(child);
  }
  return files;
}

function capabilitySpecPath(capability, activeDeltaSpecsRoot = ACTIVE_DELTA_SPECS_ROOT) {
  const deltaPath = `${activeDeltaSpecsRoot}/${capability}/spec.md`;
  return existsSync(deltaPath) ? deltaPath : `openspec/specs/${capability}/spec.md`;
}

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

  it('keeps config, guidance, and README knowledge surfaces on the canonical Autorun vocabulary', () => {
    for (const path of STATIC_KNOWLEDGE_SURFACES) {
      const content = read(path);
      assert.match(content, /Agent Experiment Autorun/, `${path} must identify the capability`);
      assert.match(content, /Autorun Supervisor/, `${path} must distinguish the deterministic host`);
    }
  });

  it('follows active delta specs before archive and matching main specs after archive', () => {
    for (const [capability, sentinel] of Object.entries(SPEC_SENTINELS)) {
      const path = capabilitySpecPath(capability);
      const activeDeltaPath = `${ACTIVE_DELTA_SPECS_ROOT}/${capability}/spec.md`;
      const expectedPath = existsSync(activeDeltaPath)
        ? activeDeltaPath
        : `openspec/specs/${capability}/spec.md`;
      assert.equal(path, expectedPath);
      assert.match(read(path), new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${capability} must retain its terminology anchor`);
    }

    const archivedPath = capabilitySpecPath('agent-testing', 'openspec/changes/archived-experiment-auto-runner/specs');
    assert.equal(archivedPath, 'openspec/specs/agent-testing/spec.md');
  });

  it('does not revive retired autorun instruction or host-entry names', () => {
    const surfaces = [
      'openspec/config.yaml',
      'guidelines/command-experiments.md',
      'experiments_playbook/README.md',
      'DPT_FRAMEWORK/host_tools/README.md',
      'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md',
      'experiments_playbook/RUN_INTERACTIVE_EXPS.md',
    ].map(read).join('\n');
    for (const retired of RETIRED_SURFACES) {
      assert.equal(surfaces.includes(retired), false, `active knowledge surfaces must not name ${retired}`);
    }
  });

  it('keeps one validated active manifest and no retired host or instruction file', () => {
    const declaredPaths = parsePlaybookManifest(read('experiments_playbook/PLAYBOOK_MANIFEST.md'));
    const validated = readAndValidateManifest({ repoRoot: process.cwd() });
    assert.equal(declaredPaths.length, 98);
    assert.deepEqual(validated.entries.map((entry) => entry.path), declaredPaths);
    assert.equal(existsSync('DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs'), true);
    assert.equal(existsSync('experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md'), true);
    assert.equal(existsSync('experiments_playbook/RUN_INTERACTIVE_EXPS.md'), true);
    for (const path of RETIRED_PATHS) assert.equal(existsSync(path), false, `${path} must be retired`);
  });

  it('keeps test sources free of retired autorun instruction and entry names', () => {
    for (const path of testSources()) {
      const content = read(path);
      for (const retired of RETIRED_SURFACES) {
        assert.equal(content.includes(retired), false, `${path} must not consume retired ${retired}`);
      }
    }
  });
});
