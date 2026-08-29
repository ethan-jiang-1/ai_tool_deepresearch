// @impl AGT-010
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CASES = [
  {
    name: 'vague rewrite',
    path: new URL('../../../experiments_playbook/exp_wff_topic-rewrite/case-181-light-hitl1-topic-rewrite-vague.md', import.meta.url),
    inputFile: 'case-181-topic-input.json',
    expectedTopics: 4,
    profile: 'exploratory_map',
    semanticCheck: 'vague-rewrite-structured',
    semanticTokens: ['AI 安全', '### Purpose', '### Research Questions', '### Scope'],
  },
  {
    name: 'detailed brief',
    path: new URL('../../../experiments_playbook/exp_wff_topic-rewrite/case-182-light-hitl1-topic-rewrite-detailed.md', import.meta.url),
    inputFile: 'case-182-topic-input.json',
    expectedTopics: 3,
    profile: 'quick_factual',
    semanticCheck: 'detailed-brief-not-over-rewritten',
    semanticTokens: ['合规成本', '豁免条款', '竞争影响', 'Agent 未添加的维度'],
  },
];

const CURRENT_TOPIC_GUIDANCE = [
  new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md', import.meta.url),
  new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-seed-topics.md', import.meta.url),
];

function source(entry) {
  return readFileSync(entry.path, 'utf8');
}

function topicInput(markdown, inputFile) {
  const marker = `cat > "$STATE/${inputFile}" <<'JSON'\n`;
  const start = markdown.indexOf(marker);
  assert.ok(start >= 0, `missing retained topic input ${inputFile}`);
  const payloadStart = start + marker.length;
  const end = markdown.indexOf('\nJSON', payloadStart);
  assert.ok(end >= 0, `unterminated retained topic input ${inputFile}`);
  return JSON.parse(markdown.slice(payloadStart, end));
}

function assertBefore(markdown, earlier, later, label) {
  const earlierIndex = markdown.indexOf(earlier);
  const laterIndex = markdown.indexOf(later);
  assert.ok(earlierIndex >= 0, `${label}: missing earlier token ${earlier}`);
  assert.ok(laterIndex >= 0, `${label}: missing later token ${later}`);
  assert.ok(earlierIndex < laterIndex, `${label}: expected ${earlier} before ${later}`);
}

