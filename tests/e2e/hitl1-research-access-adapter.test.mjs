// @impl REA-002, REA-003, PRP-015, PRG-010
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
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => filesUnder(join(path, name)));
}

describe('HITL1 selected adapter unavailable loop', () => {
  it('retains HITL1 semantics and records only the direct unavailable observation', () => {
    const root = mkdtempSync(join(tmpdir(), 'hitl1-adapter-e2e-'));
    const bundle = command(NEW_BUNDLE, ['adapter-e2e', '--force', '--target-dir', root]);
    const access = {
      status: 'unavailable',
      probed_at: '2026-07-31T00:00:00.000Z',
      fetch_outcome: 'not_attempted',
      reason: 'surface_absent: WebSearch is not callable in the selected host.',
      eligible_candidate_count: 0,
    };
    const profile = {
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

    try {
      writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml(profile));
      materializeTopic(bundle);
      command(STYLE, ['--bundle', bundle, '--style', 'quick_factual']);
      command(ADVANCE, ['--bundle', bundle, '--to', 'hitl1_recorded']);

      const gate = JSON.parse(command(GATE, ['--bundle', bundle, '--current-node', 'phases/phase-hitl1.md'], { allowFailure: true }));
      const retained = awaitProfile(bundle);
      const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');

      assert.equal(gate.check.passed, false);
      assert.equal(gate.check.next, null);
      assert.equal(gate.hints.find((hint) => hint.rule_id === 'research_access_available')?.repair_kind, 'external_action');
      assert.deepEqual(retained.human_decision_checkpoints.hitl1, profile.human_decision_checkpoints.hitl1);
      assert.equal(retained.research_profile, profile.research_profile);
      assert.deepEqual(retained.root_must_answer_set, profile.root_must_answer_set);
      assert.deepEqual(retained.research_access, access);
      assert.ok(!trace.includes('phases/phase-setup.md'));

      for (const surface of ['reference', '_cache', 'artifacts', '_work_units']) {
        for (const file of filesUnder(join(bundle, surface))) {
          assert.ok(!readFileSync(file, 'utf8').includes('surface_absent:'), `${surface} leaked probe output into ${file}`);
        }
      }
      const declarations = join(bundle, 'rb_output_declarations.jsonl');
      assert.ok(!existsSync(declarations) || !readFileSync(declarations, 'utf8').includes('surface_absent:'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function awaitProfile(bundle) {
  return parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
}
