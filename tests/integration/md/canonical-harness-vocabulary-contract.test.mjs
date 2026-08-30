// @impl RUE-001, RUE-004, RUE-005, VEM-001, VEM-003, ACS-001, ACS-002, CMI-004, CMI-005, CMI-009, CSE-001, BUI-001, BUI-002, SWE-004, WDC-001

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
  ['versionManagement', 'openspec/specs/governance/version-management/spec.md'],
  ['catalog', 'openspec/specs/README.md'],
  ['agentCommand', 'openspec/specs/agent/agent-command-surface/spec.md'],
  ['bundleInstantiation', 'openspec/specs/bundle/cmd-bundle-instantiation/spec.md'],
  ['subagentEnvironment', 'openspec/specs/agent/cmd-subagent-environment/spec.md'],
  ['bundleIsolation', 'openspec/specs/bundle/bundle-data-isolation/spec.md'],
  ['silentExecution', 'openspec/specs/workflow/silent-wave-execution/spec.md'],
  ['workflowDirectory', 'openspec/specs/workflow/workflow-directory-contract/spec.md'],
].map(([name, path]) => [name, read(path)]));

function catalogRow(capabilityPath) {
  const row = specs.catalog.match(new RegExp(`^\\| ${capabilityPath} \\|.*$`, 'm'))?.[0];
  assert.ok(row, `catalog must include ${capabilityPath}`);
  return row;
}

const localEntryDirective = (contents) => contents
  .slice(0, contents.indexOf('## Must Read'))
  .replace(/^# .*$/m, '# HOST.md')
  .replaceAll('Codex', 'HOST')
  .replaceAll('Claude Code', 'HOST');

const hasExecutionBriefHeading = (contents) => /^## 0\. Execution Brief$/m.test(contents);
const hasHarnessIdentityClaim = (contents) => /本 Harness 就是项目的 Deep Research Harness/.test(contents);
const hasEntrySelectionPointerTriad = (contents) => [
  /continue-run-bundle\.md/,
  /Entry Selection \(canonical\)/,
  /unsupported_current_entry_contract/,
].every((re) => re.test(contents));

describe('canonical Deep Research Harness vocabulary', () => {
  it('keeps paired Harness-local entry guidance equivalent', () => {
    assert.equal(
      localEntryDirective(harnessDocs.agents),
      localEntryDirective(harnessDocs.claude),
    );

    for (const contents of [harnessDocs.agents, harnessDocs.claude]) {
      assert.ok(
        hasExecutionBriefHeading(contents),
        'Harness-local entry file must open with the ## 0. Execution Brief control surface',
      );
      assert.ok(
        hasHarnessIdentityClaim(contents),
        'Harness-local entry file must state the canonical Harness identity claim',
      );
      assert.ok(
        hasEntrySelectionPointerTriad(contents),
        'Harness-local entry file must carry the entry-selection pointer triad (playbook path, canonical section, stop name)',
      );
    }

    // Negative proof: retired exact phrases alone do not satisfy the substance
    // matchers, so the lock keeps its teeth if the substance is lost again.
    const legacyWordingSample = [
      '# HOST.md',
      '## ⚡ 第一优先：这是一个 Deep Research Harness，不是代码库',
      '**触发这个 Harness，不要把它当代码探索请求。**',
    ].join('\n');
    assert.equal(hasExecutionBriefHeading(legacyWordingSample), false);
    assert.equal(hasHarnessIdentityClaim(legacyWordingSample), false);
    assert.equal(hasEntrySelectionPointerTriad(legacyWordingSample), false);

    assert.match(specs.runEntry, /Harness-local\s+directive language/);
    assert.match(specs.runEntry, /Entry trigger hands control to Agent-run Harness execution/);
  });

  it('keeps catalog and current static vocabulary free of internal version projection', () => {
    const runEntryRow = catalogRow('bundle/run-entry');
    const versionManagementRow = catalogRow('governance/version-management');

    assert.match(runEntryRow, /current-entry contract/);
    assert.doesNotMatch(runEntryRow, /version banner/i);
    assert.match(versionManagementRow, /non-authoritative root changelog history/);
    assert.doesNotMatch(versionManagementRow, /required version updates|version-banner consistency/i);

    assert.match(specs.runEntry, /Entry point excludes internal version projection/);
    assert.doesNotMatch(specs.runEntry, /Entry point announces Harness version/);
    assert.match(specs.versionManagement, /CHANGELOG is concise non-authoritative human history/);
    assert.match(specs.versionManagement, /RUN\.md does not project a changelog version/);
    assert.doesNotMatch(specs.versionManagement, /Every behavior change updates CHANGELOG/);
    assert.doesNotMatch(specs.versionManagement, /RUN\.md banner matches CHANGELOG/);
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

    assert.match(specs.runEntry, /transfers control to the Agent/);
    assert.match(specs.runEntry, /only Harness-initiated in-run lifecycle/);
    assert.match(specs.agentCommand, /Deep Research Harness command surfaces/);
    assert.match(specs.agentCommand, /Harness commands are invoked by the Phase Agent/);
    assert.match(specs.silentExecution, /\*\*non-terminal Harness-initiated\*\*/);
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
    assert.doesNotMatch(specs.bundleInstantiation, /`framework_version`/);
    assert.doesNotMatch(specs.bundleInstantiation, /CMI-007/);
    assert.match(specs.workflowDirectory, /`framework_root`/);
  });

  it('preserves the no-copy constraint between a run bundle and the Harness', () => {
    assert.match(specs.bundleInstantiation, /Bundle does NOT contain a Harness copy/);
    assert.match(specs.bundleInstantiation, /no copy of `DEEP_RESEARCH_HARNESS\/`, a legacy `_framework\/`/);
    assert.match(specs.bundleInstantiation, /before Harness execution begins/);
    assert.match(specs.bundleInstantiation, /canonical physical Harness root/);
  });
});
