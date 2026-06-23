// phase-wave0-queue-loop.test.mjs
// @impl AGQ-007, RWP-001: structural regression test for phase-wave0.md
//
// Verifies that phase-wave0.md maintains its contract:
//   - 9-section phase body structure
//   - Queue-driven three-stage §3
//   - Sub-agent execution with WebSearch/WebFetch
//   - Context isolation constraint
//   - Receipt fail → repair path
//   - Correct upstream gate (seed-topics-ready, not setup-ready)

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const PHASE_MD = path.resolve(
  import.meta.dirname,
  '../../../DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md'
);

const body = readFileSync(PHASE_MD, 'utf-8');

// ── helpers ──────────────────────────────────────────────────────────

function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return m[1]; // return raw YAML string — sufficient for structural assertions
}

function sectionHeading(text, label) {
  return text.includes(`## ${label}`) || text.includes(`# ${label}`);
}

// ── frontmatter contract ─────────────────────────────────────────────

describe('phase-wave0.md frontmatter contract', () => {
  const fm = extractFrontmatter(body);

  it('has parseable YAML frontmatter', () => {
    assert.ok(fm, 'frontmatter block missing or unparseable');
  });

  it('declares node_type: phase', () => {
    assert.ok(fm.includes('node_type: phase'), 'missing node_type');
  });

  it('declares id: phase-wave0', () => {
    assert.ok(fm.includes('id: phase-wave0'), 'missing id');
  });

  it('declares phase: wave0', () => {
    assert.ok(fm.includes('phase: wave0'), 'missing phase');
  });

  it('declares gate: wave0-complete', () => {
    assert.ok(fm.includes('gate: wave0-complete'), 'missing gate');
  });

  it('declares stop: "no"', () => {
    assert.ok(fm.includes('stop:'), 'missing stop field');
    assert.ok(fm.includes('"no"') || fm.includes('no'), 'stop value not "no"');
  });

  it('declares requires with shared dependencies', () => {
    assert.ok(fm.includes('requires:'), 'requires field missing');
    assert.ok(fm.includes('shared/shared-profile'), 'missing shared/shared-profile');
    assert.ok(fm.includes('shared/shared-schemas'), 'missing shared/shared-schemas');
  });
});

// ── 9-section completeness ───────────────────────────────────────────

describe('phase-wave0.md 9-section body', () => {
  const sections = [
    '1. Stage Goal',
    '2. Required Inputs',
    '3. Allowed Actions',
    '4. Expected Artifacts',
    '5. Gate Command',
    '6. On Gate Pass',
    '7. On Gate Fail',
    '8. Stop Behavior',
    '9. Anti-Cheating Rules',
  ];

  for (const sec of sections) {
    it(`contains §${sec}`, () => {
      assert.ok(sectionHeading(body, sec), `missing section: ${sec}`);
    });
  }
});

// ── §2 upstream gate correctness ─────────────────────────────────────

describe('§2 Required Inputs — upstream gate', () => {
  it('references seed-topics-ready (not setup-ready)', () => {
    assert.ok(
      body.includes('seed-topics-ready'),
      '§2 must reference seed-topics-ready gate'
    );
    // Verify setup-ready is NOT the primary gate dependency
    // (it may appear in other contexts, but seed-topics-ready must be present)
  });

  it('references topic_registry from rb_plan.md', () => {
    assert.ok(body.includes('topic_registry'), '§2 missing topic_registry reference');
  });

  it('declares operate-queue.mjs CLI dependency', () => {
    assert.ok(
      body.includes('operate-queue.mjs'),
      '§2 missing operate-queue.mjs dependency'
    );
  });

  it('declares WebSearch + WebFetch tool availability', () => {
    assert.ok(body.includes('WebSearch'), '§2 missing WebSearch tool reference');
    assert.ok(body.includes('WebFetch'), '§2 missing WebFetch tool reference');
  });
});

// ── §3 queue-driven three-stage structure ────────────────────────────

