// phase-seedtopics-queue-loop.test.mjs
// @impl AGQ-009, STM-001: structural regression test for phase-seed-topics.md
//
// Verifies that phase-seed-topics.md maintains its contract:
//   - 9-section phase body structure
//   - Queue-driven three-stage §3
//   - V12-aligned seed topic file fields
//   - Key CLI commands present
//   - Gap annotation mechanism

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const PHASE_MD = path.resolve(
  import.meta.dirname,
  '../../../DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md'
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

describe('phase-seed-topics.md frontmatter contract', () => {
  const fm = extractFrontmatter(body);

  it('has parseable YAML frontmatter', () => {
    assert.ok(fm, 'frontmatter block missing or unparseable');
  });

  it('declares node_type: phase', () => {
    assert.ok(fm.includes('node_type: phase'), 'missing node_type');
  });

  it('declares id: phase-seed-topics', () => {
    assert.ok(fm.includes('id: phase-seed-topics'), 'missing id');
  });

  it('declares phase: seed-topics', () => {
    assert.ok(fm.includes('phase: seed-topics'), 'missing phase');
  });

  it('declares gate: seed-topics-ready', () => {
    assert.ok(fm.includes('gate: seed-topics-ready'), 'missing gate');
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

describe('phase-seed-topics.md 9-section body', () => {
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
    assert.ok(body.includes('operate-queue claim'), 'missing claim CLI reference');
    assert.ok(body.includes('--actor main-agent'), 'missing --actor flag');
  });

  it('references operate-queue complete', () => {
    assert.ok(body.includes('operate-queue complete'), 'missing complete CLI reference');
  });

  it('references check-gate-seed-topics-ready.mjs', () => {
    assert.ok(
      body.includes('check-gate-seed-topics-ready.mjs'),
      'missing gate CLI reference'
    );
  });

  it('references priority_class P3_current_gate_gap', () => {
    assert.ok(
      body.includes('P3_current_gate_gap'),
      'missing P3_current_gate_gap priority class'
    );
  });

  it('contains ASCII execution loop diagram', () => {
    assert.ok(body.includes('QUEUE-DRIVEN EXECUTION LOOP'), 'missing execution loop diagram');
    assert.ok(body.includes('1. claim'), 'missing claim step in diagram');
    assert.ok(body.includes('2. execute'), 'missing execute step in diagram');
    assert.ok(body.includes('3. complete'), 'missing complete step in diagram');
  });

  it('has task card JSON template with producer_rule seed_topic_materialize', () => {
    assert.ok(
      body.includes('"producer_rule": "seed_topic_materialize"'),
      'missing producer_rule in task card template'
    );
  });

  it('has task card JSON template with target main-agent', () => {
    assert.ok(
      body.includes('"target": "main-agent"'),
      'missing target main-agent in task card template'
    );
  });
});

// ── V12-aligned seed topic file structure (initialization zone) ─────

describe('V12-aligned seed topic initialization zone', () => {
  it('references must_answer field', () => {
    assert.ok(body.includes('must_answer'), 'missing must_answer field');
  });

  it('references hypothesis field', () => {
    assert.ok(body.includes('hypothesis'), 'missing hypothesis field');
  });

  it('references search_guardrails field', () => {
    assert.ok(body.includes('search_guardrails'), 'missing search_guardrails field');
  });

  it('references evidence_route field', () => {
    assert.ok(body.includes('evidence_route'), 'missing evidence_route field');
  });

  it('references in_scope / out_of_scope fields', () => {
    assert.ok(body.includes('in_scope'), 'missing in_scope field');
    assert.ok(body.includes('out_of_scope'), 'missing out_of_scope field');
  });

  it('has 主题定位 section', () => {
    assert.ok(body.includes('主题定位'), 'missing 主题定位 section');
  });

  it('has 初始假设、缺口或张力 section', () => {
    assert.ok(body.includes('初始假设'), 'missing 初始假设 section');
  });

  it('has why now section', () => {
    assert.ok(body.includes('why now'), 'missing why now section');
  });

  it('has 研究边界与不深挖范围 section', () => {
    assert.ok(body.includes('研究边界'), 'missing 研究边界 section');
    assert.ok(body.includes('不深挖'), 'missing 不深挖 section');
  });

  it('has 证据锚点与优先来源 section', () => {
    assert.ok(body.includes('证据锚点'), 'missing 证据锚点 section');
  });

  it('has 为什么对最终交付物重要 section', () => {
    assert.ok(body.includes('最终交付物'), 'missing 最终交付物 section');
  });

  it('has 下游位置 section', () => {
    assert.ok(body.includes('下游位置'), 'missing 下游位置 section');
  });

  it('describes gap annotation mechanism', () => {
    assert.ok(body.includes('标注为显式 gap'), 'missing gap annotation instruction');
    assert.ok(body.includes('不编造'), 'missing 不编造 instruction');
  });
});

// ── round append zone (轮次追加区) pre-embedded ─────────────────────

describe('Round append zone (轮次追加区) pre-embedded marker', () => {
  it('has 研究轮次追加区 marker', () => {
    assert.ok(body.includes('研究轮次追加区'), 'missing 研究轮次追加区 marker');
  });

  it('has backfill responsibility table', () => {
    assert.ok(body.includes('回填'), 'missing backfill instruction');
    assert.ok(body.includes('wave0'), 'missing wave0 in backfill table');
    assert.ok(body.includes('wave1'), 'missing wave1 in backfill table');
    assert.ok(body.includes('wave2'), 'missing wave2 in backfill table');
  });

  it('has 历史摘要 placeholder', () => {
    assert.ok(body.includes('历史摘要'), 'missing 历史摘要 section');
  });

  it('has BACKFILL token: WAVE0_EVIDENCE', () => {
    assert.ok(body.includes('__BACKFILL_WAVE0_EVIDENCE__'), 'missing __BACKFILL_WAVE0_EVIDENCE__ token');
  });

  it('has BACKFILL token: WAVE1_MECHANISMS', () => {
    assert.ok(body.includes('__BACKFILL_WAVE1_MECHANISMS__'), 'missing __BACKFILL_WAVE1_MECHANISMS__ token');
  });

  it('has BACKFILL token: WAVE1_TRENDS', () => {
    assert.ok(body.includes('__BACKFILL_WAVE1_TRENDS__'), 'missing __BACKFILL_WAVE1_TRENDS__ token');
  });

  it('has BACKFILL token: WAVE2_JUDGMENT', () => {
    assert.ok(body.includes('__BACKFILL_WAVE2_JUDGMENT__'), 'missing __BACKFILL_WAVE2_JUDGMENT__ token');
  });

  it('has BACKFILL token: PENDING_QUESTIONS', () => {
    assert.ok(body.includes('__BACKFILL_PENDING_QUESTIONS__'), 'missing __BACKFILL_PENDING_QUESTIONS__ token');
  });

  it('backfill mechanism documented: grep + replace token, not append', () => {
    assert.ok(body.includes('替换') && body.includes('token'), 'missing grep+replace instruction');
    assert.ok(body.includes('不追加'), 'missing 不追加 instruction');
  });

  it('declares seed-topics gate does not check append zone', () => {
    assert.ok(body.includes('gate 不检查正文完整性') || body.includes('gate 不检查轮次追加区'), 'missing gate non-check declaration');
  });
});

// ── file naming convention: {slug}.md (slug already has {XX}_ prefix) ─

describe('seed topic file naming convention', () => {
  it('documents filename = {slug}.md (slug from registry, already has index prefix)', () => {
    assert.ok(
      body.includes('{slug}.md') || body.includes('{topic.slug}.md'),
      'missing {slug}.md naming convention'
    );
  });

  it('slug includes {index}_ prefix generated by HITL1 in topic_registry', () => {
    assert.ok(
      body.includes('编号前缀') || body.includes('{index}_'),
      'missing index prefix documentation'
    );
  });

  it('index is zero-padded to 2 digits (01_, 02_, …)', () => {
    assert.ok(
      body.includes('补零') || (body.includes('01') && body.includes('02')),
      'missing zero-padding rule (补零到 2 位, 01_/02_/…)'
    );
  });

  it('frontmatter uses YAML format (YAML 1.2, gate parses with parseYaml)', () => {
    assert.ok(
      body.includes('YAML'),
      'missing YAML frontmatter format requirement'
    );
  });

  it('frontmatter slug matches filename stem byte-for-byte', () => {
    assert.ok(
      body.includes('文件名 stem 一致') || body.includes('slug 与文件名'),
      'missing slug/filename-stem consistency requirement'
    );
  });

  it('task card template uses {topic.slug}.md in file paths', () => {
    assert.ok(
      body.includes('seed_topics/{topic.slug}.md'),
      'task card template missing {topic.slug}.md file path'
    );
  });
});

// ── §4-§9 integrity ──────────────────────────────────────────────────

describe('§4-§9 content integrity', () => {
  it('§4 lists seed_topics/ directory and trace event', () => {
    assert.ok(body.includes('seed_topics/'), '§4 missing seed_topics/ reference');
    assert.ok(body.includes('seed_topics_completion'), '§4 missing trace event');
  });

  it('§8 declares stop: no with agent autonomy', () => {
    assert.ok(body.includes('stop: no'), '§8 missing stop behavior');
  });

  it('§9 has ≥2 phase-specific anti-cheating rules', () => {
    const acSection = body.slice(body.indexOf('## 9. Anti-Cheating Rules'));
    const banCount = (acSection.match(/禁止/g) || []).length;
    assert.ok(banCount >= 2, `expected ≥2 bans, found ${banCount}`);
  });
});
