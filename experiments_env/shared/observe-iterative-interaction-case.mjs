#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

import { createTrace } from '../../DPT_FRAMEWORK/engine/trace.mjs';
import { recordCheck } from './wff-playbook-utils.mjs';

const [caseId, action, ...rest] = process.argv.slice(2);
const bundleIndex = rest.indexOf('--bundle');
const bundle = bundleIndex >= 0 ? rest[bundleIndex + 1] : null;
if (!['711', '712', '713'].includes(caseId) || !action || !bundle) {
  console.error('Usage: node experiments_env/shared/observe-iterative-interaction-case.mjs <711|712|713> <hash|snapshot|transition-final|verdict> --bundle <path> [--label A] [--transcript <path>]');
  process.exit(2);
}

const tracePath = join(bundle, 'rb_trace.jsonl');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function option(name) {
  const index = rest.indexOf(name);
  return index >= 0 ? rest[index + 1] : null;
}

function runNode(args, { expectedStatus = 0 } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== expectedStatus) {
    throw new Error(`node ${args.join(' ')} exited ${result.status}, expected ${expectedStatus}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return result;
}

function parseJsonOutput(result) {
  const raw = String(result.stdout || '').trim();
  try { return JSON.parse(raw); } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error(`command did not emit JSON: ${raw}`);
  }
}

function transcriptEvents(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function collectText(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) for (const item of value) collectText(item, output);
  else if (value && typeof value === 'object') {
    if (value.type === 'text' && typeof value.text === 'string') output.push(value.text);
    if (typeof value.content === 'string') output.push(value.content);
    if (value.message) collectText(value.message, output);
    if (Array.isArray(value.content)) collectText(value.content, output);
    if (value.item) collectText(value.item, output);
  }
  return output;
}

function assistantText(events) {
  return events.filter((event) => event.role === 'assistant' || event.type === 'assistant' || event.item?.type === 'agent_message')
    .flatMap((event) => collectText(event)).join('\n');
}

function toolFacts(events) {
  const names = [];
  const serialized = JSON.stringify(events);
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if (value.type === 'tool_use' && typeof value.name === 'string') names.push(value.name);
    if (value.item?.type === 'command_execution') names.push('command_execution');
    for (const child of Object.values(value)) visit(child);
  }
  visit(events);
  return { names, serialized };
}

function traceEvents() {
  return readFileSync(tracePath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function hashTranscript(path) {
  if (!existsSync(path)) {
    notRun(`missing independent subject transcript: ${path}`);
  }
  const bytes = readFileSync(path);
  const digest = sha256(bytes);
  createTrace(tracePath, { consoleEcho: false }).traceEntry('agent_transcript_digest', {
    source: `case-${caseId}-observer`,
    transcript: basename(path),
    sha256: digest,
    byte_length: bytes.length,
  });
  console.log(JSON.stringify({ status: 'hashed', transcript: path, sha256: digest, byte_length: bytes.length }));
}

function notRun(reason) {
  const output = {
    status: 'NOT RUN',
    case: `case-${caseId}`,
    reason,
    preserved_bundle: bundle,
  };
  writeFileSync(join(bundle, `case-${caseId}-NOT-RUN.json`), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output));
  process.exit(3);
}

const OBSERVER_FILE = /^case-713-(?:authority-[ABCD]|transition-observation|observer).*\.json$/;
const TRANSCRIPT_FILE = /^case-713-.*transcript.*\.jsonl$/;

function inventory() {
  const files = {};
  function walk(path) {
    for (const name of readdirSync(path).sort()) {
      const full = join(path, name);
      const rel = relative(bundle, full);
      if (rel === 'final/.gitkeep') continue;
      if (OBSERVER_FILE.test(rel) || TRANSCRIPT_FILE.test(rel)) continue;
      if (statSync(full).isDirectory()) walk(full);
      else files[rel] = sha256(readFileSync(full));
    }
  }
  walk(bundle);
  return { files, digest: sha256(JSON.stringify(files)) };
}

function snapshot(label) {
  if (!['A', 'B', 'C', 'D'].includes(label)) throw new Error('snapshot label must be A, B, C, or D');
  const captured = inventory();
  const output = { label, ...captured };
  writeFileSync(join(bundle, `case-713-authority-${label}.json`), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'snapshotted', label, digest: captured.digest, file_count: Object.keys(captured.files).length }));
}

function changedPaths(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().filter((path) => before[path] !== after[path]);
}

function transitionFinal() {
  const before = JSON.parse(readFileSync(join(bundle, 'case-713-authority-B.json'), 'utf8'));
  const gate = parseJsonOutput(runNode([
    'experiments_env/shared/run-gate-with-monitor.mjs', '--bundle', bundle, '--gate', 'readiness-passed', '--',
    process.execPath, 'DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs', '--bundle', bundle, '--current-node', 'phases/phase-readiness.md',
  ]));
  if (gate.check?.passed !== true || gate.check?.next !== 'phases/phase-final.md') throw new Error(`readiness Gate did not authorize Final: ${JSON.stringify(gate)}`);
  runNode(['DPT_FRAMEWORK/cli/enter-phase.mjs', '--bundle', bundle, '--node', gate.check.next]);
  runNode(['DPT_FRAMEWORK/cli/advance-status.mjs', '--bundle', bundle, '--to', 'readiness_passed']);
  const after = inventory();
  const changed = changedPaths(before.files, after.files);
  const allowed = changed.every((path) => path === 'rb_status.json'
    || path === 'rb_trace.jsonl'
    || path === '_logs/run.log'
    || /^_checkpoints\/[^/]+-readiness-passed\.json$/.test(path)
    || /^_diagnostics\/gates\/[^/]+-readiness-passed\.json$/.test(path)
    || /^_observability\/gates\/\d+-readiness-passed\.json$/.test(path));
  writeFileSync(join(bundle, 'case-713-transition-observation.json'), `${JSON.stringify({
    gate_passed: true,
    next: gate.check.next,
    changed,
    allowlist_match: allowed,
  }, null, 2)}\n`);
  snapshot('C');
  if (!allowed) throw new Error(`B->C changed files outside the exact allowlist: ${JSON.stringify(changed)}`);
}

function userMarkerIndexes(events, exact) {
  return events.map((event, index) => ({ event, index })).filter(({ event }) => event.role === 'user' && event.event === 'message' && event.content === exact).map(({ index }) => index);
}

function record711(events) {
  const marker = userMarkerIndexes(events, '按这个开始');
  const split = marker[0] ?? events.length;
  const beforeText = assistantText(events.slice(0, split));
  const afterText = assistantText(events.slice(split + 1));
  const tools = toolFacts(events);
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  const planText = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
  const seedFiles = readdirSync(join(bundle, 'seed_topics')).filter((name) => name.endsWith('.md'));
  const trace = traceEvents();
  const available = profile.research_access?.status === 'available';
  const unavailable = profile.research_access?.status === 'unavailable';
  const gatePass = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded' && event.passed === true);
  const gateFail = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded' && event.passed === false);
  const setupLoad = trace.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-setup.md');
  recordCheck(tracePath, { gate: 'case-711-transcript-contract', passed: marker.length === 1 && /目标|范围/.test(beforeText) && /must-answer|必须回答/i.test(beforeText) && /topic|话题/i.test(beforeText) && /推荐|建议/.test(beforeText), detail: `user_markers=${marker.length}` });
  recordCheck(tracePath, { gate: 'case-711-no-second-confirmation', passed: !/(是否确认|确定吗|再确认|请确认)/.test(afterText), detail: afterText.slice(0, 300) });
  recordCheck(tracePath, { gate: 'case-711-subject-owned-existing-writes', passed: profile.human_decision_checkpoints?.hitl1?.status === 'recorded' && profile.research_profile !== 'not_selected' && profile.root_must_answer_set?.length > 0 && /topic_registry/.test(planText) && seedFiles.length > 0 && /operate-topic-state|apply-research-style|rb_profile\.yaml/.test(tools.serialized), detail: `profile=${profile.research_profile} seeds=${seedFiles.length}` });
  recordCheck(tracePath, { gate: 'case-711-real-probe-and-gate-branch', passed: available ? tools.names.includes('WebSearch') && tools.names.includes('WebFetch') && gatePass && setupLoad : unavailable && gateFail && !setupLoad && /(WebSearch|search|unavailable|blocked|missing)/i.test(tools.serialized + afterText), detail: `available=${available} unavailable=${unavailable} gatePass=${gatePass} gateFail=${gateFail} setupLoad=${setupLoad}` });
}

function record712(events) {
  const marker = userMarkerIndexes(events, '资本约束这部分还不够，再补一下');
  const split = marker[0] ?? events.length;
  const beforeText = assistantText(events.slice(0, split));
  const allAssistant = assistantText(events);
  const tools = toolFacts(events);
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  const trace = traceEvents();
  const hitl2 = profile.human_decision_checkpoints?.hitl2 || {};
  const gatePass = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded' && event.passed === true);
  const rerunLoad = trace.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-rerun.md' && event.handoff_source_gate === 'hitl2-recorded');
  recordCheck(tracePath, { gate: 'case-712-review-and-one-recommendation', passed: marker.length === 1 && /证据|研究/.test(beforeText) && /不足|缺口|谨慎/.test(beforeText) && /推荐|建议/.test(beforeText), detail: `user_markers=${marker.length}` });
  recordCheck(tracePath, { gate: 'case-712-natural-language-mapping', passed: hitl2.status === 'recorded' && hitl2.user_decision === 'rerun' && /资本约束/.test(hitl2.rationale || '') && gatePass && rerunLoad && /rb_profile\.yaml|hitl2-recorded|enter-phase/.test(tools.serialized), detail: JSON.stringify({ status: hitl2.status, decision: hitl2.user_decision, rationale: hitl2.rationale, gatePass, rerunLoad }) });
  recordCheck(tracePath, { gate: 'case-712-user-facing-contract', passed: !/(proceed_to_readiness|request_view_revision|stop_blocked|quick_factual|exploratory_map|claim_verification)/.test(allAssistant) && !/(是否确认|确定吗|再确认|请确认)/.test(assistantText(events.slice(split + 1))), detail: allAssistant.slice(0, 400) });
}

function record713() {
  const a = JSON.parse(readFileSync(join(bundle, 'case-713-authority-A.json'), 'utf8'));
  const b = JSON.parse(readFileSync(join(bundle, 'case-713-authority-B.json'), 'utf8'));
  const c = JSON.parse(readFileSync(join(bundle, 'case-713-authority-C.json'), 'utf8'));
  const d = JSON.parse(readFileSync(join(bundle, 'case-713-authority-D.json'), 'utf8'));
  const transition = JSON.parse(readFileSync(join(bundle, 'case-713-transition-observation.json'), 'utf8'));
  const readinessEvents = transcriptEvents(join(bundle, 'case-713-readiness-transcript.jsonl'));
  const finalEvents = transcriptEvents(join(bundle, 'case-713-final-transcript.jsonl'));
  const readinessText = assistantText(readinessEvents);
  const finalText = assistantText(finalEvents);
  const finalFiles = readdirSync(join(bundle, 'final')).filter((name) => name !== '.gitkeep');
  recordCheck(tracePath, { gate: 'case-713-readiness-reply-no-authority', passed: a.digest === b.digest && /readiness|就绪/i.test(readinessText) && !/(已经全部完成|已经交付|正在生成|请等待)/.test(readinessText), detail: `${a.digest} -> ${b.digest}` });
  recordCheck(tracePath, { gate: 'case-713-runner-transition-allowlist', passed: transition.gate_passed === true && transition.next === 'phases/phase-final.md' && transition.allowlist_match === true, detail: JSON.stringify(transition.changed) });
  recordCheck(tracePath, { gate: 'case-713-final-reply-no-authority', passed: c.digest === d.digest && /尚未|还没有|为空|未生成|不存在/.test(finalText) && !/(已交付|已经生成|请确认|是否继续|repair loop)/i.test(finalText), detail: `${c.digest} -> ${d.digest}` });
  recordCheck(tracePath, { gate: 'case-713-final-remains-empty', passed: finalFiles.length === 0, detail: JSON.stringify(finalFiles) });
}

function verdict() {
  if (caseId === '711' || caseId === '712') {
    const path = option('--transcript') || join(bundle, `case-${caseId}-transcript.jsonl`);
    const events = transcriptEvents(path);
    if (!events) {
      notRun(`missing independent subject transcript: ${path}`);
    }
    if (caseId === '711') record711(events);
    else record712(events);
  } else {
    const readiness = join(bundle, 'case-713-readiness-transcript.jsonl');
    const final = join(bundle, 'case-713-final-transcript.jsonl');
    if (!existsSync(readiness) || !existsSync(final)) {
      notRun('missing one or both independent case-713 transcripts');
    }
    record713();
  }
  console.log(JSON.stringify({ status: 'observed', case: caseId }));
}

if (action === 'hash') hashTranscript(option('--transcript'));
else if (action === 'snapshot') snapshot(option('--label'));
else if (action === 'transition-final') transitionFinal();
else if (action === 'verdict') verdict();
else throw new Error(`unsupported action: ${action}`);
