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
  const dir = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'command_playbook');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => `DEEP_RESEARCH_HARNESS/command_playbook/${name}`)
    .sort();
}

const SCAN_SURFACES = [
  'DEEP_RESEARCH_HARNESS/COMMANDS.md',
  'DEEP_RESEARCH_HARNESS/RUN.md',
  'DEEP_RESEARCH_HARNESS/README.md',
  'DEEP_RESEARCH_HARNESS/cli/README.md',
  ...listCommandPlaybooks(),
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl2.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-profile.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-gate-rules.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md',
];

const ALLOWLIST = [
  {
    file: 'DEEP_RESEARCH_HARNESS/COMMANDS.md',
    phraseClass: 'progress-report-framing',
    allowedContext: /不是第三个交互 checkpoint、progress report、confirmation loop|not a third interaction checkpoint, progress report, confirmation loop/i,
    reason: 'COMMANDS forbids treating Final as a progress report.',
  },
  {
    file: 'DEEP_RESEARCH_HARNESS/COMMANDS.md',
    phraseClass: 'advance-status-overclaims-entry',
    allowedContext: /advance-status.*does not enter, load, or execute/i,
    reason: 'COMMANDS explicitly says advance-status is not entry/loading/execution.',
  },
  {
    file: 'DEEP_RESEARCH_HARNESS/COMMANDS.md',
    phraseClass: 'enter-phase-overclaims-completion',
    allowedContext: /enter-phase.*not target phase work completion|enter-phase.*not target-phase work completion/i,
    reason: 'COMMANDS explicitly says enter-phase/load_complete are not target work completion.',
  },
  {
    file: 'DEEP_RESEARCH_HARNESS/RUN.md',
    phraseClass: 'enter-phase-overclaims-completion',
    allowedContext: /enter-phase.*不证明 target phase work completion/,
    reason: 'RUN.md explicitly says enter-phase/load_complete are not target work completion.',
  },
  {
    file: 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md',
    phraseClass: 'progress-report-framing',
    allowedContext: /SHALL NOT initiate.*progress report/i,
    reason: 'Shared silent execution prohibits framework-initiated progress reports.',
  },
  {
    file: 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md',
    phraseClass: 'enter-phase-overclaims-completion',
    allowedContext: /enter-phase.*they do not prove target-phase work completion/i,
    reason: 'Shared silent execution explicitly says entry witnesses are not target work completion.',
  },
  {
    file: 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md',
    phraseClass: 'advance-status-overclaims-entry',
    allowedContext: /Do NOT use `advance-status` as a substitute for `enter-phase`/i,
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
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/COMMANDS.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/RUN.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/README.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/cli/README.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/command_playbook/start-research.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl2.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-profile.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-gate-rules.md'));
    assert.ok(SCAN_SURFACES.includes('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md'));
  });

  it('COMMANDS.md exposes Agent audience, HITL boundary, Final boundary, trigger framing, and terminology', () => {
    const commands = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');

    for (const marker of [
      'Agent-facing operating surfaces',
      'HITL1 和 HITL2 是唯一的 interactive in-run checkpoints',
      'pre-pipeline trigger/entry selection',
      'Final 是 terminal lifecycle delivery',
      '不是第三个交互 checkpoint',
      '只有 evidence/research expansion 通过 `post_final_rerun` recovery operation',
      'Post-final feedback',
      'presentation-only feedback 留在 Final',
      'Ordinary authorized command execution and reversible mechanical repair are Agent-owned',
      'Human-directed identifies the decision source',
      'out-of-band maintenance/debug collaboration',
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

  it('RUN.md treats reading the entry file as DEEP_RESEARCH_HARNESS selection', () => {
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
    assert.ok(run.includes('DEEP_RESEARCH_HARNESS 已经被选为本次研究的 entry path'));
    assert.ok(run.includes('不要再问用户是否改用内置捷径或是否使用 DEEP_RESEARCH_HARNESS'));
    assert.ok(run.includes('pre-pipeline routing exception'));
    assert.ok(run.includes('HITL1/HITL2-only interactive in-run boundary'));
  });

  it('bundle naming is Agent-derived or already supplied before framework execution', () => {
    const instantiate = read('DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md');
    const start = read('DEEP_RESEARCH_HARNESS/command_playbook/start-research.md');

    assert.ok(instantiate.includes('Agent 从 research request 派生稳定的 kebab-case bundle 名称'));
    assert.ok(instantiate.includes('Harness execution 开始前已提供的名称'));
    assert.ok(instantiate.includes('不要在 autonomous execution 中要求用户提供名称'));
    assert.ok(start.includes('从 research question 生成 kebab-case bundle name'));
    assert.ok(start.includes('不要把 bundle naming 变成 autonomous execution 中的 mid-pipeline dependency'));
  });

  it('current run bundle resume guidance prefers current_node over current_gate-only inference', () => {
    const start = read('DEEP_RESEARCH_HARNESS/command_playbook/start-research.md');
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
    const bundleMap = read('DEEP_RESEARCH_HARNESS/rb_templates/BUNDLE_MAP.md.tmpl');

    for (const [label, text] of [
      ['start-research', start],
      ['RUN.md', run],
      ['BUNDLE_MAP template', bundleMap],
    ]) {
      assert.ok(text.includes('current_node'), `${label} must mention current_node`);
      assert.ok(text.includes('current_gate'), `${label} must distinguish current_gate`);
      assert.ok(/不要只凭 `current_gate`|不要只凭 current_gate|not guess/i.test(text), `${label} must reject current_gate-only phase inference`);
    }
  });

  it('generic gate-pass guidance enters, synchronizes the source gate, then executes the loaded phase', () => {
    const start = read('DEEP_RESEARCH_HARNESS/command_playbook/start-research.md');
    const enter = 'enter-phase --bundle <path> --node <check.next>';
    const sync = 'advance-status --bundle <path> --to <source_gate_enum>';
    const execute = '只有两步都成功后，才执行已加载的 target phase';

    assert.ok(start.includes(enter), 'start-research must consume check.next through enter-phase');
    assert.ok(start.includes(sync), 'start-research must synchronize the just-passed source gate');
    assert.ok(start.includes(execute), 'start-research must defer target execution until entry and status sync succeed');
    assert.ok(start.indexOf(enter) < start.indexOf(sync), 'enter-phase must precede source-gate status synchronization');
    assert.ok(start.indexOf(sync) < start.indexOf(execute), 'source-gate status synchronization must precede target execution');
    assert.match(start, /enter-phase[^\n]*只见证 entry/);
    assert.match(start, /advance-status[^\n]*只同步 source-gate status/);
    assert.match(start, /两者都不证明 target phase work completion/);
  });

  it('new bundle entry and map docs preserve static entry and passive navigation roles', () => {
    const entryTemplate = read('DEEP_RESEARCH_HARNESS/rb_templates/BUNDLE_ENTRY.md.tmpl');
    const template = read('DEEP_RESEARCH_HARNESS/rb_templates/BUNDLE_MAP.md.tmpl');
    const instantiate = read('DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md');
    const readme = read('DEEP_RESEARCH_HARNESS/README.md');

    for (const marker of [
      'Research Content Map',
      'Runtime Control Map',
      'Diagnostics Map',
      'Reentry Pointers',
      'passive bundle map',
      'not infer gate pass',
    ]) {
      assert.ok(template.includes(marker), `BUNDLE_MAP.md.tmpl missing marker: ${marker}`);
    }
    assert.ok(entryTemplate.includes('Deep Research Harness:'), 'BUNDLE_ENTRY.md.tmpl must render the Harness coordinate');
    assert.ok(entryTemplate.includes('BUNDLE_MAP.md'), 'BUNDLE_ENTRY.md.tmpl must delegate layout to the map');
    assert.ok(entryTemplate.includes('COMMANDS.md'), 'BUNDLE_ENTRY.md.tmpl must delegate operations to COMMANDS.md');
    assert.ok(instantiate.includes('BUNDLE_MAP.md'));
    assert.ok(instantiate.includes('BUNDLE_ENTRY.md'));
    assert.ok(instantiate.includes('passive bundle map'));
    assert.ok(readme.includes('BUNDLE_MAP.md'));
    assert.ok(readme.includes('passive map'));
  });

  it('CLI exit-code convention and exception inventory are discoverable', () => {
    for (const file of ['DEEP_RESEARCH_HARNESS/COMMANDS.md', 'DEEP_RESEARCH_HARNESS/cli/README.md']) {
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

  it('documents the selected operation grammar and direct feedback boundary without normalizing utilities', () => {
    const commands = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');
    const cliReadme = read('DEEP_RESEARCH_HARNESS/cli/README.md');

    for (const text of [commands, cliReadme]) {
      for (const marker of [
        'Selected Operation Invocation Contract',
        'Selected Public Operation Parsing',
      ]) {
        if (text === commands && marker === 'Selected Public Operation Parsing') continue;
        if (text === cliReadme && marker === 'Selected Operation Invocation Contract') continue;
        assert.ok(text.includes(marker), `selected-operation section missing marker: ${marker}`);
      }
      assert.match(text, /standalone `--help` or `-h`/i);
      assert.match(text, /unvalidated (?:argument )?token/);
      assert.match(text, /code-`2`|exits `2`/);
      for (const marker of [
        'inspect-wave{0,1,2}-output.mjs',
        'schema --context <context>',
        'validation_errors[]',
        'enter-phase.mjs',
        'target-excluding',
        'advance-status.mjs',
        'plan-hostfile-sections.mjs',
      ]) {
        assert.ok(text.includes(marker), `selected-operation documentation missing marker: ${marker}`);
      }
    }

    assert.match(commands, /cue-first|presents its `DPT_CONTINUATION_CUE` first/);
    assert.match(commands, /does not normalize unrelated utilities/i);
    assert.match(cliReadme, /not a claim that every utility/i);
  });

  it('keeps topic-state schema discovery and controls rendering on their existing owner boundaries', () => {
    const topicState = read('DEEP_RESEARCH_HARNESS/command_playbook/operate-topic-state.md');
    const controls = read('DEEP_RESEARCH_HARNESS/command_playbook/plan-hostfile-sections.md');

    for (const marker of [
      'Discover The Accepted Input Before Apply',
      'schema --context <hitl1|rerun|seed_topics|wave_projection>',
      'TopicApplyPlanSchema',
      'validation_errors[]',
      'does not read a bundle',
      'does not create reentry',
      'unknown-context forms are code `2`',
    ]) {
      assert.ok(topicState.includes(marker), `topic-state playbook missing marker: ${marker}`);
    }

    for (const marker of [
      'render-no-controls',
      'render-supplied-controls --input <snapshot-path>',
      'exits `2`',
      'do not hand-write a substitute fence',
    ]) {
      assert.ok(controls.includes(marker), `controls playbook missing marker: ${marker}`);
    }
    assert.match(controls, /never\s+selects a bundle/);
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
    const rel = 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md';
    const text = read(rel);
    assert.ok(text.includes('Phase Handoff Comes ONLY from Gate CLI and `enter-phase`'));
    assert.ok(text.includes('phase handoff'));
    assert.ok(text.includes('synchronize the just-passed source gate'));
    assert.ok(text.includes('status synchronization authority'));
    assert.match(text, /target-?phase work completion|target work completion/);
  });

  it('places source-gate synchronization in each Wave action core before target work', () => {
    const cases = [
      ['phase-wave0.md', 'seed_topics_ready', 'Wave0'],
      ['phase-wave1.md', 'wave0_complete', 'Wave1'],
      ['phase-wave2.md', 'wave1_complete', 'Wave2'],
    ];

    for (const [file, sourceGate, wave] of cases) {
      const text = read(`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/${file}`);
      const core = text.slice(text.indexOf('## 0. Execution Brief'), text.indexOf('\n## 1. Stage Goal'));
      const prerequisite = `advance-status.mjs --bundle <path> --to ${sourceGate}`;

      assert.ok(core.includes('**Entry prerequisite**'), `${file} must expose the entry prerequisite`);
      assert.ok(core.includes(prerequisite), `${file} must name its exact source-gate sync command`);
      assert.ok(core.includes(`does not prove ${wave} completion`), `${file} must not overclaim target completion`);
      assert.ok(core.indexOf('**Entry prerequisite**') < core.indexOf('**Completion check**'), `${file} must surface sync before the target completion check`);
    }
  });

  it('keeps claim and timeout vocabulary aligned across the shared protocol and Wave guidance', () => {
    const shared = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md');
    for (const marker of [
      'actor_observation_feedback',
      'planned_role_key',
      'primary_conflict',
      'legal_tuples',
      'same-claim `rerun`',
      'recommendation_basis',
      '`candidate`, `progress`, `lease`, or `integrity`',
      'does not run another candidate evaluator',
    ]) {
      assert.ok(shared.includes(marker), `shared protocol missing marker: ${marker}`);
    }

    for (const file of ['phase-wave0.md', 'phase-wave1.md', 'phase-wave2.md']) {
      const text = read(`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/${file}`);
      assert.ok(text.includes('actor_observation_feedback'), `${file} must surface claim feedback`);
      assert.ok(text.includes('recommendation_basis'), `${file} must surface timeout basis`);
      assert.match(text, /actor\/candidate vocabulary|actor\/candidate terms/);
    }
  });
});
