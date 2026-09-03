// @impl INT-001: validate-bundle.mjs integration test
import { describe, it, before, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const FIXTURE = join(process.cwd(), 'tests/fixtures/DEEP_RESEARCH_HARNESS');
const VALIDATE = join(FIXTURE, 'cli/validate-bundle.mjs');
const PRODUCTION_VALIDATE = join(process.cwd(), 'DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs');
const NEW_BUNDLE = join(process.cwd(), 'experiments_env/shared/new-disposable-bundle.mjs');

describe('validate-bundle.mjs integration', () => {
  let tmpDir;

  before(() => {
    tmpDir = createTempDir('validate-bundle');
    cpSync(FIXTURE, join(tmpDir, 'DEEP_RESEARCH_HARNESS'), { recursive: true });
  });

  after(cleanupAll);

  it('passes on valid bundle', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_valid');
    mkdirSync(bundleDir, { recursive: true });
    copyTemplates(bundleDir, 'valid');
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), '');
    const result = spawnSync('node', [VALIDATE, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected exit 0, got ${result.status}\n${result.stdout}`);
    const status = JSON.parse(readFileSync(join(bundleDir, 'rb_status.json'), 'utf-8'));
    assert.equal(status.current_node, null);
  });

  it('passes with populated current_node', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_current_node_populated');
    mkdirSync(bundleDir, { recursive: true });
    copyTemplates(bundleDir, 'current-node-populated');
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), '');
    const statusPath = join(bundleDir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.current_node = 'phases/phase-wave1.md';
    writeFileSync(statusPath, JSON.stringify(status));
    const result = spawnSync('node', [VALIDATE, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected exit 0, got ${result.status}\n${result.stdout}`);
  });

  it('passes with legacy status missing current_node', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_legacy_current_node_absent');
    mkdirSync(bundleDir, { recursive: true });
    copyTemplates(bundleDir, 'legacy-current-node-absent');
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), '');
    const statusPath = join(bundleDir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    delete status.current_node;
    writeFileSync(statusPath, JSON.stringify(status));
    const result = spawnSync('node', [VALIDATE, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected exit 0, got ${result.status}\n${result.stdout}`);
  });

  it('fails on invalid bundle (bad enum)', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_invalid');
    mkdirSync(bundleDir, { recursive: true });
    copyTemplates(bundleDir, 'invalid');
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), '');
    writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'not_started', current_gate: 'invalid_value', next_gate: 'seed_topics_ready' }));
    const result = spawnSync('node', [VALIDATE, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 1) throw new Error(`Expected exit 1, got ${result.status}\n${result.stdout}`);
  });

  it('rejects a retired access envelope through the production ProfileSchema reader', () => {
    const bundlesRoot = join(tmpDir, 'production-bundles');
    const created = spawnSync('node', [NEW_BUNDLE, 'legacy-access', '--force', '--target-dir', bundlesRoot], { encoding: 'utf-8', timeout: 10000 });
    assert.equal(created.status, 0, created.stderr);
    const bundleDir = created.stdout.trim();
    const profilePath = join(bundleDir, 'rb_profile.yaml');
    const profile = parseYaml(readFileSync(profilePath, 'utf-8'));
    profile.research_access = {
      status: 'available',
      probed_at: '2026-07-10T00:00:00.000Z',
      result_url: 'https://fixture.news-research.com/old-envelope',
      fetch_outcome: 'success',
    };
    writeFileSync(profilePath, stringifyYaml(profile));

    const result = spawnSync('node', [PRODUCTION_VALIDATE, bundleDir], { encoding: 'utf-8', timeout: 5000 });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /rb_profile\.yaml/);
  });

  it('rejects an old mutable plan through the existing PlanSchema reader', () => {
    const bundlesRoot = join(tmpDir, 'old-plan-bundles');
    const created = spawnSync('node', [NEW_BUNDLE, 'old-plan', '--force', '--target-dir', bundlesRoot], { encoding: 'utf-8', timeout: 10000 });
    assert.equal(created.status, 0, created.stderr);
    const bundleDir = created.stdout.trim();
    writeFileSync(join(bundleDir, 'rb_plan.md'), '---\nplan_basename: old-plan\nderived_topic_count: 1\ntopic_registry:\n  - id: "01"\n    slug: topic-a\n    title: Topic A\n---\n# Historical plan\n');
    const result = spawnSync('node', [PRODUCTION_VALIDATE, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /rb_plan\.md/);
    assert.doesNotMatch(result.stdout, /migrat|adopt|upgrade|convert/i);
  });
});

function copyTemplates(bundleDir, prefix) {
  const templates = join(FIXTURE, 'rb_templates');
  const profile = prefix === 'invalid' ? 'rb_profile.yaml.tmpl' : null;
  for (const f of ['BUNDLE_MAP.md.tmpl', 'rb_plan.md.tmpl', 'rb_profile.yaml.tmpl', 'rb_status.json.tmpl', 'rb_queue.json.tmpl']) {
    const content = readFileSync(join(templates, f), 'utf-8').replace(/\{\{name\}\}/g, `${prefix}_test`);
    const dest = join(bundleDir, f.replace('.tmpl', ''));
    writeFileSync(dest, content);
  }
}