describe('topic-rewrite fixture contracts', () => {
  it('keeps both cases on the V2 deterministic-contract policy', () => {
    for (const entry of CASES) {
      const markdown = source(entry);
      assert.match(markdown, /^---\nschema: command-experiment\/v2\n/m, entry.name);
      assert.match(markdown, /verdict_mode: all/, entry.name);
      assert.ok(markdown.includes(`required_checks: [original-topic-preserved, seed-topics-derived, ${entry.semanticCheck}, hitl1-recorded]`), entry.name);
      assert.match(markdown, /proof_subject: deterministic_contract/, entry.name);
      assert.match(markdown, /fixture: fixture_backed/, entry.name);
      assert.match(markdown, /runtime: real_disposable_bundle/, entry.name);
      assert.match(markdown, /verdict_judge: deterministic/, entry.name);
    }
  });

  it('retains only semantic topic input and uses the existing canonical writer in the legal HITL1 order', () => {
    for (const entry of CASES) {
      const markdown = source(entry);
      const input = topicInput(markdown, entry.inputFile);
      assert.equal(input.context, 'hitl1', entry.name);
      assert.equal(input.actions.length, entry.expectedTopics, entry.name);
      for (const action of input.actions) {
        assert.equal(action.action, 'add_topic', entry.name);
        assert.equal(typeof action.title, 'string', entry.name);
        assert.match(action.slug_stem, /^[a-z0-9][a-z0-9-]*$/, entry.name);
        assert.ok(Array.isArray(action.must_answer) && action.must_answer.length > 0, entry.name);
        assert.ok(Array.isArray(action.depends_on_topic_uids) && action.depends_on_topic_uids.length === 0, entry.name);
      }
      assert.doesNotMatch(JSON.stringify(input), /"topic_uid"\s*:|"id"\s*:|"slug"\s*:/, entry.name);

      assert.match(markdown, /check-gate-instantiation-complete\.mjs --bundle "\$B" --current-node phases\/phase-instantiation\.md/, entry.name);
      assert.match(markdown, /enter-phase\.mjs --bundle "\$B" --node "\$NEXT"/, entry.name);
      assert.match(markdown, /advance-status\.mjs --bundle "\$B" --to hitl1_recorded/, entry.name);
      assert.match(markdown, /operate-topic-state\.mjs apply --bundle "\$B" --input "\$STATE\//, entry.name);
      assertBefore(markdown, 'advance-status.mjs --bundle "$B" --to hitl1_recorded', `cat > "$STATE/${entry.inputFile}"`, entry.name);
      assertBefore(markdown, `cat > "$STATE/${entry.inputFile}"`, 'operate-topic-state.mjs apply --bundle "$B"', entry.name);
    }
  });

  it('consumes the committed style handoff before its only HITL1 Gate', () => {
    for (const entry of CASES) {
      const markdown = source(entry);
      const casePrefix = entry.inputFile.replace('-topic-input.json', '');
      assert.match(markdown, new RegExp(`research_profile: ${entry.profile}`), entry.name);
      assert.match(markdown, /const handoff = result\.style_projection;/, entry.name);
      assert.match(markdown, /handoff\?\.status !== 'refresh_required'/, entry.name);
      assert.match(markdown, /writeFileSync\(commandPath, `\$\{handoff\.command\}\\n`\);/, entry.name);
      assert.match(markdown, new RegExp(`STYLE_OUTPUT=\\$\\(sh "\\$STATE/${casePrefix}-style-command\\.sh"\\)`), entry.name);
      assert.match(markdown, /style\.applied !== handoff\.selected_profile \|\| style\.topic_count !== handoff\.committed_topic_count/, entry.name);
      assert.doesNotMatch(markdown, /apply-research-style\.mjs/, entry.name);
      assert.doesNotMatch(markdown, /research_style_params\s*:/, entry.name);
      assert.equal((markdown.match(/run-gate-with-monitor\.mjs/g) || []).length, 1, entry.name);
      assertBefore(markdown, 'const handoff = result.style_projection;', 'STYLE_OUTPUT=$(sh', entry.name);
      assertBefore(markdown, 'style.applied !== handoff.selected_profile', 'run-gate-with-monitor.mjs', entry.name);
    }
  });

  it('preserves template authority and derives check facts from Engine-written state', () => {
    for (const entry of CASES) {
      const markdown = source(entry);
      assert.match(markdown, /const start = plan\.indexOf\('## Goal\\n'\);/, entry.name);
      assert.match(markdown, /const end = plan\.indexOf\('\\n## Topic Registry\\n', start\);/, entry.name);
      assert.match(markdown, /writeFileSync\(planPath, `\$\{plan\.slice\(0, start\)\}\$\{goal\}\$\{plan\.slice\(end \+ 1\)\}`\);/, entry.name);
      assert.doesNotMatch(markdown, /cat > "\$B\/rb_plan\.md"/, entry.name);
      assert.doesNotMatch(markdown, /topic_registry:\s*\n\s*-/m, entry.name);
      assert.doesNotMatch(markdown, /\$B\/seed_topics\//, entry.name);
      assert.doesNotMatch(markdown, /migrate_legacy/, entry.name);
      assert.match(markdown, /const fm = parseMdFrontmatter\(plan\);/, entry.name);
      assert.match(markdown, new RegExp(`fm\\.derived_topic_count === ${entry.expectedTopics} && fm\\.topic_registry\\?\\.length === ${entry.expectedTopics}`), entry.name);
      for (const token of entry.semanticTokens) assert.ok(markdown.includes(token), `${entry.name}: ${token}`);
    }
  });

  it('names only canonical topic-state paths for current rerun and Seed Topics work', () => {
    for (const path of CURRENT_TOPIC_GUIDANCE) {
      const markdown = readFileSync(path, 'utf8');
      assert.doesNotMatch(markdown, /migrate_legacy|slug-only compatibility|sanctioned rerun migration/i, String(path));
      assert.doesNotMatch(markdown, /legacy.*(?:migration|adoption|upgrade)|(?:migration|adoption|upgrade).*legacy/i, String(path));
    }
    const rerun = readFileSync(CURRENT_TOPIC_GUIDANCE[0], 'utf8');
    const seedTopics = readFileSync(CURRENT_TOPIC_GUIDANCE[1], 'utf8');
    assert.match(rerun, /mutate_layout/);
    assert.match(rerun, /previous_layouts/);
    assert.doesNotMatch(rerun, /unsupported topic mutation/);
    assert.match(rerun, /safe-remove|新 bundle/);
    assert.match(seedTopics, /UID-bound/);
  });
});
