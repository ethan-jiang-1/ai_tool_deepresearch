// @impl REA-002, PRG-010
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
const SENTINEL = 'https://fixture.test/hitl1-probe-sentinel';

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
  it('evaluates test-controlled partial and zero-reachability profiles without persisting probe material', () => {
    const partial = evaluateFixture({
      status: 'available',
      probed_at: '2026-07-31T00:00:00.000Z',
      result_url: SENTINEL,
      fetch_outcome: 'success',
      source_class_reachability: [
        { source_class: 'encyclopedia', reachability: 'unreachable' },
        { source_class: 'code_host', reachability: 'reachable' },
        { source_class: 'general_web', reachability: 'not_attempted' },
      ],
      access_boundary: { location: 'network_path', extent: 'class_scoped' },
    });
    const zero = evaluateFixture({
      status: 'unavailable',
      probed_at: '2026-07-31T00:00:00.000Z',
      fetch_outcome: 'blocked',
      reason: 'Fixture has no reachable declared source class.',
      source_class_reachability: [
        { source_class: 'encyclopedia', reachability: 'unreachable' },
        { source_class: 'code_host', reachability: 'unreachable' },
        { source_class: 'general_web', reachability: 'unreachable' },
      ],
      access_boundary: { location: 'network_path', extent: 'universal' },
    });

    try {
      assert.equal(partial.gate.check.passed, true);
      assert.equal(partial.gate.check.next, 'phases/phase-setup.md');
      assert.deepEqual(parseYaml(readFileSync(join(partial.bundle, 'rb_profile.yaml'), 'utf8')).research_access, partial.input.research_access);

      assert.equal(zero.gate.check.passed, false);
      assert.equal(zero.gate.check.next, null);
      assert.equal(zero.gate.hints.find((hint) => hint.rule_id === 'research_access_available')?.repair_kind, 'external_action');
      assert.deepEqual(parseYaml(readFileSync(join(zero.bundle, 'rb_profile.yaml'), 'utf8')).research_access, zero.input.research_access);
      assert.deepEqual(parseYaml(readFileSync(join(zero.bundle, 'rb_profile.yaml'), 'utf8')).human_decision_checkpoints.hitl1, zero.input.human_decision_checkpoints.hitl1);

      for (const run of [partial, zero]) {
        for (const surface of [
          'reference',
          '_cache',
          'artifacts',
          '_work_units',
          'rb_work_unit_ledger.jsonl',
          'rb_output_declarations.jsonl',
        ]) {
          for (const file of filesUnder(join(run.bundle, surface))) {
            assert.ok(!readFileSync(file, 'utf8').includes(SENTINEL), `${surface} leaked test-controlled probe material into ${file}`);
          }
        }
      }
    } finally {
      rmSync(partial.root, { recursive: true, force: true });
      rmSync(zero.root, { recursive: true, force: true });
    }
  });
});
