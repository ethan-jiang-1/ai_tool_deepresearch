// @impl EXA-003, EXA-005, EXA-006, EXA-008, VER-006
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

const CASE = 'experiments_playbook/exp_engine-boundary/case-406-heavy-real-subagent-boundary.md';
const FIXTURE_RUNNER = 'experiments_env/shared/run-fixture-backed-case.mjs';
const REPO = path.resolve(new URL('../../..', import.meta.url).pathname);

describe('case-406 native Sub-agent contract', () => {
  it('passes the no-network local fixture boundary and gate-owned outputs through the immutable work-unit task', () => {
    const playbook = readFileSync(CASE, 'utf8');
    const runner = readFileSync(FIXTURE_RUNNER, 'utf8');
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
    assert.match(runner, /runWave0Gate\(bundleDir, 'gate-wave0\.json', \{ monitored: true \}\)/);
    const case406 = runner.slice(runner.indexOf("'case-406':"), runner.indexOf("'case-604':"));
    assert.doesNotMatch(case406, /writeFixtureResultForWorkUnit/);
  });

  it('renders the exact no-network task brief into a fresh case-406 work-unit envelope', () => {
    const target = mkdtempSync(path.join(tmpdir(), 'case-406-task-contract-'));
    try {
      const result = spawnSync(process.execPath, [
        path.join(REPO, FIXTURE_RUNNER), '--case', 'case-406', '--prepare-only', '--target-dir', target,
      ], { cwd: REPO, encoding: 'utf8' });
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
});
