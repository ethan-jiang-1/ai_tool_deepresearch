// @impl PHS-009, URC-004, PRP-016, STM-009, STM-010, DEW-026, RWP-022, WAI-012, WTS-013, CDP-007, REI-007
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8');

const rerun = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md');
const seed = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-seed-topics.md');
const wave0 = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md');
const wave1 = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md');
const wave2 = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md');
const final = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md');

describe('user intent carry-through Markdown contract', () => {
  it('keeps one cumulative revision behind safe topic-state recovery ordering', () => {
    const labels = [
      'Target rerun count',
      'This-round delta',
      'Affected canonical Topics',
      'Superseded or withdrawn requirements',
      'Accepted Agent interpretation',
      'Current active amendments relative to HITL1 baseline',
      'Accepted user wording',
    ];
    for (const label of labels) assert.match(rerun, new RegExp(`- ${label}:`), label);

    assert.match(rerun, /前六个 label\/value 必须各占一个 bounded bullet line/);
    assert.match(rerun, /只有 `Accepted user wording` 可以 multiline/);
    assert.match(rerun, /非空行写 `> `，空行写 `>`/);
    assert.match(rerun, /`## Progress`、`## Decisions`、`### Rerun intent revision`、checkbox-looking 行/);
    assert.match(rerun, /完整当前累计集合，而不是只写 delta/);
    assert.match(rerun, /同 target、同 accepted meaning.*reuse/);
    assert.match(rerun, /interrupted incomplete target draft.*补齐/);
    assert.match(rerun, /两个 complete duplicate\/conflicting entries.*停止在 plan ambiguity/);
    assert.match(rerun, /complete older revisions：永不修改/);

    const recovery = rerun.indexOf('committed recover 后必须重新 inspect');
    const revision = rerun.indexOf('### Stage 1.5: 持久化 target-round intent revision');
    const reread = rerun.indexOf('必须重新读取 `rb_plan.md`');
    const freshInspect = rerun.indexOf('随后再次运行 fresh `operate-topic-state inspect`');
    const candidate = rerun.indexOf('### Stage 2: 对比推断');
    assert.ok(recovery >= 0 && recovery < revision);
    assert.ok(revision < reread && reread < freshInspect && freshInspect < candidate);
    assert.match(rerun, /不同 Topic 可以不同，不得复制完整 user wording/);
    assert.match(rerun, /Engine 不解析 label、blockquote 或语义等价性/);
  });

  it('projects bounded current intent only at Seed and real Wave enqueue points', () => {
    assert.match(seed, /优先投影为 `search_guardrails` \/ `evidence_route`/);
    assert.match(seed, /不适用的 Topic.*不创建空或 decorative projection/);
    assert.match(seed, /改写后的显式 gap/);
    assert.match(seed, /不得原样保留模板 pending 占位行/);
    assert.match(seed, /不预写未来 Wave task brief/);

    for (const [name, phase] of [['Wave0', wave0], ['Wave1', wave1], ['Wave2', wave2]]) {
      assert.match(phase, /existing queue-owned `task_brief`/, name);
      assert.match(phase, /bounded/i, name);
      assert.match(phase, /beacon-rooted bundle coordinate/, name);
      assert.match(phase, /Stale, future, invalid, or legacy-unbound direction is not current instruction/, name);
      assert.match(phase, /do not copy complete user wording|Do not copy complete user wording/, name);
    }

    assert.match(wave0, /actual Wave0 enqueue point/);
    assert.match(wave0, /Seed Topics must not pre-author this future queue work/);
    assert.match(wave1, /every initial or supplementary Wave1 enqueue/);
    assert.match(wave2, /every initial or refill enqueue/);
    assert.match(`${wave0}\n${wave1}\n${wave2}`, /omit the optional brief.*empty one/);
    assert.doesNotMatch(`${wave0}\n${wave1}\n${wave2}`, /"user_intent"\s*:/);
  });

  it('keeps coverage, synthesis, and Final owner boundaries explicit', () => {
    assert.match(wave1, /positive commitment sources are only the applicable controls baseline/);
    assert.match(wave1, /newest complete Decisions revision for N/);
    assert.match(wave1, /historical submitted work cannot independently create a current commitment/);
    assert.match(wave1, /explicit `rerun_count` equals the current profile round/);
    assert.match(wave1, /available authorized supplementary repair is exhausted/);

    assert.match(wave2, /## Current Intent Coverage/);
    assert.match(wave2, /Distinguish `covered` from `limited`/);
    assert.match(wave2, /historical work cannot be relabelled as current completion/);
    assert.match(wave2, /does not add a `finding-index\.yaml` field, ledger row, synthesis-eligibility condition/);
    assert.match(wave2, /no Engine component parses it to decide semantic satisfaction/);

    assert.match(final, /Research controls\/amendments own\s+research obligations/);
    assert.match(final, /this handoff owns reader, use, view, foregrounding/);
    assert.match(final, /Controls, Decisions, or synthesis coverage cannot manufacture/);
    assert.match(final, /presentation\s+preferences cannot weaken research controls/);
    assert.match(final, /presentation-only path never rewrites the controls\s+baseline or appends a Decisions revision/);
    assert.match(final, /material unfulfilled current research commitment remains visible/);
  });
});
