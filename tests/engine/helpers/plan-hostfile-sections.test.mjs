import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  NO_CONTROLS_SENTENCE,
  SUPPLIED_CONTROLS_LABEL,
  canonicalSectionContent,
  controlsState,
  locateCanonicalSection,
  renderNoControls,
  renderSuppliedControls,
  stripSuppliedControlsForTemplateScan,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/plan-hostfile-sections.mjs';
import { writePlanProgress, CYCLE_PROGRESS_GATES } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs';

const dirs = [];
function bundle() {
  const dir = mkdtempSync(join(tmpdir(), 'dpt-plan-sections-'));
  dirs.push(dir);
  return dir;
}

const base = `# Plan

## Topic Registry

| # | Slug | Title | Status |
|---|------|-------|--------|
| 01 | topic | Topic | pending |

## Constraints

- **方法**：open

## Progress

- [ ] setup-ready

## Decisions

append-only
`;

function withControls(snapshot) {
  return base.replace('- **方法**：open', `- **方法**：open\n\n${renderSuppliedControls(snapshot)}`);
}

describe('plan host-file sections', () => {
  after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('renders the exact no-controls form and recognizes only a complete supplied literal snapshot', () => {
    assert.equal(renderNoControls(), `### User Research Controls\n\n${NO_CONTROLS_SENTENCE}`);
    const snapshot = '## Topic Registry\n- [ ] setup-ready\n(待填充 — literal)\n```\ninner\n```';
    const rendered = renderSuppliedControls(snapshot);
    assert.match(rendered, new RegExp(SUPPLIED_CONTROLS_LABEL));
    assert.match(rendered, /````\n[\s\S]*\n````$/);
    const state = controlsState(withControls(snapshot));
    assert.equal(state.kind, 'supplied');
    assert.equal(state.content, snapshot);

    const incomplete = `### User Research Controls\n\n${SUPPLIED_CONTROLS_LABEL}\n\n\`\`\`\n(待填充 — still visible)`;
    assert.equal(controlsState(incomplete).kind, 'none');
    assert.equal(controlsState(`### User Research Controls\n\nwrong label\n\n\`\`\`\nx\n\`\`\``).kind, 'none');
    assert.equal(controlsState(`${base}\n${rendered}\n`).kind, 'none');
  });

  it('keeps user headings, checkbox-like lines, and markers opaque to canonical consumers', () => {
    const snapshot = '## Topic Registry\n| # | Slug | Title | Status |\n## Progress\n- [ ] setup-ready\n## Decisions\n(待填充 — literal)\n(尚无话题 — literal)';
    const body = withControls(snapshot);
    const scanned = stripSuppliedControlsForTemplateScan(body);
    assert.doesNotMatch(scanned, /literal/);
    assert.equal(scanned.length, body.length);
    assert.ok(locateCanonicalSection(body, 'Progress').start > body.indexOf('### User Research Controls'));
    assert.match(canonicalSectionContent(body, 'Topic Registry').content, /\| 01 \| topic/);
  });

  it('reports committed, unchanged, and failed bounded Progress outcomes without touching user content', () => {
    const dir = bundle();
    const planPath = join(dir, 'rb_plan.md');
    const snapshot = '## Progress\n- [ ] setup-ready\n(待填充 — literal)';
    writeFileSync(planPath, `---\nplan_basename: test\n---\n${withControls(snapshot)}`);
    const first = writePlanProgress(dir, 'setup-ready');
    assert.equal(first.outcome, 'committed');
    const afterFirst = readFileSync(planPath, 'utf8');
    assert.match(afterFirst, /## Progress\n\n- \[x\] setup-ready \(/);
    assert.match(afterFirst, /### User Research Controls[\s\S]*- \[ \] setup-ready/);

    const RealDate = Date;
    const fixed = new RealDate('2026-07-22T00:00:00.000Z');
    globalThis.Date = class extends RealDate {
      constructor(...args) { return args.length ? new RealDate(...args) : new RealDate(fixed); }
      static now() { return fixed.getTime(); }
    };
    try {
      const second = writePlanProgress(dir, 'setup-ready');
      const third = writePlanProgress(dir, 'setup-ready');
      assert.equal(second.outcome, 'committed');
      assert.equal(third.outcome, 'unchanged');
    } finally {
      globalThis.Date = RealDate;
    }

    const beforeFailure = readFileSync(planPath, 'utf8');
    const missing = writePlanProgress(join(dir, 'missing'), 'setup-ready');
    assert.equal(missing.outcome, 'failed');
    assert.equal(readFileSync(planPath, 'utf8'), beforeFailure);
  });

  it('grows a cycle block on rerun-ready pass and flips in-cycle gates in that block', () => {
    const dir = bundle();
    const planPath = join(dir, 'rb_plan.md');
    writeFileSync(planPath, `# Plan\n\n## Progress\n\n${TEMPLATE_BASELINE}\n\n## Decisions\n\nx\n`);
    const baseline = ['instantiation-complete', 'hitl1-recorded', 'setup-ready', 'seed-topics-ready',
      'wave0-complete', 'wave1-complete', 'wave2-complete', 'hitl2-recorded', 'rerun-ready'];
    for (const gate of baseline) writePlanProgress(dir, gate);

    const afterSpawn = readFileSync(planPath, 'utf8');
    assert.match(afterSpawn, /### Rerun cycle 1 \(spawned \d{4}-\d{2}-\d{2}T/);
    for (const gate of CYCLE_PROGRESS_GATES) {
      assert.match(afterSpawn, new RegExp(`### Rerun cycle 1[\\s\\S]*?- \\[ \\] ${gate}`));
    }
    // Baseline rerun-ready got checked by the spawner pass; baseline readiness
    // (mutually exclusive exit) stays unchecked.
    assert.match(afterSpawn, /- \[x\] rerun-ready \(\d{4}-\d{2}-\d{2}T/);
    assert.match(afterSpawn, /- \[ \] readiness-passed/);

    // In-cycle gate passes flip inside the cycle block, not the baseline.
    writePlanProgress(dir, 'seed-topics-ready');
    writePlanProgress(dir, 'wave0-complete');
    const afterCyclePasses = readFileSync(planPath, 'utf8');
    const cycle1 = afterCyclePasses.split('### Rerun cycle 1')[1].split('## Decisions')[0];
    assert.match(cycle1, /- \[x\] seed-topics-ready \(\d{4}-\d{2}-\d{2}T/);
    assert.match(cycle1, /- \[x\] wave0-complete \(\d{4}-\d{2}-\d{2}T/);
    // Exactly one cycle block; the mutual-exclusion exit stays unchecked in
    // the baseline; separator blanks stay single (no accumulation).
    assert.equal((afterCyclePasses.match(/### Rerun cycle /g) || []).length, 1);
    assert.match(afterCyclePasses, /- \[ \] readiness-passed/);
    assert.match(afterCyclePasses, /\n\n### Rerun cycle 1 /);
  });

  it('spawn guard: re-running rerun-ready against an already-checked current-block line refreshes only', () => {
    const dir = bundle();
    const planPath = join(dir, 'rb_plan.md');
    // Current block (cycle 1) already has rerun-ready checked — e.g. a state
    // rebuilt by reconcile. A re-pass must refresh the timestamp, never spawn.
    const cycle1Lines = CYCLE_PROGRESS_GATES.map((g) => `- [ ] ${g}`).join('\n')
      .replace('- [ ] rerun-ready', '- [x] rerun-ready (2026-07-21T00:00:01.000Z)');
    writeFileSync(planPath, [
      '# Plan',
      '## Progress',
      '',
      ...TEMPLATE_BASELINE.split('\n'),
      '',
      '### Rerun cycle 1 (spawned 2026-07-21T00:00:00.000Z)',
      ...cycle1Lines.split('\n'),
      '',
      '## Decisions',
      '',
      'x',
    ].join('\n'));

    const RealDate = Date;
    const fixed = new RealDate('2026-07-21T00:00:01.000Z');
    globalThis.Date = class extends RealDate {
      constructor(...args) { return args.length ? new RealDate(...args) : new RealDate(fixed); }
      static now() { return fixed.getTime(); }
    };
    try {
      const outcome = writePlanProgress(dir, 'rerun-ready');
      assert.equal(outcome.outcome, 'unchanged');
    } finally {
      globalThis.Date = RealDate;
    }
    const after = readFileSync(planPath, 'utf8');
    assert.equal((after.match(/### Rerun cycle /g) || []).length, 1); // no cycle 2 spawned
  });
});

const TEMPLATE_BASELINE = [
  '- [ ] instantiation-complete',
  '- [ ] hitl1-recorded',
  '- [ ] setup-ready',
  '- [ ] seed-topics-ready',
  '- [ ] wave0-complete',
  '- [ ] wave1-complete',
  '- [ ] wave2-complete',
  '- [ ] hitl2-recorded',
  '- [ ] readiness-passed',
  '- [ ] rerun-ready',
].join('\n');
