// @impl PRP-015, PRG-010
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { stringify as stringifyYaml } from 'yaml';

const ROOT = process.cwd();
const NEW_BUNDLE = join(ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const STYLE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs');
const ADVANCE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/advance-status.mjs');
const GATE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs');
const PHASE = join(ROOT, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md');
const ADAPTER = join(ROOT, 'DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md');

function command(script, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
  if (!allowFailure) assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function materializeTopic(bundle) {
  const planPath = join(bundle, 'rb_plan.md');
  const body = readFileSync(planPath, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
  writeFileSync(planPath, `---\nplan_basename: adapter\nderived_topic_count: 1\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n    id: "01"\n    slug: 01_adapter\n    title: Adapter\n    must_answer: ["Can research access run?"]\n    scope_role: primary\n    depends_on_topic_uids: []\n---\n${body}`);
  mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
  writeFileSync(join(bundle, 'seed_topics/01_adapter.md'), '---\ntopic_uid: tp_123e4567-e89b-12d3-a456-426614174000\nid: "01"\nslug: 01_adapter\ntitle: Adapter\nmust_answer: ["Can research access run?"]\nscope_role: primary\ndepends_on_topic_uids: []\n---\n# Adapter\n');
}

function profile(access) {
  return {
    plan_basename: 'adapter',
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

function preparedBundle(access) {
  const root = mkdtempSync(join(tmpdir(), 'hitl1-adapter-integration-'));
  const bundle = command(NEW_BUNDLE, ['adapter', '--force', '--target-dir', root]);
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml(profile(access)));
  materializeTopic(bundle);
  command(STYLE, ['--bundle', bundle, '--style', 'quick_factual']);
  command(ADVANCE, ['--bundle', bundle, '--to', 'hitl1_recorded']);
  return { root, bundle };
}

function gate(bundle) {
  const output = command(GATE, ['--bundle', bundle, '--current-node', 'phases/phase-hitl1.md'], { allowFailure: true });
  return JSON.parse(output);
}

describe('HITL1 selected research-access adapter integration', () => {
  it('projects classified selected-adapter boundaries without authorizing Setup', () => {
    for (const [location, owner, repairKind] of [
      ['host_surface', 'selected Claude CLI host runtime', 'external_action'],
      ['host_policy', 'selected Claude CLI host policy', 'external_action'],
      ['network_path', 'network environment', 'external_action'],
      ['probe_relay', 'Agent', 'agent_action'],
    ]) {
      const run = preparedBundle({
        status: 'unavailable',
        probed_at: '2026-07-31T00:00:00.000Z',
        fetch_outcome: 'not_attempted',
        reason: 'Direct fixture observation.',
        eligible_candidate_count: 0,
        access_boundary: { location, extent: 'universal' },
      });
      try {
        const output = gate(run.bundle);
        const hint = output.hints.find((candidate) => candidate.rule_id === 'research_access_available');

        assert.equal(output.check.passed, false);
        assert.equal(output.check.next, null);
        assert.notEqual(output.routing.kind, 'next');
        assert.equal(hint.repair_kind, repairKind);
        assert.match(hint.missing_fact, /Selected research-access adapter recorded/);
        assert.match(hint.write_to, /research-access-adapter\.md/);
        assert.match(hint.write_to, new RegExp(owner));
        assert.match(hint.rerun, /check-gate-hitl1-recorded/);
      } finally {
        rmSync(run.root, { recursive: true, force: true });
      }
    }
  });

  it('keeps the existing available observation Gate path unchanged', () => {
    const run = preparedBundle({
      status: 'available',
      probed_at: '2026-07-31T00:00:00.000Z',
      result_url: 'https://example.com/returned',
      fetch_outcome: 'success',
      search_surface: 'WebSearch',
      fetch_surface: 'WebFetch',
      eligible_candidate_count: 1,
      final_candidate_ordinal: 1,
    });
    try {
      const output = gate(run.bundle);

      assert.equal(output.check.passed, true);
      assert.equal(output.hints.length, 0);
      assert.equal(output.check.next, 'phases/phase-setup.md');
    } finally {
      rmSync(run.root, { recursive: true, force: true });
    }
  });

  it('keeps controller content out of the selected adapter contract', () => {
    const phase = readFileSync(PHASE, 'utf8');
    const adapter = readFileSync(ADAPTER, 'utf8');

    assert.match(phase, /research-access-adapter\.md/);
    assert.match(phase, /shared-hitl1-research-access-envelope\.md/);
    assert.match(phase, /不要求用户重复回答 HITL1 choices、运行 `curl` 或手改 profile/);
    for (const forbidden of [
      /unavailable_roots/,
      /source_class_reachability/,
      /encyclopedia/,
      /code_host/,
      /general_web/,
      /Internet protocol suite/,
      /Hello World/,
      /access_boundary/,
      /first-success/i,
      /return map/i,
      /curl --fail/,
    ]) {
      assert.doesNotMatch(adapter, forbidden);
    }
    assert.match(adapter, /deepseek_anthropic_compatible/);
    assert.match(adapter, /WebSearch/);
    assert.match(adapter, /WebFetch/);
  });
});
