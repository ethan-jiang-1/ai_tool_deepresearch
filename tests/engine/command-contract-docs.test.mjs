// command-contract-docs.test.mjs
// Static regression coverage for Agent-facing command audience, phase-boundary
// terminology, and CLI exit-code documentation.
// @impl ACS-003, ACS-004, CLE-004

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

function listCommandPlaybooks() {
  const dir = join(REPO_ROOT, 'DPT_FRAMEWORK', 'command_playbook');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => `DPT_FRAMEWORK/command_playbook/${name}`)
    .sort();
}

const SCAN_SURFACES = [
  'DPT_FRAMEWORK/COMMANDS.md',
  'DPT_FRAMEWORK/RUN.md',
  'DPT_FRAMEWORK/README.md',
  'DPT_FRAMEWORK/cli/README.md',
  ...listCommandPlaybooks(),
  'DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md',
];

const ALLOWLIST = [
  {
    file: 'DPT_FRAMEWORK/COMMANDS.md',
    phraseClass: 'progress-report-framing',
    allowedContext: /不是第三个交互 checkpoint、progress report、confirmation loop|not a third interaction checkpoint, progress report, confirmation loop/i,
    reason: 'COMMANDS forbids treating Final as a progress report.',
  },
  {
    file: 'DPT_FRAMEWORK/COMMANDS.md',
    phraseClass: 'advance-status-overclaims-entry',
    allowedContext: /advance-status.*does not enter, load, or execute/i,
    reason: 'COMMANDS explicitly says advance-status is not entry/loading/execution.',
  },
  {
    file: 'DPT_FRAMEWORK/COMMANDS.md',
    phraseClass: 'enter-phase-overclaims-completion',
    allowedContext: /enter-phase.*not target phase work completion|enter-phase.*not target-phase work completion/i,
    reason: 'COMMANDS explicitly says enter-phase/load_complete are not target work completion.',
  },
  {
    file: 'DPT_FRAMEWORK/RUN.md',
    phraseClass: 'enter-phase-overclaims-completion',
    allowedContext: /enter-phase.*不证明 target phase work completion/,
    reason: 'RUN.md explicitly says enter-phase/load_complete are not target work completion.',
  },
  {
    file: 'DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md',
    phraseClass: 'continue-question-example',
    allowedContext: /发送类似 "继续吗？".*的消息/,
    reason: 'Shared silent execution lists forbidden user-facing examples.',
  },
  {
    file: 'DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md',
    phraseClass: 'progress-report-framing',
    allowedContext: /No messages, no questions, no confirmations, no progress reports/i,
    reason: 'Shared silent execution forbids progress reports.',
  },
  {
    file: 'DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md',
    phraseClass: 'progress-report-framing',
    allowedContext: /不报告进度/,
    reason: 'Shared silent execution forbids progress reports in stop:no phases.',
  },
  {
    file: 'DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md',
    phraseClass: 'enter-phase-overclaims-completion',
    allowedContext: /enter-phase.*they do not prove target-phase work completion/i,
    reason: 'Shared silent execution explicitly says entry witnesses are not target work completion.',
  },
  {
    file: 'DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md',
    phraseClass: 'advance-status-overclaims-entry',
    allowedContext: /Do NOT load any other phase, and do NOT use `advance-status` as a substitute for `enter-phase`/i,
    reason: 'Shared silent execution forbids using advance-status as entry/loading.',
  },
];

const PHRASE_CLASSES = [
  {
    phraseClass: 'agent-operator-slash',
    pattern: /Agent\/operator|operator\/Agent/g,
  },
  {
    phraseClass: 'mid-pipeline-bundle-name',
    pattern: /用户提供 bundle 名称|用户.*bundle 名称|require the user to provide a bundle name/gi,
  },
  {
    phraseClass: 'entry-confirmation-loop',
    pattern: /一句话确认|用户没明说|确认走哪个/g,
  },
  {
    phraseClass: 'continue-question-example',
    pattern: /是否继续|continue\?/gi,
  },
  {
    phraseClass: 'progress-report-framing',
    pattern: /progress report|进度汇报|报告进度/gi,
  },
  {
    phraseClass: 'advance-status-overclaims-entry',
    pattern: /advance-status[^.\n。]*(?:进入|加载|执行|enter|load|execute)/gi,
  },
  {
    phraseClass: 'enter-phase-overclaims-completion',
    pattern: /(?:enter-phase|load_complete)[^.\n。]*(?:完成 target|complete target|target work completion|target-phase work completion)/gi,
  },
];

function contextFor(text, index, length) {
  return text.slice(Math.max(0, index - 110), Math.min(text.length, index + length + 110));
}

function isAllowed(file, phraseClass, context) {
  return ALLOWLIST.some((entry) => (
    entry.file === file &&
    entry.phraseClass === phraseClass &&
    entry.allowedContext.test(context)
  ));
}

function collectForbiddenPhraseViolations() {
  const violations = [];

  for (const file of SCAN_SURFACES) {
    const text = read(file);
    for (const { phraseClass, pattern } of PHRASE_CLASSES) {
      const regex = new RegExp(pattern.source, pattern.flags);
      for (const match of text.matchAll(regex)) {
        const context = contextFor(text, match.index ?? 0, match[0].length);
        if (!isAllowed(file, phraseClass, context)) {
          violations.push({
            file,
            phraseClass,
            context: context.replace(/\s+/g, ' ').trim(),
          });
        }
      }
    }
  }

  return violations;
}

