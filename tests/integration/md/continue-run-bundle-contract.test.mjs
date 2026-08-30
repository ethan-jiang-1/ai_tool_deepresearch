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

function markdownSection(text, heading, path) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`## ${escaped}\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\n## |$)`));
  assert.ok(match, `${path} must keep ## ${heading}`);
  return match[1];
}

function assertPointerBlock(block, label) {
  assert.match(block, /continue-run-bundle\.md/, `${label} must name the playbook`);
  assert.match(block, /Entry Selection \(canonical\)/, `${label} must name the canonical heading`);
  assert.match(block, /unsupported_current_entry_contract/, `${label} must name the stop`);
  assert.doesNotMatch(block, /same-root `BUNDLE_ENTRY\.md` \+ `BUNDLE_MAP\.md` preflight/i, `${label} must not restate pair preflight`);
  assert.doesNotMatch(block, /With no supplied existing candidate/i, `${label} must not restate the no-candidate essay`);
  assert.doesNotMatch(block, /discovered, bare, or unreachable file does not select a run/i, `${label} must not restate non-selection`);
  assert.doesNotMatch(block, /preflight 失败[，,]?不等于「没有 explicit candidate」/, `${label} must not restate the fallback essay`);
  assert.doesNotMatch(block, /禁止因此 fallback 读 `RUN\.md`/, `${label} must not restate RUN fallback`);
}

describe('existing run-bundle continuation contract', () => {
  it('routes only an explicit reachable current-pair bundle before the new-run default', () => {
    const rootRouting = [ROOT_AGENTS, ROOT_CLAUDE].map((path) =>
      markdownSection(read(path), 'Deep Research Routing', path),
    );
    assert.equal(rootRouting[0], rootRouting[1], 'root routing blocks must stay synchronized');
    assertPointerBlock(rootRouting[0], 'root Deep Research Routing');

    const harnessPointers = [FRAMEWORK_AGENTS, FRAMEWORK_CLAUDE].map((path) => {
      const brief = markdownSection(read(path), '0. Execution Brief', path);
      const row = brief.match(/\| 研究 \/ 续跑 \/ 报告 \|[^|\n]+\|/);
      const pointerPara = brief.match(/入口选择的完整规则只有一处 canonical 表述：[^\n]+/);
      assert.ok(row && pointerPara, `${path} must keep the research pointer`);
      return `${row[0]}\n${pointerPara[0]}`;
    });
    assert.equal(harnessPointers[0], harnessPointers[1], 'harness research pointers must stay synchronized');
    assertPointerBlock(harnessPointers[0], 'Harness research pointer');
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
