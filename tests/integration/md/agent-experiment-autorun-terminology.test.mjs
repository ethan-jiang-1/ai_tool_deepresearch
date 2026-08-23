// @impl ERS-001, ERS-002, ERS-003, EXA-001, EXA-002, EXA-008, EXA-009, EXO-007, PLR-001, PLR-004, VER-006
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parsePlaybookManifest, readAndValidateManifest } from '../../../DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs';

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
  `DEEP_RESEARCH_HARNESS/host_tools/${RETIRED_SURFACES[2]}`,
];
const STATIC_KNOWLEDGE_SURFACES = [
  'openspec/config.yaml',
  'openspec/operations/command-experiments.md',
  'experiments_playbook/README.md',
  'DEEP_RESEARCH_HARNESS/host_tools/README.md',
];
const SPEC_SENTINELS = {
  'agent/agent-testing': 'native completion',
  'agent/agentic-queue': 'native completion',
  'verification/experiment-agent-autorun': 'Autorun Supervisor',
  'verification/experiment-observability': 'Autorun',
  'agent/local-deepseek-claude-launcher': 'Agent Experiment Autorun',
  'workflow/playbook-runner': 'Autorun',
  'research/pre-research-experiments': 'native completion',
  'research/pre-research-gate-implementation': 'native completion',
  'research/research-wave-experiments': 'native completion',
  'research/research-wave-gate-implementation': 'native completion',
  'research/seed-topic-materialization': 'native completion',
  'engine/trace-writer': 'native completion',
  'verification/verification-routing': 'Agent Experiment Autorun',
};

function testSources(path = 'tests') {
  const files = [];
  let entries;
  try {
    entries = readdirSync(path, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      // Disposable runtime output dirs (.test-tmp/.test-bundles/.test-chain-tmp)
      // are not test sources; they are written and deleted concurrently by other
      // suites in the parallel run and must not be scanned.
      if (entry.name.startsWith('.test-')) continue;
      files.push(...testSources(child));
    } else if (entry.isFile() && entry.name.endsWith('.mjs')) files.push(child);
  }
  return files;
}

function activeDeltaSpecPaths(capability) {
  return readdirSync('openspec/changes', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => `openspec/changes/${entry.name}/specs/${capability}/spec.md`)
    .filter(existsSync)
    .sort();
}

function capabilitySpecPaths(capability, activeDeltaPaths = activeDeltaSpecPaths(capability)) {
  return activeDeltaPaths.length > 0 ? activeDeltaPaths : [`openspec/specs/${capability}/spec.md`];
}

describe('Agent Experiment Autorun terminology knowledge surfaces', () => {
  it('keeps the canonical glossary in the guideline and experiment entry README', () => {
    for (const file of [
      'openspec/operations/command-experiments.md',
      'experiments_playbook/README.md',
    ]) {
      const content = read(file);
      for (const term of GLOSSARY) {
        assert.match(content, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${file} must name ${term}`);
      }
    }
  });

  it('keeps host and Agent-facing surfaces within their actual roles', () => {
    const hostReadme = read('DEEP_RESEARCH_HARNESS/host_tools/README.md');
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
    assert.match(read('openspec/operations/command-experiments.md'), /Ordinary CI and `node:test` cannot execute `agent_flow_e2e` by themselves/);
    assert.match(read('experiments_playbook/README.md'), /Supervisor or `node:test` fixtures can prove host mechanics, but cannot substitute/);
    assert.match(read('DEEP_RESEARCH_HARNESS/host_tools/README.md'), /`node:test`, CI, or test-owned Claude executable fixtures prove only Autorun Supervisor mechanics/);
    assert.match(read('openspec/config.yaml'), /普通 CI\/`node:test` fixture 只能证明 deterministic Supervisor mechanics/);
  });

  it('keeps config, guidance, and README knowledge surfaces on the canonical Autorun vocabulary', () => {
    for (const path of STATIC_KNOWLEDGE_SURFACES) {
      const content = read(path);
      assert.match(content, /Agent Experiment Autorun/, `${path} must identify the capability`);
      assert.match(content, /Autorun Supervisor/, `${path} must distinguish the deterministic host`);
    }
  });

  it('follows every active delta spec before archive and matching main specs after archive', () => {
    for (const [capability, sentinel] of Object.entries(SPEC_SENTINELS)) {
      const paths = capabilitySpecPaths(capability);
      for (const path of paths) {
        assert.match(read(path), new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${capability} must retain its terminology anchor`);
      }
    }

    const archivedPaths = capabilitySpecPaths('agent/agent-testing', []);
    assert.deepEqual(archivedPaths, ['openspec/specs/agent/agent-testing/spec.md']);
  });

  it('documents virtual bounded run profiles without reviving filename-Light normal launch', () => {
    const surfaces = [
      'experiments_playbook/README.md',
      'DEEP_RESEARCH_HARNESS/host_tools/README.md',
      'experiments_playbook/PLAYBOOK_MANIFEST.md',
      'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md',
    ].map(read).join('\n');
    for (const profile of ['calibration', 'discovery', 'diagnostic', 'assurance', 'regression']) {
      assert.match(surfaces, new RegExp(profile));
    }
    assert.match(surfaces, /max-predicted-duration-ms/);
    assert.match(surfaces, /creation-time (?:cost )?estimate/);
    assert.match(surfaces, /health_profile/);
    assert.match(surfaces, /verification-plan\.yaml/);
    assert.match(surfaces, /regression-qualification/);
    assert.match(surfaces, /480000/);
    assert.match(surfaces, /regression_recommendation/);
    assert.match(surfaces, /Retained v1 history is human-readable\/diagnostic-only/);
    assert.match(surfaces, /current-v2 fast PASS\+CLEAN/);
    assert.doesNotMatch(surfaces, /No filter selects autorun-compatible Light cases/);
    assert.doesNotMatch(surfaces, /No filter defaults to autorun-compatible Light cases/);
    assert.doesNotMatch(surfaces, /source-matching historical(?: fast)? result/);
  });

  it('does not revive retired autorun instruction or host-entry names', () => {
    const surfaces = [
      'openspec/config.yaml',
      'openspec/operations/command-experiments.md',
      'experiments_playbook/README.md',
      'DEEP_RESEARCH_HARNESS/host_tools/README.md',
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
    assert.ok(declaredPaths.length > 0, 'the manifest must register at least one active playbook');
    assert.deepEqual(validated.entries.map((entry) => entry.path), declaredPaths);
    assert.equal(existsSync('DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs'), true);
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
