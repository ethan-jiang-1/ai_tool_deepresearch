// @impl INT-001: check.mjs integration test
import { describe, it, before, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE = join(process.cwd(), 'tests/fixtures/DPT_FRAMEWORK');
const CHECK = join(FIXTURE, 'cli/check.mjs');

describe('check.mjs integration', () => {
  let tmpDir;

  before(() => {
    tmpDir = mkdtempSync('dpt_rb_test_');
    cpSync(FIXTURE, join(tmpDir, 'DPT_FRAMEWORK'), { recursive: true });
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes on valid bundle', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_valid');
    mkdirSync(bundleDir, { recursive: true });
    copyTemplates(bundleDir, 'valid');
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), '');
    const result = spawnSync('node', [CHECK, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected exit 0, got ${result.status}\n${result.stdout}`);
  });

  it('fails on invalid bundle (bad enum)', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_invalid');
    mkdirSync(bundleDir, { recursive: true });
    copyTemplates(bundleDir, 'invalid');
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), '');
    writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'not_started', current_gate: 'invalid_value', next_gate: 'wave0_complete' }));
    const result = spawnSync('node', [CHECK, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 1) throw new Error(`Expected exit 1, got ${result.status}\n${result.stdout}`);
  });
});

function copyTemplates(bundleDir, prefix) {
  const templates = join(FIXTURE, 'rb_templates');
  const profile = prefix === 'invalid' ? 'rb_profile.yaml.tmpl' : null;
  for (const f of ['START_FROM_HERE.md.tmpl', 'rb_plan.md.tmpl', 'rb_profile.yaml.tmpl', 'rb_status.json.tmpl', 'rb_queue.json.tmpl']) {
    const content = readFileSync(join(templates, f), 'utf-8').replace(/\{\{name\}\}/g, `${prefix}_test`);
    const dest = join(bundleDir, f.replace('.tmpl', ''));
    writeFileSync(dest, content);
  }
}
