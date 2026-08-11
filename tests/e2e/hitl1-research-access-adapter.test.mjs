// @impl REA-002, REA-003, PRG-002, PRG-010, PRP-002
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const ROOT = process.cwd();
const NEW_BUNDLE = join(ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const STYLE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs');
const ADVANCE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/advance-status.mjs');
const GATE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs');

const DIRECT_SAMPLE_IDS = [
  'gov_cn', 'gitee', 'xinhuanet', 'cnki_catalog',
  'wikipedia', 'github', 'iana', 'arxiv', 'rfc_editor',
];
const DIRECT_SAMPLE_GROUPS = {
  gov_cn: 'china', gitee: 'china', xinhuanet: 'china', cnki_catalog: 'china',
  wikipedia: 'overseas', github: 'overseas', iana: 'overseas', arxiv: 'overseas',
  rfc_editor: 'overseas',
};

function command(script, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
  if (!allowFailure) assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function materializeTopic(bundle) {
  const planPath = join(bundle, 'rb_plan.md');
  const body = readFileSync(planPath, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
  writeFileSync(planPath, `---\nplan_basename: adapter-e2e\nderived_topic_count: 1\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174001\n    id: "01"\n    slug: 01_adapter-e2e\n    title: Adapter E2E\n    must_answer: ["Can research access run?"]\n    scope_role: primary\n    depends_on_topic_uids: []\n---\n${body}`);
  mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
  writeFileSync(join(bundle, 'seed_topics/01_adapter-e2e.md'), '---\ntopic_uid: tp_123e4567-e89b-12d3-a456-426614174001\nid: "01"\nslug: 01_adapter-e2e\ntitle: Adapter E2E\nmust_answer: ["Can research access run?"]\nscope_role: primary\ndepends_on_topic_uids: []\n---\n# Adapter E2E\n');
}

function filesUnder(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => filesUnder(join(path, name)));
}

function currentDirectObservation({ content = false, reason }) {
  const observations = DIRECT_SAMPLE_IDS.map((sampleId) => {
    const entry = {
      sample_id: sampleId,
      source_group: DIRECT_SAMPLE_GROUPS[sampleId],
      outcome: content ? 'content' : 'transport_inconclusive',
    };
    if (content) entry.retrieval_surface = 'native';
    return entry;
  });
  const access = {
    status: content ? 'available' : 'unavailable',
    probed_at: '2026-08-11T00:00:00.000Z',
    sample_observations: observations,
  };
  if (reason) access.reason = reason;
  return access;
}

function profile(access) {
  return {
    plan_basename: 'adapter-e2e',
    research_profile: 'quick_factual',
    root_must_answer_set: ['Can research access run?'],
    research_access: access,
    human_decision_checkpoints: {
      hitl1: { status: 'recorded', recorded_at: '2026-07-31T00:00:00.000Z' },
      hitl2: {
        status: 'not_started',
        answerability_class: 'not_assessed',
        user_decision: 'not_started',
        final_report_view: 'not_started',
      },
    },
  };
}

function evaluateFixture(access) {
  const root = mkdtempSync(join(tmpdir(), 'hitl1-adapter-e2e-'));
  const bundle = command(NEW_BUNDLE, ['adapter-e2e', '--force', '--target-dir', root]);
  const input = profile(access);
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml(input));
  materializeTopic(bundle);
  command(STYLE, ['--bundle', bundle, '--style', 'quick_factual']);
  command(ADVANCE, ['--bundle', bundle, '--to', 'hitl1_recorded']);
  const gate = JSON.parse(command(GATE, ['--bundle', bundle, '--current-node', 'phases/phase-hitl1.md'], { allowFailure: true }));
  return { root, bundle, input, gate };
}

describe('HITL1 research-access envelope deterministic loop', () => {
  it('retains a completed current observation and existing HITL1 choices through the Gate', () => {
    const available = evaluateFixture(currentDirectObservation({ content: true }));
    const unavailable = evaluateFixture(currentDirectObservation({
      reason: 'No core sample returned real content this round.',
    }));

    try {
      assert.equal(available.gate.check.passed, true, JSON.stringify(available.gate.inspect));
      assert.equal(available.gate.check.next, 'phases/phase-setup.md');
      assert.deepEqual(
        parseYaml(readFileSync(join(available.bundle, 'rb_profile.yaml'), 'utf8')).research_access,
        available.input.research_access,
      );
      assert.deepEqual(
        parseYaml(readFileSync(join(available.bundle, 'rb_profile.yaml'), 'utf8')).human_decision_checkpoints.hitl1,
        available.input.human_decision_checkpoints.hitl1,
      );

      // A completed unavailable current observation takes the same existing Gate
      // path: the Phase has already resolved materiality, so no availability
      // threshold blocks it and no provider/network verdict is emitted.
      assert.equal(unavailable.gate.check.passed, true, JSON.stringify(unavailable.gate.inspect));
      assert.equal(unavailable.gate.check.next, 'phases/phase-setup.md');
      assert.equal(unavailable.gate.hints.length, 0);
      assert.deepEqual(
        parseYaml(readFileSync(join(unavailable.bundle, 'rb_profile.yaml'), 'utf8')).research_access,
        unavailable.input.research_access,
      );
      assert.deepEqual(
        parseYaml(readFileSync(join(unavailable.bundle, 'rb_profile.yaml'), 'utf8')).human_decision_checkpoints.hitl1,
        unavailable.input.human_decision_checkpoints.hitl1,
      );
    } finally {
      rmSync(available.root, { recursive: true, force: true });
      rmSync(unavailable.root, { recursive: true, force: true });
    }
  });

  it('rejects unprobed access without authorizing Setup', () => {
    const unprobed = evaluateFixture({ status: 'unprobed' });

    try {
      assert.equal(unprobed.gate.check.passed, false);
      assert.equal(unprobed.gate.check.next, null);
      assert.notEqual(unprobed.gate.routing.kind, 'next');
      assert.equal(
        unprobed.gate.hints.find((hint) => hint.rule_id === 'research_access_available')?.repair_kind,
        'agent_action',
      );
    } finally {
      rmSync(unprobed.root, { recursive: true, force: true });
    }
  });

  it('proves Gate evaluation creates no probe evidence, cache, artifact, receipt, or ledger side effect', () => {
    const run = evaluateFixture(currentDirectObservation({ content: true }));
    const surfaces = [
      'reference',
      '_cache',
      'artifacts',
      '_work_units',
      'rb_work_unit_ledger.jsonl',
      'rb_output_declarations.jsonl',
    ];

    try {
      assert.equal(run.gate.check.passed, true);
      for (const surface of surfaces) {
        const files = filesUnder(join(run.bundle, surface));
        for (const file of files) {
          const text = readFileSync(file, 'utf8');
          assert.ok(!text.includes('gov_cn'), `${surface} leaked sample material into ${file}`);
          assert.ok(!text.includes('https://www.gov.cn/'), `${surface} leaked a sample URL into ${file}`);
        }
      }
      // A completed observation never yields Claude/Search/Fetch feedback.
      for (const hint of run.gate.hints) {
        assert.equal(/Claude|WebSearch|WebFetch|selected adapter/i.test(hint.missing_fact || ''), false);
      }
    } finally {
      rmSync(run.root, { recursive: true, force: true });
    }
  });
});
