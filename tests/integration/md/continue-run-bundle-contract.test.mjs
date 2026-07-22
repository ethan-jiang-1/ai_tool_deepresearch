// @impl ACS-005, RUE-006
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');
const ROOT_AGENTS = 'AGENTS.md';
const ROOT_CLAUDE = 'CLAUDE.md';
const FRAMEWORK_AGENTS = 'DPT_FRAMEWORK/AGENTS.md';
const FRAMEWORK_CLAUDE = 'DPT_FRAMEWORK/CLAUDE.md';
const RUN = 'DPT_FRAMEWORK/RUN.md';
const README = 'DPT_FRAMEWORK/README.md';
const COMMANDS = 'DPT_FRAMEWORK/COMMANDS.md';
const PLAYBOOK = 'DPT_FRAMEWORK/command_playbook/continue-run-bundle.md';

describe('existing run-bundle continuation contract', () => {
  it('routes only an explicit reachable existing map before the new-run default', () => {
    const surfaces = [ROOT_AGENTS, ROOT_CLAUDE, FRAMEWORK_AGENTS, FRAMEWORK_CLAUDE]
      .map(read)
      .join('\n');

    assert.match(surfaces, /BUNDLE_MAP\.md/);
    assert.match(surfaces, /continue-run-bundle\.md/);
    assert.match(surfaces, /explicit|明确|显式/i);
    assert.match(surfaces, /reachable|可达/i);
    assert.match(surfaces, /RUN\.md/);
    assert.match(surfaces, /start-research\.md/);
    assert.match(surfaces, /scan|扫描|bare filename|仅.*文件名/i);
  });

  it('keeps one continuation playbook and preserves the legal node branches', () => {
    const playbook = read(PLAYBOOK);
    const pointers = [read(RUN), read(README), read(COMMANDS)].join('\n');

    assert.match(playbook, /DPT source tree|DPT source/i);
    assert.match(playbook, /already selected|已选定/i);
    assert.match(playbook, /current_node/);
    assert.match(playbook, /check-reentry\.mjs/);
    assert.match(playbook, /phase-final/);
    assert.match(playbook, /readiness_passed/);
    assert.match(playbook, /operate-post-final-recovery\.mjs/);
    assert.match(playbook, /null|absent|缺失/i);
    assert.doesNotMatch(playbook, /check-reentry\.mjs[^\n]*phase-final/);
    assert.match(pointers, /continue-run-bundle\.md/);
    assert.doesNotMatch(pointers, /continue-run-bundle\.md.*AGENTS\.md/i);
  });
});
