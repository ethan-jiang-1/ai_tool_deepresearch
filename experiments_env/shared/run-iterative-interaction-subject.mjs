#!/usr/bin/env node
// @impl EXA-003, EXA-005, EXA-006, EXA-008, VER-006

import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

import {
  assessNode,
  createState,
  createWorkflowRuntime,
} from '../../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAUNCHER = join(REPO_ROOT, 'DPT_FRAMEWORK', 'host_tools', 'claude-deepseek.mjs');
const NODES_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'nodes');
const SUBJECT_TIMEOUT_MS = 3 * 60 * 1000;
const SETTINGS_PATH = join(
  homedir(),
  '.codex',
  'private',
  'codex-only-dpt-iterative-subject-deepseek-v1.settings.json',
);

const SUBJECTS = {
  '115': {
    bundlePrefix: 'dpt_disp_case-115_',
    transcript: 'case-115-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 115. Work only in the exact bundle path provided by the runner. Load the current production HITL1 surface and direct bundle facts, then execute only that current phase boundary.',
    messages: ['请执行当前 HITL1 的最小真实 research-access probe，并按当前 production surface 记录直接观察、运行同一 Gate；完成 immediate handoff 或诚实的 unavailable 分支后停止。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Perform one bounded dynamic search and at most one fetch of the first usable result. Do not turn probe bytes into research evidence. Stop after the HITL1 Gate and its immediate legal handoff or honest unavailable failure.',
  },
  '232': {
    bundlePrefix: 'dpt_disp_case-232_',
    transcript: 'case-232-subject-transcript.jsonl',
    system: 'You are the independent Wave2 Subject Agent for case 232, distinct from the Playbook Agent. Work only in the exact bundle path provided by the runner. Read the injected production Wave2 surface and direct post-Wave1 bundle facts, then perform the bounded triage task.',
    messages: ['执行当前 Wave2 finding triage：读取两个 topic 的 Wave1 evidence-summary 和 question-list；至少做一次真实 WebSearch，并在可用时 WebFetch 一个结果；把 finding 明确分成 use_existing_evidence、record_only 和 explore_search 或 exploit_search。任何 search-required finding 必须走真实 queue/work-unit claim、Subject产出、submit 和 receipt 绑定，不能留下 orphan reference。完成 cross-topic-ledger.md、finding-index.yaml、synthesis.md、两个 seed topic 的 Wave2 backfill，并按当前 production surface 写入 wave2_completion 后停止。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Use at most two bounded searches and one fetch. Do not write playbook verdict checks, native completion, health output, or cleanup. If external access or a required nested actor is unavailable, fail honestly instead of fabricating evidence.',
  },
  '318': {
    bundlePrefix: 'dpt_disp_case-318_',
    transcript: 'case-318-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 318, distinct from the Playbook Agent. Work only in the exact bundle path provided by the runner. Execute the injected current production rerun surface against direct bundle facts.',
    messages: [
      'Execute the rerun phase only through the sanctioned direction-only candidate: read the accepted HITL2 rationale, current rerun_count, canonical topic_uid, and loaded shared seed-authoring contract; compute target_rerun_count=1; write a retained JSON input for `set_rerun_direction` with that exact topic_uid, `action: supplement`, and non-empty cost/failure-mode dimensions, depth, guardrails, and rationale excerpt; then invoke `node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply --bundle <bundle> --input <retained-json>`. Verify the production apply result. Stop before changing rb_profile.yaml, running rerun-ready, entering another phase, advancing status, or direct-editing the seed direction/Engine-owned authority.',
      'Resume from the current bundle facts. Recognize the existing direction/profile mismatch as the documented crash window. Preserve the accepted direction bytes; perform only the existing profile-count owner update to that existing target, then complete the sanctioned rerun-ready Gate plus immediate enter-phase and source-gate status synchronization. Consume structured feedback if the same Gate fails. Do not invoke topic-state apply again or directly edit the seed direction. Stop after the immediate seed-topics handoff.',
    ],
    tools: 'Bash,Edit,Glob,Grep,Read,Write',
    boundary: 'Do not search or call external services. Do not hand-edit status, trace, gate attempts, work-unit authority, or declarations. The adapter records a deterministic read-only crash-window snapshot between the two turns.',
    afterTurn: observeCase318CrashWindow,
  },
  '711': {
    bundlePrefix: 'dpt_disp_case-711_',
    transcript: 'case-711-transcript.jsonl',
    system: 'You are the independent subject Agent for case 711. Work only in the exact bundle path provided by the runner. Load the bundle\'s current production lifecycle surface and direct facts. Respond to the user\'s current turn, then follow that production surface for subsequent turns in this same session.',
    messages: ['请根据当前研究请求给出一个简洁的研究建议，只保留验证本次交互所需的最小范围。', '按这个开始'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Complete the minimum work owned by the current phase. After its Gate and immediate legal handoff, stop before executing the newly loaded phase.',
  },
  '712': {
    bundlePrefix: 'dpt_disp_case-712_',
    transcript: 'case-712-transcript.jsonl',
    system: 'You are the independent subject Agent for case 712. Work only in the exact bundle path provided by the runner. Load the bundle\'s current production lifecycle surface and direct facts. Respond to the user\'s current turn, then follow that production surface for subsequent turns in this same session.',
    messages: ['请简要审阅当前研究，只告诉我一个最值得做的下一步。', '资本约束这部分还不够，再补一下'],
    tools: 'Bash,Edit,Glob,Grep,Read,Write',
    boundary: 'Complete the minimum work owned by the current phase. After its Gate and immediate legal handoff, stop before executing the newly loaded phase.',
  },
  '713-readiness': {
    bundlePrefix: 'dpt_disp_case-713_',
    transcript: 'case-713-readiness-transcript.jsonl',
    system: 'You are the independent subject Agent for case 713 readiness. Work only in the exact bundle path provided by the runner. Load the bundle\'s current production lifecycle surface and direct facts, then answer the user\'s current turn.',
    messages: ['现在是不是已经全部完成，可以直接拿最终报告了？'],
    tools: 'Glob,Grep,Read',
    boundary: 'Answer only the current user turn from direct bundle facts, then stop.',
  },
  '713-final': {
    bundlePrefix: 'dpt_disp_case-713_',
    transcript: 'case-713-final-transcript.jsonl',
    system: 'You are the independent subject Agent for case 713 Final. Work only in the exact bundle path provided by the runner. Load the bundle\'s current production lifecycle surface and direct facts, then answer the user\'s current turn.',
    messages: ['最终报告文件现在已经生成了吗？'],
    tools: 'Glob,Grep,Read',
    boundary: 'Answer only the current user turn from direct bundle facts, then stop.',
  },
  '901': {
    bundlePrefix: 'dpt_disp_case-901_',
    transcript: 'case-901-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 901, distinct from the Interactive Playbook Agent and the human judge. Work only in the exact bundle path provided by the runner and execute the injected current HITL1 production surface.',
    messages: ['用户原始输入是“帮我研究一下 AI 安全”。按当前 phase-hitl1 Topic Rewrite contract 独立完成 purpose、research questions、scope 和 3-5 个 seed topics，写入 rb_plan.md；选择匹配的 research profile 和 root must-answer set；做一次真实、bounded 的 search/fetch capability probe并诚实记录；应用 research style，运行真实 hitl1-recorded Gate并完成其 immediate legal handoff，然后停止。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Do not write playbook verdict checks, human judgment, native completion, health output, or cleanup. Use one bounded search and at most one fetch; capability-probe bytes are not research evidence.',
  },
  '951': {
    bundlePrefix: 'dpt_disp_case-951_',
    transcript: 'case-951-subject-transcript.jsonl',
    system: 'You are the independent Subject Agent for case 951, distinct from the Playbook Agent and the later AI judge. Work only in the exact bundle path provided by the runner and execute the injected current HITL1 production surface.',
    messages: ['用户原始输入是“帮我研究一下 AI 安全”。按当前 phase-hitl1 Topic Rewrite contract 独立完成 purpose、research questions、scope 和 3-5 个 seed topics，写入 rb_plan.md；选择匹配的 research profile 和 root must-answer set；做一次真实、bounded 的 search/fetch capability probe并诚实记录；应用 research style，运行真实 hitl1-recorded Gate并完成其 immediate legal handoff，然后停止。'],
    tools: 'Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write',
    boundary: 'Do not write playbook verdict checks, AI judgment, native completion, health output, or cleanup. Use one bounded search and at most one fetch; capability-probe bytes are not research evidence.',
  },
  '951-judge': {
    bundlePrefix: 'dpt_disp_case-951_',
    transcript: 'case-951-judge-transcript.jsonl',
    system: 'You are the independent AI reviewer for case 951. You did not produce the topic rewrite. Review only the retained original request, Subject prompt/transcript/result, rb_plan.md, rb_profile.yaml, and structural Gate facts in the exact bundle path.',
    messages: ['审查独立 Subject Agent 对“帮我研究一下 AI 安全”的 rewrite：忠实性、问题覆盖、不确定性、3-5个 seed topic 的相关性/独立可研究性/非重复性、profile 匹配、真实 bounded capability probe 与 evidence 隔离、结构 Gate。把真实判断写入 bundle 根的 case-951-judge-record.json，严格 JSON 字段为 schema_version="agent-experiment-judge/v1"、source="ai-judge"、case="case-951-heavy-topic-rewrite-ai-judge"、paired_case="case-901-heavy-topic-rewrite-agent"、verdict="pass"或"fail"、criteria（非空对象）、rationale（非空字符串）。不要修改 Subject 输出。'],
    tools: 'Glob,Grep,Read,Write',
    boundary: 'Write only case-951-judge-record.json. Do not alter runtime state, trace, Subject evidence, native completion, health output, or cleanup. This AI judgment remains distinct from real-human evidence.',
  },
};

function usage() {
  console.error('Usage: node experiments_env/shared/run-iterative-interaction-subject.mjs <115|232|318|711|712|713-readiness|713-final|901|951|951-judge> --bundle <path>');
  process.exit(2);
}

function observeCase318CrashWindow({ bundle, completedTurns }) {
  if (completedTurns !== 1) return;
  const seed = readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8');
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
  const transcript = readFileSync(join(bundle, SUBJECTS['318'].transcript), 'utf8');
  const section = seed.match(/##\s*本轮重跑方向[\s\S]*?(?=\n##\s+|$)/)?.[0] || '';
  const directionCount = Number(section.match(/rerun_count\*{0,2}\s*:\s*(\d+)/i)?.[1]);
  const observation = {
    direction_sha256: createHash('sha256').update(section).digest('hex'),
    direction_count: directionCount,
    profile_count: profile.human_decision_checkpoints?.hitl2?.rerun_count,
    action_is_supplement: /action\*{0,2}\s*:\s*supplement\b/i.test(section),
    requested_dimensions_present: /cost/i.test(section) && /failure[- ]?mode/i.test(section),
    subject_apply_observed: /operate-topic-state\.mjs\s+apply/.test(transcript),
    current_node: status.current_node,
    current_gate: status.current_gate,
    next_gate: status.next_gate,
  };
  const valid = observation.direction_count === 1
    && observation.profile_count === 0
    && observation.action_is_supplement
    && observation.requested_dimensions_present
    && observation.subject_apply_observed
    && observation.current_node === 'phases/phase-rerun.md'
    && observation.current_gate === 'hitl2_recorded'
    && observation.next_gate === 'rerun_ready';
  if (!valid) throw new Error(`case-318 first Subject turn did not establish the required crash window: ${JSON.stringify(observation)}`);
  writeFileSync(join(bundle, 'case-318-crash-window.json'), `${JSON.stringify(observation, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}

function parseEnv(path) {
  const values = Object.create(null);
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function ensureUniqueSettings() {
  if (existsSync(SETTINGS_PATH)) {
    JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    chmodSync(SETTINGS_PATH, 0o600);
    return 'reused';
  }

  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) throw new Error(`missing repo-root .env required to create ${SETTINGS_PATH}`);
  const values = parseEnv(envPath);
  for (const key of ['DEEPSEEK_API_KEY', 'DEEPSEEK_ANTHROPIC_BASE_URL', 'DEEPSEEK_MODEL']) {
    if (!values[key]) throw new Error(`missing ${key} in repo-root .env`);
  }

  mkdirSync(dirname(SETTINGS_PATH), { recursive: true, mode: 0o700 });
  const model = values.DEEPSEEK_MODEL;
  const settings = {
    env: {
      ANTHROPIC_AUTH_TOKEN: values.DEEPSEEK_API_KEY,
      ANTHROPIC_BASE_URL: values.DEEPSEEK_ANTHROPIC_BASE_URL,
      API_TIMEOUT_MS: values.DEEPSEEK_API_TIMEOUT_MS || '3000000',
      ANTHROPIC_MODEL: 'opus',
      ANTHROPIC_DEFAULT_OPUS_MODEL: values.DEEPSEEK_OPUS_MODEL || model,
      ANTHROPIC_DEFAULT_SONNET_MODEL: values.DEEPSEEK_SONNET_MODEL || model,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: values.DEEPSEEK_HAIKU_MODEL || model,
      CLAUDE_CODE_SUBAGENT_MODEL: values.DEEPSEEK_SUBAGENT_MODEL || model,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      ENABLE_TOOL_SEARCH: 'false',
      CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000',
    },
  };
  writeFileSync(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return 'created';
}

function writeUserMarker(fd, content) {
  writeSync(fd, `${JSON.stringify({ role: 'user', event: 'message', content })}\n`);
}

function streamInput(content) {
  return `${JSON.stringify({ type: 'user', message: { role: 'user', content } })}\n`;
}

function loadProductionSurface(bundle) {
  const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
  const nodeRef = status.current_node;
  if (typeof nodeRef !== 'string' || !nodeRef) {
    throw new Error('bundle rb_status.json has no current_node');
  }

  const runtime = createWorkflowRuntime('iterative-interaction-subject', NODES_DIR);
  const loaded = assessNode(nodeRef, createState(), runtime);
  if (loaded.status !== 'loaded') {
    throw new Error(`failed to load current production node ${nodeRef}: ${loaded.error || 'unknown error'}`);
  }

  const entry = runtime.contentCache.get(nodeRef);
  const suggested = entry?.frontmatter?.suggested_context;
  if (suggested !== undefined && !Array.isArray(suggested)) {
    throw new Error(`current production node ${nodeRef} has invalid suggested_context`);
  }

  const orderedRefs = [];
  const seen = new Set();
  const appendPlan = (plan) => {
    for (const fileRef of plan || []) {
      if (fileRef === nodeRef || seen.has(fileRef)) continue;
      seen.add(fileRef);
      orderedRefs.push(fileRef);
    }
  };

  appendPlan(loaded.plan);
  for (const contextRef of (suggested || []).filter((fileRef) => fileRef.startsWith('brief/'))) {
    const context = assessNode(contextRef, createState(), runtime);
    if (context.status !== 'loaded') {
      throw new Error(`failed to load suggested production context ${contextRef}: ${context.error || 'unknown error'}`);
    }
    appendPlan(context.plan);
  }
  orderedRefs.push(nodeRef);

  const sections = orderedRefs.map((fileRef) => {
    const cached = runtime.contentCache.get(fileRef);
    if (!cached) throw new Error(`production surface cache is missing ${fileRef}`);
    return `<!-- DPT_LOADED_FILE_START ${fileRef} -->\n\n${cached.md.trimEnd()}\n\n<!-- DPT_LOADED_FILE_END ${fileRef} -->`;
  });

  return {
    nodeRef,
    text: [
      `<!-- DPT_SUBJECT_PRODUCTION_SURFACE_START node_ref=${nodeRef} -->`,
      ...sections,
      '<!-- DPT_SUBJECT_PRODUCTION_SURFACE_END -->',
    ].join('\n\n'),
  };
}

const [subjectId, ...args] = process.argv.slice(2);
const bundleIndex = args.indexOf('--bundle');
const subject = SUBJECTS[subjectId];
if (!subject || bundleIndex < 0 || !args[bundleIndex + 1] || args.length !== 2) usage();

const bundle = resolve(args[bundleIndex + 1]);
if (!existsSync(bundle) || !statSync(bundle).isDirectory() || !basename(bundle).startsWith(subject.bundlePrefix)) {
  throw new Error(`bundle does not match ${subjectId}: ${bundle}`);
}
if (!existsSync(LAUNCHER)) throw new Error(`launcher is missing: ${LAUNCHER}`);

const settingsStatus = ensureUniqueSettings();
const transcriptPath = join(bundle, subject.transcript);
const productionSurface = loadProductionSurface(bundle);
const systemPrompt = [
  subject.system,
  `The exact bundle path provided by the runner is: ${bundle}`,
  'The runner loaded the current production required closure plus the interaction brief below, read-only from the framework. Use it as the current Agent-facing control surface and inspect only direct bundle facts needed for the current turn.',
  `This is a bounded smoke proof. ${subject.boundary} Do not inspect framework source or unrelated repository guidance outside the injected surface.`,
  productionSurface.text,
].join('\n\n');
const evidenceStem = `case-${subjectId}`;
const promptPath = join(bundle, `${evidenceStem}-subject-prompt.json`);
const resultPath = join(bundle, `${evidenceStem}-subject-result.json`);
writeFileSync(promptPath, `${JSON.stringify({
  subject: subjectId,
  system_prompt: systemPrompt,
  messages: subject.messages,
  tools: subject.tools,
  loaded_node: productionSurface.nodeRef,
}, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
const transcriptFd = openSync(transcriptPath, 'wx', 0o600);
const sessionId = randomUUID();
const claudeArgs = [
  LAUNCHER,
  '--settings', SETTINGS_PATH,
  '--setting-sources', '',
  '--bare',
  '--disable-slash-commands',
  '--no-chrome',
  '--tools', subject.tools,
  '--model', 'opus',
  '--effort', 'low',
  '--session-id', sessionId,
  '--no-session-persistence',
  '--dangerously-skip-permissions',
  '--prompt-suggestions', 'false',
  '--system-prompt', systemPrompt,
  '-p',
  '--input-format', 'stream-json',
  '--output-format', 'stream-json',
  '--verbose',
];

const child = spawn(process.execPath, claudeArgs, {
  cwd: REPO_ROOT,
  stdio: ['pipe', 'pipe', 'pipe'],
  detached: true,
});

let parseBuffer = '';
let turnIndex = 0;
let completedTurns = 0;
let failedResult = null;
let stderr = '';
let timedOut = false;
let closed = false;
let forcedAfterResult = false;
let finalResultTimer = null;
const resultEvents = [];

function signalChild(signal) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function sendTurn(index) {
  writeUserMarker(transcriptFd, subject.messages[index]);
  child.stdin.write(streamInput(subject.messages[index]));
}

function handleLine(line) {
  if (!line.trim()) return;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }
  if (event.type !== 'result') return;
  resultEvents.push(event);
  completedTurns += 1;
  if (event.is_error || event.subtype !== 'success') {
    failedResult = event;
    child.stdin.end();
    return;
  }
  if (subject.afterTurn) {
    try {
      subject.afterTurn({ bundle, completedTurns });
    } catch (error) {
      failedResult = { type: 'adapter_observer_error', message: error.message };
      stderr += `${error.message}\n`;
      child.stdin.end();
      return;
    }
  }
  turnIndex += 1;
  if (turnIndex < subject.messages.length) {
    sendTurn(turnIndex);
  } else {
    child.stdin.end();
    finalResultTimer = setTimeout(() => {
      if (!closed) {
        forcedAfterResult = true;
        signalChild('SIGTERM');
      }
    }, 1500);
    finalResultTimer.unref();
  }
}

child.stdout.on('data', (chunk) => {
  writeSync(transcriptFd, chunk);
  parseBuffer += chunk.toString('utf8');
  while (true) {
    const newline = parseBuffer.indexOf('\n');
    if (newline < 0) break;
    const line = parseBuffer.slice(0, newline);
    parseBuffer = parseBuffer.slice(newline + 1);
    handleLine(line);
  }
});

child.stderr.on('data', (chunk) => {
  const text = chunk.toString('utf8');
  stderr += text;
  process.stderr.write(text);
});

const timeout = setTimeout(() => {
  timedOut = true;
  signalChild('SIGTERM');
  setTimeout(() => signalChild('SIGKILL'), 1000).unref();
}, SUBJECT_TIMEOUT_MS);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => signalChild(signal));
}

child.once('error', (error) => {
  clearTimeout(timeout);
  closeSync(transcriptFd);
  console.error(error.message);
  process.exit(1);
});

child.once('close', (code, signal) => {
  closed = true;
  if (finalResultTimer) clearTimeout(finalResultTimer);
  clearTimeout(timeout);
  if (parseBuffer.trim()) handleLine(parseBuffer);
  closeSync(transcriptFd);
  const ok = !timedOut && !failedResult && completedTurns === subject.messages.length
    && (code === 0 || forcedAfterResult);
  const result = {
    status: ok ? 'completed' : 'failed',
    subject: subjectId,
    bundle,
    prompt: promptPath,
    transcript: transcriptPath,
    result: resultPath,
    settings: SETTINGS_PATH,
    settings_status: settingsStatus,
    loaded_node: productionSurface.nodeRef,
    session_id: sessionId,
    completed_turns: completedTurns,
    exit_code: code,
    signal,
    timed_out: timedOut,
    stderr_tail: ok ? undefined : stderr.slice(-1000),
    result_events: resultEvents,
  };
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(result));
  process.exit(ok ? 0 : 1);
});

sendTurn(0);
