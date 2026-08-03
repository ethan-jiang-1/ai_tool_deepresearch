// @impl AGT-003, EXR-006, EXO-002, EXA-003, EXA-005, EXA-006, EXA-008, VER-006
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  referenceContent,
  sourceYamlContent,
  writeFixtureResultForWorkUnit,
} from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';

const CASE = 'experiments_playbook/exp_engine-boundary/case-406-heavy-real-subagent-boundary.md';
const FIXTURE_RUNNER = 'experiments_env/shared/run-fixture-backed-case.mjs';
const HEALTH_VERIFIER = 'experiments_env/shared/verify-bundle-health.mjs';
const REPO = path.resolve(new URL('../../..', import.meta.url).pathname);

function runCase(args) {
  return spawnSync(process.execPath, [path.join(REPO, FIXTURE_RUNNER), ...args], {
    cwd: REPO,
    encoding: 'utf8',
  });
}

function traceEvents(bundleDir) {
  return readFileSync(path.join(bundleDir, 'rb_trace.jsonl'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function runHealth(bundleDir, profile) {
  return spawnSync(process.execPath, [
    path.join(REPO, HEALTH_VERIFIER),
    '--bundle', bundleDir,
    '--profile', profile,
    '--json',
  ], {
    cwd: REPO,
    encoding: 'utf8',
  });
}

describe('case-406 native Sub-agent contract', () => {
  it('keeps the no-network local task boundary while stopping before Wave0 readiness', () => {
    const playbook = readFileSync(CASE, 'utf8');
    const runner = readFileSync(FIXTURE_RUNNER, 'utf8');
    assert.match(playbook, /health_profile: light/);
    assert.match(playbook, /neither the Playbook Agent nor Subject Sub-agent may invoke WebSearch, WebFetch, curl, wget, or another network client/);
    assert.match(runner, /case406LocalSourceFixture/);
    assert.match(runner, /_fixtures\/case-406-local-source\.md/);
    assert.match(runner, /task_brief: spec\.taskBrief/);
    assert.match(runner, /Do not invoke WebSearch, WebFetch, curl, wget, or any other network client/);
    assert.match(runner, /reference\/00-shared-agentic-coding-tools\.md/);
    assert.match(runner, /artifacts\/wave0\/agentic-coding-tools\/source\.yaml/);
    assert.match(runner, /acceptance_status: accepted/);
    assert.match(runner, /overrides any generic rich-reference template formatting/);
    assert.match(runner, /do not use `\*\*`, heading-style labels, or YAML frontmatter/);
    assert.match(runner, /`## Key Facts`, `## Core Content Capture`, `## Relevance To This Research`, `## Quotable Terms \/ Concepts`, and `## Risks And Limitations`/);
    assert.match(runner, /source-YAML output must be a top-level YAML array/);
    assert.match(runner, /Do not write `schema_version:`, `sources:`, `wave:`, or `topic:` as a top-level wrapper/);
    assert.match(playbook, /does not assert Wave0 readiness or a Wave0 Gate pass/);
    assert.doesNotMatch(playbook, /wave0-gate-pass/);
    const realSubagent = runner.slice(runner.indexOf('function realSubagentCase'), runner.indexOf('function case406LocalSourceFixture'));
    assert.doesNotMatch(realSubagent, /runWave0Gate/);
    assert.doesNotMatch(realSubagent, /wave0-gate-pass/);
    const case406 = runner.slice(runner.indexOf("'case-406':"), runner.indexOf("'case-604':"));
    assert.doesNotMatch(case406, /wave0-gate-pass/);
    assert.doesNotMatch(case406, /writeFixtureResultForWorkUnit/);
  });

  it('renders the exact no-network task brief into a fresh case-406 work-unit envelope', () => {
    const target = mkdtempSync(path.join(tmpdir(), 'case-406-task-contract-'));
    try {
      const result = runCase(['--case', 'case-406', '--prepare-only', '--target-dir', target]);
      assert.equal(result.status, 0, result.stderr);
      const prepared = JSON.parse(result.stdout);
      const task = readFileSync(prepared.prepared.task_path, 'utf8');
      assert.match(task, /Do not invoke WebSearch, WebFetch, curl, wget, or any other network client/);
      assert.match(task, /reference\/00-shared-agentic-coding-tools\.md/);
      assert.match(task, /artifacts\/wave0\/agentic-coding-tools\/source\.yaml/);
      assert.match(task, /- acceptance_status: accepted/);
      assert.match(task, /do not use `\*\*`, heading-style labels, or YAML frontmatter/);
      assert.match(task, /## Key Facts/);
      assert.match(task, /top-level YAML array/);
      assert.match(task, /- url:/);
      assert.match(task, /topic_tag: agentic-coding-tools/);
      assert.doesNotMatch(task, /_work_units\/wave0\/[^\s`]+\/outputs\//);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it('keeps synthetic Wave0 trace as the default for another real-subagent fixture', () => {
    const target = mkdtempSync(path.join(tmpdir(), 'case-604-default-wave0-trace-'));
    try {
      const result = runCase(['--case', 'case-604', '--prepare-only', '--target-dir', target]);
      assert.equal(result.status, 0, result.stderr);
      const prepared = JSON.parse(result.stdout);
      const events = traceEvents(prepared.bundle);
      assert.equal(events.some((event) => event.event === 'gate_attempt' && event.gate === 'seed-topics-ready'), true);
      assert.equal(events.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-wave0.md'), true);
      assert.equal(events.some((event) => event.event === 'wave0_completion'), true);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it('submits a test-owned envelope without fixture Wave0 facts or Gate health', () => {
    const target = mkdtempSync(path.join(tmpdir(), 'case-406-actor-checkpoint-'));
    try {
      const preparedRun = runCase(['--case', 'case-406', '--prepare-only', '--target-dir', target]);
      assert.equal(preparedRun.status, 0, preparedRun.stderr);
      const prepared = JSON.parse(preparedRun.stdout);
      const sourceUrl = 'https://fixtures.example.invalid/case-406/deterministic-contract';

      // These bytes prove only the deterministic submit/checkpoint boundary, never Subject Actor behavior.
      const fixture = writeFixtureResultForWorkUnit(prepared.bundle, {
        work_id: prepared.prepared.work_id,
        output_path: 'reference/00-shared-agentic-coding-tools.md',
        source_url: sourceUrl,
        source_slug: 'case406-contract',
        output_content: referenceContent({
          source_url: sourceUrl,
          topic_slug: 'agentic-coding-tools',
          title: 'Case 406 Deterministic Contract Source',
        }),
        extra_output_files: [{
          path: 'artifacts/wave0/agentic-coding-tools/source.yaml',
          role: 'source_yaml',
          content: sourceYamlContent({
            source_url: sourceUrl,
            topic_slug: 'agentic-coding-tools',
            title: 'Case 406 Deterministic Contract Source',
          }),
        }],
      });

      const submittedRun = runCase([
        '--case', 'case-406', '--bundle', prepared.bundle, '--real-result', fixture.resultPath,
      ]);
      assert.equal(submittedRun.status, 0, submittedRun.stderr);
      assert.equal(JSON.parse(submittedRun.stdout).verdict, 'PASS');

      const verdict = JSON.parse(readFileSync(path.join(prepared.bundle, 'case-406-verdict.json'), 'utf8'));
      assert.deepEqual(verdict.checks.map((check) => check.label), [
        'real-subagent-task-bound',
        'real-subagent-result-written',
        'real-subagent-receipt-nonce-preserved',
        'real-subagent-output-written',
        'real-subagent-submit-succeeded',
        'work-unit-submit-traced',
      ]);
      assert.equal(existsSync(path.join(prepared.bundle, 'gate-wave0.json')), false);
      const events = traceEvents(prepared.bundle);
      assert.equal(events.some((event) => event.event === 'gate_attempt' && event.gate === 'seed-topics-ready'), false);
      assert.equal(events.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-wave0.md'), false);
      assert.equal(events.some((event) => event.event === 'wave0_completion'), false);
      assert.equal(events.some((event) => event.event === 'gate_attempt' && event.gate === 'wave0-complete'), false);
      assert.equal(events.some((event) => event.event === 'check' && event.gate === 'wave0-gate-pass'), false);
      assert.equal(existsSync(path.join(prepared.bundle, '_observability', 'gates')), false);

      const healthRun = runHealth(prepared.bundle, 'light');
      assert.equal(healthRun.status, 0, healthRun.stderr);
      const health = JSON.parse(healthRun.stdout);
      assert.equal(health.status, 'clean');
      assert.equal(health.gate_attempts.required, false);
      assert.equal(health.timeline.required, false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
