// guidance-terminology-pointer-consistency.test.mjs
// Locks the C2 repair-guidance-terminology-pointer-drift canonical sentences and
// the removal of stale wording across root/openspec guidance surfaces.
// Static cross-file deterministic facts; no network, no Agent execution.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8');

const frb = read('openspec/guidance/models/framework-runtime-boundary.md');
const context = read('CONTEXT.md');
const brief = read('openspec/guidance/models/invariants-brief.md');
const rootReadme = read('README.md');
const rootAgents = read('AGENTS.md');
const rootClaude = read('CLAUDE.md');

describe('framework-runtime-boundary: Gate 五面正名（F-01）', () => {
  it('names the five facets and drops stale target labels', () => {
    assert.ok(frb.includes('Gate 一词有五面含义'), 'five-facet naming missing');
    assert.ok(frb.includes('Gate definition JSON'), 'definition JSON label must be current');
    assert.ok(!frb.includes('Gate CLI wrapper target'), 'stale CLI wrapper target label must be removed');
    assert.ok(frb.includes('`DEEP_RESEARCH_HARNESS/cli/gates/check-gate-*.mjs`（当前 10 个）'), 'CLI wrapper current status missing');
    assert.ok(frb.includes('Gate engine（目标位置）'), 'engine target honesty label missing');
  });

  it('uses directory-as-truth pointer and drops the stale route-map enumeration (F-07)', () => {
    assert.ok(frb.includes('完整 CLI 清单以 `cli/` 目录为准'), 'directory pointer missing');
    assert.ok(
      !frb.includes('check-gate-*.mjs\n    instantiate-run-bundle.mjs'),
      'stale route-map four-tool enumeration must be removed',
    );
    assert.ok(
      frb.includes('Gate-specific wrappers live at `DEEP_RESEARCH_HARNESS/cli/gates/`（当前 10 个）'),
      'wrappers-live-at prose missing',
    );
  });
});

describe('CONTEXT: Gate pointer, 五反馈面 distinction, C-series, repair_kind dual enum', () => {
  it('points to the five-facet table and distinguishes the five feedback surfaces (F-01)', () => {
    assert.ok(context.includes('「Gate Boundary」节'), 'Gate row must point to the Gate Boundary section');
    assert.ok(context.includes('五反馈面'), 'five-feedback-surface distinction missing');
  });

  it('defines ResearchConfigLock/TopicTreeEvolution/ReopenResearchPass with owner pointers and induction note (F-06)', () => {
    assert.ok(context.includes('ResearchConfigLock（研究风格锁定契约）'), 'C2 row missing');
    assert.ok(context.includes('TopicTreeEvolution（课题大纲演进管线）'), 'C3 row missing');
    assert.ok(context.includes('ReopenResearchPass（终态重开通行证）'), 'C5 row missing');
    assert.ok(context.includes('按 owner spec 用法归纳'), 'induction note missing');
  });

  it('splits repair_kind into the two closed enums (F-03 term row)', () => {
    assert.ok(context.includes('gate/phase 反馈面'), 'phase feedback surface row missing');
    assert.ok(context.includes('work-unit 反馈面'), 'work-unit feedback surface row missing');
    assert.ok(context.includes('同名不同枚举'), 'same-name-different-enum distinction missing');
  });
});

describe('invariants-brief: req-ID citation format and correction (F-08)', () => {
  it('uses requirement title + registry ID and fixes the RUE-004 mis-citation', () => {
    assert.ok(brief.includes('registry: RUE-005'), 'RUE-005 title citation missing');
    assert.ok(brief.includes('registry: ACS-001'), 'ACS-001 title citation missing');
    assert.ok(brief.includes('registry: RRD-008'), 'RRD-008 title citation missing');
    assert.ok(!brief.includes('（RUE-004）'), 'mis-cited （RUE-004） must be removed');
    assert.ok(!brief.includes('（ACS-001）'), 'bare （ACS-001） must be replaced by title format');
    assert.ok(!brief.includes('（RRD-008）'), 'bare （RRD-008） must be replaced by title format');
    assert.ok(brief.includes('spec 引用格式约定'), 'citation format convention note missing');
  });
});

describe('root README/AGENTS/CLAUDE: archive naming and runtime coordinate (F-09/F-12)', () => {
  it('unifies _old_topics naming across root surfaces', () => {
    const sent = '`_old_topics` 归档（位于 `_backlog/_done/`，含 `_original_*` 子目录）除非显式要求否则不读';
    assert.ok(rootReadme.includes(sent), 'README archive wording must be the canonical one');
    for (const [name, text] of [['AGENTS.md', rootAgents], ['CLAUDE.md', rootClaude]]) {
      assert.ok(text.includes('including `_original_*` subdirectories'), `${name} archive wording missing`);
    }
  });

  it('names the explicit runtime coordinate in root behavior files', () => {
    for (const [name, text] of [['AGENTS.md', rootAgents], ['CLAUDE.md', rootClaude]]) {
      assert.ok(text.includes('current run bundle root'), `${name} must name the explicit runtime coordinate`);
      assert.ok(
        text.includes('bare runtime paths always resolve under that root'),
        `${name} bare-path resolution sentence missing`,
      );
    }
  });
});
