// @impl VER-001, VER-003, HIU-001, HIU-002, HIU-003, PRP-002, CDP-001, CDP-004, SWE-004, EXA-003, EXA-005, EXA-006, EXA-008, PLR-003

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const read = (path) => readFileSync(`${ROOT}/${path}`, 'utf8');
const setup = read('experiments_env/shared/prepare-iterative-interaction-case.mjs');
const observer = read('experiments_env/shared/observe-iterative-interaction-case.mjs');
const subjectRunner = read('experiments_env/shared/run-iterative-interaction-subject.mjs');
const registry = read('experiments_playbook/PLAYBOOK_MANIFEST.md');
const cases = {
  711: read('experiments_playbook/exp_iterative_interaction/case-711-heavy-hitl1-natural-acceptance.md'),
  712: read('experiments_playbook/exp_iterative_interaction/case-712-heavy-hitl2-natural-rerun.md'),
  713: read('experiments_playbook/exp_iterative_interaction/case-713-heavy-user-initiated-turn.md'),
};

function subjectInstructions(playbook) {
  return [...playbook.matchAll(/```text\n(You are the independent subject Agent[\s\S]*?)\n```/g)].map((match) => match[1]).join('\n');
}

describe('iterative interaction real-Agent playbooks', () => {
  it('keeps setup helpers setup-only at the three declared legal boundaries', () => {
    assert.match(setup, /profile\.research_access\.status, 'unprobed'/);
    assert.match(setup, /current_node, 'phases\/phase-hitl2\.md'/);
    assert.match(setup, /current_node, 'phases\/phase-readiness\.md'/);
    assert.match(setup, /decision_brief_absent: true/);
    assert.match(setup, /final_directory_expected_empty: true/);
    assert.doesNotMatch(setup, /ready_with_material_gaps/);
    assert.doesNotMatch(setup, /recordCheck|wff-playbook-utils|case-71[123].*passed:\s*true/i);
  });

  it('requires exact real subject execution and never fixture PASS', () => {
    for (const [id, playbook] of Object.entries(cases)) {
      assert.match(playbook, /independent real subject Agent|independent real Agent/i, `case ${id}`);
      assert.match(playbook, /NOT RUN/, `case ${id}`);
      assert.match(playbook, /byte-for-byte/, `case ${id}`);
      assert.match(playbook, /Reality Distance Ledger/, `case ${id}`);
      assert.match(playbook, /root `rb_trace\.jsonl`|bundle-root `rb_trace\.jsonl`/, `case ${id}`);
      assert.doesNotMatch(playbook, /(?:fixture(?:-| )backed|scripted) output (?:is|counts as) PASS/i, `case ${id}`);
    }
  });

  it('keeps subject instructions free of expected control answers', () => {
    for (const [id, playbook] of Object.entries(cases)) {
      const prompt = subjectInstructions(playbook);
      assert.ok(prompt.length > 0, `case ${id} subject prompt missing`);
      assert.doesNotMatch(prompt, /proceed_to_readiness|request_view_revision|rerun|stop_blocked|check-gate|enter-phase|advance-status|next_action|verdict|no mutation|no confirmation|passed:\s*true/i, `case ${id}`);
    }
  });

  it('locks the exact user utterances and conversation counts', () => {
    assert.match(cases[711], /"content":"按这个开始"/);
    assert.match(cases[712], /"content":"资本约束这部分还不够，再补一下"/);
    assert.match(cases[712], /No third user response is allowed after the fixed follow-up/);
    assert.match(cases[713], /现在是不是已经全部完成，可以直接拿最终报告了？/);
    assert.match(cases[713], /最终报告文件现在已经生成了吗？/);
    assert.match(cases[713], /two fresh independent real Agent turns/i);
  });

  it('uses one Codex-only settings identity and preserves subject-session boundaries', () => {
    assert.match(subjectRunner, /codex-only-dpt-iterative-subject-deepseek-v1\.settings\.json/);
    assert.match(subjectRunner, /if \(existsSync\(SETTINGS_PATH\)\)/);
    assert.match(subjectRunner, /flag: 'wx'/);
    assert.match(subjectRunner, /--setting-sources', ''/);
    assert.match(subjectRunner, /SUBJECT_TIMEOUT_MS = 3 \* 60 \* 1000/);
    assert.match(subjectRunner, /tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write'/);
    assert.match(subjectRunner, /tools: 'Bash,Edit,Glob,Grep,Read,Write'/);
    assert.match(subjectRunner, /tools: 'Glob,Grep,Read'/);
    assert.match(subjectRunner, /boundary: 'Answer only the current user turn from direct bundle facts, then stop\.'/);
    assert.match(subjectRunner, /--bare'/);
    assert.match(subjectRunner, /--tools', subject\.tools/);
    assert.match(subjectRunner, /--effort', 'low'/);
    assert.match(subjectRunner, /assessNode\(nodeRef, createState\(\), runtime\)/);
    assert.match(subjectRunner, /frontmatter\?\.suggested_context/);
    assert.match(subjectRunner, /filter\(\(fileRef\) => fileRef\.startsWith\('brief\/'\)\)/);
    assert.match(subjectRunner, /DPT_SUBJECT_PRODUCTION_SURFACE_START/);
    assert.match(subjectRunner, /createWorkflowRuntime\('iterative-interaction-subject', NODES_DIR\)/);
    assert.match(subjectRunner, /detached: true/);
    assert.match(subjectRunner, /forcedAfterResult/);
    assert.doesNotMatch(subjectRunner, /createTrace|traceEntry/);
    assert.match(subjectRunner, /event\.type !== 'result'/);
    assert.match(subjectRunner, /if \(turnIndex < subject\.messages\.length\) \{\s*sendTurn\(turnIndex\)/);
    assert.match(cases[711], /run-iterative-interaction-subject\.mjs 711 --bundle/);
    assert.match(cases[712], /run-iterative-interaction-subject\.mjs 712 --bundle/);
    assert.match(cases[713], /run-iterative-interaction-subject\.mjs 713-readiness --bundle/);
    assert.match(cases[713], /run-iterative-interaction-subject\.mjs 713-final --bundle/);
    assert.doesNotMatch(cases[711], /verify-bundle-health\.mjs/);
    assert.match(cases[711], /Autorun Supervisor validates the completion, runs Light health/);
    assert.match(cases[711], /180-second hard timeout/i);
    assert.match(cases[712], /180-second hard timeout/i);
    assert.match(cases[713], /180-second hard timeout/i);
  });

  it('binds transcripts, authority snapshots, transition allowlist, and deterministic observers', () => {
    assert.match(observer, /agent_transcript_digest/);
    assert.match(observer, /hasOpenBoundary = \/不足\|缺口\|谨慎\|空缺\|未知\|gap\/i/);
    assert.match(observer, /hasOneNextStep = \/推荐\|建议\|下一步\/i/);
    assert.match(observer, /case-713-authority-\$\{label\}\.json/);
    assert.match(observer, /_checkpoints\\\/\[\^\/\]\+-readiness-passed/);
    assert.match(cases[713], /capture B before appending the observer digest/i);
    assert.match(cases[713], /capture D before hashing/i);
    assert.match(cases[713], /A=B/);
    assert.match(cases[713], /C=D/);
    assert.match(cases[713], /final\/.*remain empty/i);
  });

  it('registers every case exactly once in the active runner manifest', () => {
    for (const id of ['711', '712', '713']) {
      const path = `exp_iterative_interaction/case-${id}-heavy-${id === '711' ? 'hitl1-natural-acceptance' : id === '712' ? 'hitl2-natural-rerun' : 'user-initiated-turn'}.md`;
      assert.equal(registry.split(path).length - 1, 1, path);
    }
  });
});
