// @impl RUE-001, RUE-004, RUE-005, ACS-001, ACS-002, CMI-004, CMI-005, CMI-007, CMI-009, CSE-001, BUI-001, BUI-002, SWE-004, WDC-001

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const read = (relativePath) => readFileSync(`${ROOT}/${relativePath}`, 'utf8');

const harnessDocs = Object.fromEntries([
  ['agents', 'DEEP_RESEARCH_HARNESS/AGENTS.md'],
  ['claude', 'DEEP_RESEARCH_HARNESS/CLAUDE.md'],
  ['readme', 'DEEP_RESEARCH_HARNESS/README.md'],
  ['run', 'DEEP_RESEARCH_HARNESS/RUN.md'],
  ['workflows', 'DEEP_RESEARCH_HARNESS/workflows/README.md'],
  ['instantiate', 'DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md'],
  ['start', 'DEEP_RESEARCH_HARNESS/command_playbook/start-research.md'],
  ['provenance', 'DEEP_RESEARCH_HARNESS/command_playbook/provenance-forensics-guide.md'],
  ['roles', 'DEEP_RESEARCH_HARNESS/command_playbook/subagent_templates/roles.md'],
  ['subagents', 'DEEP_RESEARCH_HARNESS/command_playbook/setup-real-subagents.md'],
].map(([name, path]) => [name, read(path)]));

const specs = Object.fromEntries([
  ['runEntry', 'openspec/specs/bundle/run-entry/spec.md'],
  ['agentCommand', 'openspec/specs/agent/agent-command-surface/spec.md'],
  ['bundleInstantiation', 'openspec/specs/bundle/cmd-bundle-instantiation/spec.md'],
  ['subagentEnvironment', 'openspec/specs/agent/cmd-subagent-environment/spec.md'],
  ['bundleIsolation', 'openspec/specs/bundle/bundle-data-isolation/spec.md'],
  ['silentExecution', 'openspec/specs/workflow/silent-wave-execution/spec.md'],
  ['workflowDirectory', 'openspec/specs/workflow/workflow-directory-contract/spec.md'],
].map(([name, path]) => [name, read(path)]));

const localEntryDirective = (contents) => contents
  .slice(0, contents.indexOf('## Must Read'))
  .replace(/^# .*$/m, '# HOST.md')
  .replaceAll('Codex', 'HOST')
  .replaceAll('Claude Code', 'HOST');

describe('canonical Deep Research Harness vocabulary', () => {
  it('keeps paired Harness-local entry guidance equivalent', () => {
    assert.equal(
      localEntryDirective(harnessDocs.agents),
      localEntryDirective(harnessDocs.claude),
    );

    for (const contents of [harnessDocs.agents, harnessDocs.claude]) {
      assert.match(contents, /这个 Deep Research Harness/);
      assert.match(contents, /Deep Research Harness work/);
      assert.match(contents, /触发这个 Harness/);
    }

    assert.match(specs.runEntry, /Entry point announces Harness version/);
    assert.match(specs.runEntry, /Harness-local\s+directive language/);
    assert.match(specs.runEntry, /Entry trigger hands control to Agent-run Harness execution/);
  });

  it('distinguishes Harness assets from current run bundle runtime truth', () => {
    assert.match(harnessDocs.readme, /reusable Harness assets/);
    assert.match(harnessDocs.readme, /runtime truth 只来自 current run bundle root/);
    assert.match(harnessDocs.workflows, /read-only Harness assets/);
    assert.match(harnessDocs.provenance, /run bundle and Harness use the work-unit mechanism/);

    assert.match(specs.bundleIsolation, /never sharing them with other bundles or the Harness/);
    assert.match(specs.bundleIsolation, /`DEEP_RESEARCH_HARNESS\/` SHALL remain reusable Harness assets/);
    assert.match(specs.bundleIsolation, /Runtime output paths including .* SHALL resolve under the current run bundle root/s);
    assert.match(specs.workflowDirectory, /Read-only Harness assets boundary/);
    assert.match(specs.workflowDirectory, /only under the current run bundle root/);
  });

  it('names Agent-run Harness execution across entry and command surfaces', () => {
    assert.match(harnessDocs.run, /Agent-run Harness flow/);
    assert.match(harnessDocs.run, /Harness 不主动提问、确认、汇报进度或等待 acknowledgement/);
    assert.match(harnessDocs.instantiate, /Harness execution 开始前/);
    assert.match(harnessDocs.start, /Harness execution 开始前/);

    assert.match(specs.runEntry, /proceed with Harness execution/);
    assert.match(specs.runEntry, /only Harness-initiated points/);
    assert.match(specs.agentCommand, /Deep Research Harness command surfaces/);
    assert.match(specs.agentCommand, /Harness commands are invoked by the Phase Agent/);
    assert.match(specs.silentExecution, /\*\*Harness-initiated\*\*/);
  });

  it('names the Harness role taxonomy while retaining exact protocol identifiers', () => {
    assert.match(harnessDocs.roles, /^# Deep Research Harness Real Subagent Roles/m);
    assert.match(harnessDocs.subagents, /Deep Research Harness work-unit execution/);
    assert.match(harnessDocs.subagents, /You are a bounded Deep Research Harness subagent role/);
    assert.match(harnessDocs.subagents, /marker `DPT managed: real-subagent`/);

    for (const role of [
      'dpt-source-intake',
      'dpt-source-diagnostic',
      'dpt-claim-verifier',
      'dpt-evidence-extractor',
      'dpt-topic-scout',
      'dpt-synthesis-reviewer',
    ]) {
      assert.match(harnessDocs.roles, new RegExp('`' + role + '`'));
      assert.match(specs.subagentEnvironment, new RegExp('`' + role + '`'));
    }

    assert.match(specs.subagentEnvironment, /Deep Research Harness real subagent taxonomy/);
    assert.match(specs.subagentEnvironment, /marker `DPT managed: real-subagent`/);
    assert.match(specs.bundleInstantiation, /`framework_version`/);
    assert.match(specs.workflowDirectory, /`framework_root`/);
  });

  it('preserves the no-copy constraint between a run bundle and the Harness', () => {
    assert.match(specs.bundleInstantiation, /Bundle does NOT contain a Harness copy/);
    assert.match(specs.bundleInstantiation, /no copy of `DEEP_RESEARCH_HARNESS\/`, a legacy `_framework\/`/);
    assert.match(specs.bundleInstantiation, /before Harness execution begins/);
    assert.match(specs.bundleInstantiation, /current Harness version/);
    assert.match(specs.bundleInstantiation, /canonical physical Harness root/);
  });
});