describe('Agent-facing command contract docs', () => {
  it('scans the required command and workflow documentation surfaces', () => {
    assert.ok(SCAN_SURFACES.includes('DPT_FRAMEWORK/COMMANDS.md'));
    assert.ok(SCAN_SURFACES.includes('DPT_FRAMEWORK/RUN.md'));
    assert.ok(SCAN_SURFACES.includes('DPT_FRAMEWORK/README.md'));
    assert.ok(SCAN_SURFACES.includes('DPT_FRAMEWORK/cli/README.md'));
    assert.ok(SCAN_SURFACES.includes('DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md'));
    assert.ok(SCAN_SURFACES.includes('DPT_FRAMEWORK/command_playbook/start-research.md'));
    assert.ok(SCAN_SURFACES.includes('DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md'));
  });

  it('COMMANDS.md exposes Agent audience, HITL boundary, Final boundary, trigger framing, and terminology', () => {
    const commands = read('DPT_FRAMEWORK/COMMANDS.md');

    for (const marker of [
      'Agent-facing operating surfaces',
      'HITL1 和 HITL2 是唯一的 interactive in-run checkpoints',
      'pre-pipeline trigger/entry selection',
      'Final 是 terminal non-interactive delivery',
      'Post-final feedback',
      'HITL2 repair/rerun',
      '`phase transition`',
      '`phase handoff`',
      '`work completion`',
      '`witnessing`',
      '`current_node`',
      'resume coordinate',
    ]) {
      assert.ok(commands.includes(marker), `COMMANDS.md missing marker: ${marker}`);
    }
  });

  it('RUN.md treats reading the entry file as DPT_FRAMEWORK selection', () => {
    const run = read('DPT_FRAMEWORK/RUN.md');
    assert.ok(run.includes('DPT_FRAMEWORK 已经被选为本次研究的 entry path'));
    assert.ok(run.includes('不要再问用户是否改用内置捷径或是否使用 DPT_FRAMEWORK'));
    assert.ok(run.includes('pre-pipeline routing exception'));
    assert.ok(run.includes('HITL1/HITL2-only interactive in-run boundary'));
  });

  it('bundle naming is Agent-derived or already supplied before framework execution', () => {
    const instantiate = read('DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md');
    const start = read('DPT_FRAMEWORK/command_playbook/start-research.md');

    assert.ok(instantiate.includes('Agent 从 research request 派生稳定的 kebab-case bundle 名称'));
    assert.ok(instantiate.includes('framework execution 开始前已提供的名称'));
    assert.ok(instantiate.includes('不要在 autonomous execution 中要求用户提供名称'));
    assert.ok(start.includes('从 research question 生成 kebab-case bundle name'));
    assert.ok(start.includes('不要把 bundle naming 变成 autonomous execution 中的 mid-pipeline dependency'));
  });

  it('active bundle resume guidance prefers current_node over current_gate-only inference', () => {
    const start = read('DPT_FRAMEWORK/command_playbook/start-research.md');
    const run = read('DPT_FRAMEWORK/RUN.md');
    const startHere = read('DPT_FRAMEWORK/rb_templates/START_FROM_HERE.md.tmpl');

    for (const [label, text] of [
      ['start-research', start],
      ['RUN.md', run],
      ['START_FROM_HERE template', startHere],
    ]) {
      assert.ok(text.includes('current_node'), `${label} must mention current_node`);
      assert.ok(text.includes('current_gate'), `${label} must distinguish current_gate`);
      assert.ok(/不要只凭 `current_gate`|不要只凭 current_gate|not guess/i.test(text), `${label} must reject current_gate-only phase inference`);
    }
  });

  it('CLI exit-code convention and exception inventory are discoverable', () => {
    for (const file of ['DPT_FRAMEWORK/COMMANDS.md', 'DPT_FRAMEWORK/cli/README.md']) {
      const text = read(file);
      for (const marker of [
        'Exit-Code Convention',
        '`0`',
        '`1`',
        '`2`',
        'structured',
        'Gate CLIs',
        'Inspect-wave',
        'check-reentry.mjs',
        'log-event.mjs',
        'always',
        'validate-workflow-package.mjs',
        'advice[]',
        'Exit codes SHALL NOT encode morale',
      ]) {
        assert.ok(text.includes(marker), `${file} missing marker: ${marker}`);
      }
    }
  });

  it('rejects known command-audience and boundary wording drift unless allowlisted', () => {
    const violations = collectForbiddenPhraseViolations();
    assert.deepStrictEqual(
      violations,
      [],
      violations.map((v) => `${v.file} [${v.phraseClass}] ${v.context}`).join('\n'),
    );
  });

  it('allowlist entries are explicit and reviewable', () => {
    for (const entry of ALLOWLIST) {
      assert.ok(entry.file, 'allowlist entry must name file');
      assert.ok(entry.phraseClass, 'allowlist entry must name phraseClass');
      assert.ok(entry.allowedContext instanceof RegExp, 'allowlist entry must name allowedContext regex');
      assert.ok(entry.reason, 'allowlist entry must explain reason');
      assert.ok(SCAN_SURFACES.includes(entry.file), `allowlist file must be scanned: ${entry.file}`);
    }
  });
});

describe('Phase-boundary terminology docs', () => {
  it('shared silent execution distinguishes handoff, status synchronization, and target work completion', () => {
    const rel = 'DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md';
    const text = read(rel);
    assert.ok(text.includes('Phase Handoff Comes ONLY from Gate CLI and `enter-phase`'));
    assert.ok(text.includes('phase handoff'));
    assert.ok(text.includes('synchronize the just-passed source gate'));
    assert.ok(text.includes('status synchronization authority'));
    assert.ok(text.includes('target work completion'));
  });
});
