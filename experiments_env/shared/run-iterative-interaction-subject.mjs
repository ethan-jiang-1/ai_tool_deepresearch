#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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
};

function usage() {
  console.error('Usage: node experiments_env/shared/run-iterative-interaction-subject.mjs <711|712|713-readiness|713-final> --bundle <path>');
  process.exit(2);
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
const transcriptFd = openSync(transcriptPath, 'wx', 0o600);
const systemPrompt = [
  subject.system,
  `The exact bundle path provided by the runner is: ${bundle}`,
  'The runner loaded the current production required closure plus the interaction brief below, read-only from the framework. Use it as the current Agent-facing control surface and inspect only direct bundle facts needed for the current turn.',
  `This is a bounded smoke proof. ${subject.boundary} Do not inspect framework source or unrelated repository guidance outside the injected surface.`,
  productionSurface.text,
].join('\n\n');
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
  completedTurns += 1;
  if (event.is_error || event.subtype !== 'success') {
    failedResult = event;
    child.stdin.end();
    return;
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
  console.log(JSON.stringify({
    status: ok ? 'completed' : 'failed',
    subject: subjectId,
    bundle,
    transcript: transcriptPath,
    settings: SETTINGS_PATH,
    settings_status: settingsStatus,
    loaded_node: productionSurface.nodeRef,
    session_id: sessionId,
    completed_turns: completedTurns,
    exit_code: code,
    signal,
    timed_out: timedOut,
    stderr_tail: ok ? undefined : stderr.slice(-1000),
  }));
  process.exit(ok ? 0 : 1);
});

sendTurn(0);
