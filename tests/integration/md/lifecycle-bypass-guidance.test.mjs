// @impl SWE-007, PHS-010, CDP-009, CPT-006
// Static guidance validation (doc-lock) for the lifecycle-bypass detection
// change: integrity-consumption duties on the fatigue path, terminal-fact
// completion-claim backing, Engine-owned Progress wording, premature-final
// blocking/remediation wording, and the discoverable audit CLI entry.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = join(import.meta.dirname, '../../..');

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf-8');
}

const WAVE_PHASES = [
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md',
];

describe('lifecycle bypass guidance doc-locks', () => {
  for (const rel of WAVE_PHASES) {
    it(`consumes integrity before synthesis and backs completion claims: ${rel}`, () => {
      const text = read(rel);
      assert.match(text, /疲劳阈值、换策略、以及合成任何 final 报告内容之前，必须先获取并消费最新 lifecycle-integrity 判定/);
      assert.match(text, /cli\/audit-phase-status\.mjs/);
      assert.match(text, /premature_final_present/);
      assert.match(text, /plan_progress_tamper_suspected/);
      assert.match(text, /完成宣告 backing/);
      assert.match(text, /terminal status \+ integrity `passed`/);
      assert.match(text, /禁止转向 final 合成或任何绕过/);
    });

    it(`names premature blocking and the single legal remediation: ${rel}`, () => {
      const text = read(rel);
      assert.match(text, /premature_final_present.*阻断 wave gate/s);
      assert.match(text, /final\/attic-<原名>/);
      assert.match(text, /Engine 不会代为移动或删除/);
    });
  }

  it('requires terminal-fact backing for completion claims in start-research', () => {
    const text = read('DEEP_RESEARCH_HARNESS/command_playbook/start-research.md');
    assert.match(text, /完成宣告 backing（SWE-007\/CPT-006）/);
    assert.match(text, /terminal status/);
    assert.match(text, /integrity `passed`/);
    assert.match(text, /不构成完成/);
    assert.match(text, /疲劳阈值、换策略、合成 final 内容前同样先消费该判定/);
  });

  it('points resume entry at the audit as the one-command truth surface', () => {
    const text = read('DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md');
    assert.match(text, /DPT_LIFECYCLE_INTEGRITY/);
    assert.match(text, /audit-phase-status\.mjs --bundle <bundle>/);
    assert.match(text, /presentation, not completion evidence/);
  });

  it('declares Progress checkboxes Engine-owned and tamper-evident in the host-file template', () => {
    const text = read('DEEP_RESEARCH_HARNESS/rb_templates/rb_plan.md.tmpl');
    assert.match(text, /Progress 是 Engine 独家写入的 presentation/);
    assert.match(text, /仅 gate pass 时由 Engine 翻转对应行/);
    assert.match(text, /手勾不构成完成/);
    assert.match(text, /plan_progress_tamper_suspected/);
  });

  it('declares premature-final blocking, remediation, and non-citation in phase-final', () => {
    const text = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md');
    assert.match(text, /premature terminal output/);
    assert.match(text, /blocks every wave gate with `premature_final_present`/);
    assert.match(text, /final\/attic-<original-name>/);
    assert.match(text, /the Engine never deletes, moves, or rewrites/);
    assert.match(text, /Completion claims cannot cite a premature file/);
  });

  it('inventories the audit CLI with its closed outcomes in COMMANDS.md', () => {
    const text = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');
    assert.match(text, /\| audit-phase-status\.mjs \| cli\/audit-phase-status\.mjs \|/);
    assert.match(text, /premature_final_present/);
    assert.match(text, /plan_progress_tamper_suspected/);
    assert.match(text, /一条命令读取/);
  });

  it('never instructs checking a Progress box as the way to record completion', () => {
    const targets = [
      ...WAVE_PHASES,
      'DEEP_RESEARCH_HARNESS/command_playbook/start-research.md',
      'DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md',
      'DEEP_RESEARCH_HARNESS/rb_templates/rb_plan.md.tmpl',
    ];
    for (const rel of targets) {
      const text = read(rel);
      assert.doesNotMatch(text, /勾选 `?- \[x\]|manually check `?- \[x\]|flip the checkbox to record completion/i, rel);
    }
  });
});