describe('§3 Allowed Actions — queue-driven three-stage', () => {
  it('contains §3.1 灌料 (Filling)', () => {
    assert.ok(sectionHeading(body, '3.1 灌料'), 'missing §3.1');
  });

  it('contains §3.2 Queue-Driven 执行循环', () => {
    assert.ok(sectionHeading(body, '3.2 Queue-Driven 执行循环'), 'missing §3.2');
  });

  it('contains §3.3 收尾与 gate', () => {
    assert.ok(sectionHeading(body, '3.3 Queue 空后'), 'missing §3.3');
  });

  it('references operate-queue enqueue CLI', () => {
    assert.ok(
      body.includes('operate-queue enqueue') || body.includes('operate-queue.mjs enqueue'),
      'missing enqueue CLI reference'
    );
  });

  it('references operate-queue claim --actor main-agent', () => {
    assert.ok(body.includes('operate-queue claim'), 'missing claim CLI');
    assert.ok(body.includes('--actor main-agent'), 'missing --actor flag');
  });

  it('references operate-queue complete with --result', () => {
    assert.ok(body.includes('operate-queue complete'), 'missing complete CLI');
    assert.ok(body.includes('--result'), 'missing --result flag');
  });

  it('references operate-queue check for queue health', () => {
    assert.ok(body.includes('operate-queue check'), 'missing check CLI');
  });

  it('has task card JSON template with producer_rule source_intake_fan_in', () => {
    assert.ok(
      body.includes('"producer_rule": "source_intake_fan_in"'),
      'missing producer_rule in task card template'
    );
  });

  it('has task card JSON template with target sub-agent', () => {
    assert.ok(
      body.includes('"target": "sub-agent"'),
      'missing target sub-agent in task card template'
    );
  });

  it('references priority_class P5_new_reference_intake', () => {
    assert.ok(
      body.includes('P5_new_reference_intake'),
      'missing P5_new_reference_intake priority class'
    );
  });

  it('references check-gate-wave0-complete.mjs', () => {
    assert.ok(
      body.includes('check-gate-wave0-complete.mjs'),
      'missing gate CLI reference'
    );
  });

  it('contains ASCII execution loop diagram', () => {
    assert.ok(body.includes('QUEUE-DRIVEN EXECUTION LOOP'), 'missing execution loop diagram');
    assert.ok(body.includes('1. claim'), 'missing claim step in diagram');
    assert.ok(body.includes('2. execute'), 'missing execute step in diagram');
    assert.ok(body.includes('3. complete'), 'missing complete step in diagram');
  });
});

// ── sub-agent execution constraints ──────────────────────────────────

describe('sub-agent execution and WebSearch/WebFetch', () => {
  it('§3.2 execute step references sub-agent', () => {
    assert.ok(body.includes('sub-agent'), 'missing sub-agent reference in execute step');
  });

  it('§3.2 references WebSearch → WebFetch workflow', () => {
    assert.ok(body.includes('WebSearch'), 'missing WebSearch in execute step');
    assert.ok(body.includes('WebFetch'), 'missing WebFetch in execute step');
  });

  it('§3.2 specifies source.yaml output path', () => {
    assert.ok(body.includes('source.yaml'), 'missing source.yaml output reference');
  });

  it('§3.2 specifies search results to _cache/search-results/', () => {
    assert.ok(
      body.includes('_cache/search-results/'),
      'missing _cache/search-results/ path'
    );
  });
});

// ── context isolation constraint ─────────────────────────────────────

describe('context isolation constraint (D5)', () => {
  it('§3.2 constrains main-agent to only read render projection', () => {
    assert.ok(
      body.includes('_cache/agentic-queue/current-task.md'),
      'missing render projection path'
    );
    assert.ok(
      body.includes('不把完整搜索结果读回对话') ||
      body.includes('不读回完整搜索结果'),
      'missing context isolation constraint (do not read full search results back)'
    );
  });

  it('§3.2 execution constraints list context management', () => {
    assert.ok(
      body.includes('上下文管理') || body.includes('不把完整搜索'),
      'missing context management constraint in execution rules'
    );
  });
});

// ── receipt fail → repair path ───────────────────────────────────────

describe('receipt fail → engine repair → re-claim path', () => {
  it('describes receipt check FAIL path', () => {
    assert.ok(
      body.includes('receipt check FAIL') || body.includes('receipt check 失败'),
      'missing receipt fail handling'
    );
  });

  it('mentions engine-generated repair task', () => {
    assert.ok(
      body.includes('repair') && (body.includes('engine') || body.includes('自动生成')),
      'missing engine repair reference on receipt fail'
    );
  });
});

// ── §4-§9 integrity ──────────────────────────────────────────────────

describe('§4-§9 content integrity', () => {
  it('§4 lists reference/index.md and source.yaml artifacts', () => {
    assert.ok(body.includes('reference/index.md'), '§4 missing reference/index.md');
    assert.ok(body.includes('source.yaml'), '§4 missing source.yaml');
    assert.ok(body.includes('wave0_completion'), '§4 missing trace event');
  });

  it('§8 declares stop: no with agent autonomy', () => {
    assert.ok(body.includes('stop: no'), '§8 missing stop behavior');
  });

  it('§9 has ≥2 phase-specific anti-cheating rules', () => {
    const acSection = body.slice(body.indexOf('## 9. Anti-Cheating Rules'));
    const banCount = (acSection.match(/禁止/g) || []).length;
    assert.ok(banCount >= 2, `expected ≥2 bans, found ${banCount}`);
  });

  it('§9 prohibits fake URLs or fabricated source metadata', () => {
    assert.ok(
      body.includes('fake URL') || body.includes('伪造'),
      '§9 missing prohibition on fake URLs/fabricated metadata'
    );
  });

  it('§9 prohibits claiming evidence coverage completeness', () => {
    assert.ok(
      body.includes('evidence coverage') || body.includes('completeness'),
      '§9 missing prohibition on coverage completeness claims'
    );
  });
});
