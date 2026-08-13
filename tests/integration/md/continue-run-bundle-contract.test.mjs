// @impl ACS-005, RUE-006
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');
const ROOT_AGENTS = 'AGENTS.md';
const ROOT_CLAUDE = 'CLAUDE.md';
const FRAMEWORK_AGENTS = 'DEEP_RESEARCH_HARNESS/AGENTS.md';
const FRAMEWORK_CLAUDE = 'DEEP_RESEARCH_HARNESS/CLAUDE.md';
const RUN = 'DEEP_RESEARCH_HARNESS/RUN.md';
const README = 'DEEP_RESEARCH_HARNESS/README.md';
const COMMANDS = 'DEEP_RESEARCH_HARNESS/COMMANDS.md';
const PLAYBOOK = 'DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md';

describe('existing run-bundle continuation contract', () => {
  it('routes only an explicit reachable current-pair bundle before the new-run default', () => {
    const surfaces = [ROOT_AGENTS, ROOT_CLAUDE, FRAMEWORK_AGENTS, FRAMEWORK_CLAUDE]
      .map(read)
      .join('\n');

    assert.match(surfaces, /BUNDLE_ENTRY\.md/);
    assert.match(surfaces, /BUNDLE_MAP\.md/);
    assert.match(surfaces, /unsupported_current_entry_contract/);
    assert.match(surfaces, /continue-run-bundle\.md/);
    assert.match(surfaces, /explicit|明确|显式/i);
    assert.match(surfaces, /reachable|可达/i);
    assert.match(surfaces, /RUN\.md/);
    assert.match(surfaces, /start-research\.md/);
    assert.match(surfaces, /scan|扫描|bare filename|仅.*文件名/i);
  });

  it('preflights the current pair, then bridges it to COMMANDS.md without lifecycle branching', () => {
    const playbook = read(PLAYBOOK);
    const pointers = [read(RUN), read(README), read(COMMANDS)].join('\n');

    // Simplified playbook: selected root → ordered entry → layout → commands
    assert.match(playbook, /canonical absolute path/);
    assert.match(playbook, /current\s+run bundle root/i);
    assert.match(playbook, /BUNDLE_ENTRY\.md/);
    assert.match(playbook, /BUNDLE_MAP\.md/);
    assert.match(playbook, /COMMANDS\.md/);
    assert.match(playbook, /Deep Research Harness/);
    assert.match(playbook, /selected source context|selected Harness context/i);
    assert.match(playbook, /Verify the same root contains both `BUNDLE_ENTRY\.md` and `BUNDLE_MAP\.md`/);
    assert.match(playbook, /unsupported_current_entry_contract/);
    assert.match(playbook, /Do not read legacy Markdown/i);

    // No lifecycle branching — these belong to COMMANDS.md and CLI tools
    assert.doesNotMatch(playbook, /current_node/);
    assert.doesNotMatch(playbook, /check-reentry\.mjs/);
    assert.doesNotMatch(playbook, /phase-final/);
    assert.doesNotMatch(playbook, /readiness_passed/);
    assert.doesNotMatch(playbook, /operate-post-final-recovery\.mjs/);
    assert.match(playbook, /do not themselves\s+select lifecycle work or runtime authority/);
    assert.doesNotMatch(playbook, /otherwise read legacy|legacy `RUN_BUNDLE\.md`|deprecated fallback/);

    // Routing surfaces point to the playbook
    assert.match(pointers, /continue-run-bundle\.md/);
    assert.doesNotMatch(pointers, /continue-run-bundle\.md.*AGENTS\.md/i);
  });
});
