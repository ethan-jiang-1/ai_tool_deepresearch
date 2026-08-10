#!/usr/bin/env node
// @impl PRP-002, PRP-005, REA-002, REA-003

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

import { createTrace } from '../../DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { recordCheck } from './wff-playbook-utils.mjs';

const [caseId, action, ...rest] = process.argv.slice(2);
const bundleIndex = rest.indexOf('--bundle');
const bundle = bundleIndex >= 0 ? rest[bundleIndex + 1] : null;
if (!['115', '711', '712', '713', '714', '716'].includes(caseId) || !action || !bundle) {
  console.error('Usage: node experiments_env/shared/observe-iterative-interaction-case.mjs <115|711|712|713|714|716> <hash|snapshot|transition-final|verdict> --bundle <path> [--label A] [--transcript <path>]');
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

function publicToolExchanges(events) {
  const uses = new Map();
  const results = new Map();
  for (const [eventIndex, event] of events.entries()) {
    if (!['assistant', 'user'].includes(event?.type)) continue;
    const blocks = event.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const [blockIndex, block] of blocks.entries()) {
      const index = eventIndex + (blockIndex / 1000);
      if (block?.type === 'tool_use') {
        if (typeof block.id !== 'string' || !block.id || typeof block.name !== 'string' || !block.name || !block.input || typeof block.input !== 'object') {
          notRun('malformed public tool_use identity or payload');
        }
        const normalized = { name: block.name, input: block.input };
        const previous = uses.get(block.id);
        if (previous && JSON.stringify(previous.value) !== JSON.stringify(normalized)) {
          notRun(`conflicting public tool_use identity: ${block.id}`);
        }
        if (!previous) uses.set(block.id, { id: block.id, index, value: normalized });
      }
      if (block?.type === 'tool_result') {
        if (typeof block.tool_use_id !== 'string' || !block.tool_use_id || typeof block.content !== 'string') {
          notRun('malformed public tool_result identity or payload');
        }
        const normalized = { content: block.content, is_error: block.is_error === true };
        const previous = results.get(block.tool_use_id);
        if (previous && JSON.stringify(previous.value) !== JSON.stringify(normalized)) {
          notRun(`conflicting public tool_result identity: ${block.tool_use_id}`);
        }
        if (!previous) results.set(block.tool_use_id, { id: block.tool_use_id, index, value: normalized });
      }
    }
  }
  for (const use of uses.values()) {
    if (['WebSearch', 'WebFetch', 'Bash'].includes(use.value.name) && !results.has(use.id)) {
      notRun(`missing public tool_result for ${use.value.name} identity ${use.id}`);
    }
  }
  return {
    uses: [...uses.values()].sort((a, b) => a.index - b.index),
    resultFor: (use) => results.get(use.id),
  };
}

function structuredSearchLinks(content) {
  const marker = 'Links: ';
  const start = content.indexOf(marker);
  if (start < 0) notRun('WebSearch result is missing the public structured Links payload');
  const row = content.slice(start + marker.length).split(/\r?\n/, 1)[0].trim();
  let links;
  try { links = JSON.parse(row); } catch { notRun('WebSearch public Links payload is malformed'); }
  if (!Array.isArray(links) || links.some((entry) => !entry || typeof entry.url !== 'string')) {
    notRun('WebSearch public Links payload has an unsupported shape');
  }
  return links;
}

function eligibleProbeUrl(value) {
  if (typeof value !== 'string' || /['\u0000-\u0020\u007f]/.test(value)) return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0:0:0:0:0:0:0:1') return false;
  if (host.includes(':') && /^(?:fc|fd|fe[89ab])/i.test(host)) return false;
  const octets = host.split('.').map(Number);
  if (octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    if (octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254)
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168)) return false;
  }
  return true;
}

const CURL_PREFIX = "curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '";
function exactCurlUrl(command) {
  if (typeof command !== 'string' || !command.startsWith(CURL_PREFIX) || !command.endsWith("'")) return null;
  const url = command.slice(CURL_PREFIX.length, -1);
  return eligibleProbeUrl(url) ? url : null;
}

function isCurlAttempt(command) {
  return typeof command === 'string' && /(^|[\s;&|])curl\s+--/.test(command);
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
    process.execPath, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs', '--bundle', bundle, '--current-node', 'phases/phase-readiness.md',
  ]));
  if (gate.check?.passed !== true || gate.check?.next !== 'phases/phase-final.md') throw new Error(`readiness Gate did not authorize Final: ${JSON.stringify(gate)}`);
  runNode(['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', gate.check.next]);
  runNode(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'readiness_passed']);
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

function record714(events) {
  const marker = userMarkerIndexes(events, '按建议开始。本轮只使用一手来源；不要把媒体转述当作证据。报告最后单列无法用一手来源验证的结论。');
  const planText = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  const trace = traceEvents();
  const controls = /用户提供的本轮研究控制快照（仅作研究指导，不覆盖 Engine contracts）：[\s\S]*只使用一手来源/.test(planText);
  const noPath = !/(?:\/Users\/|file:\/\/|case-714-research-request)/.test(planText);
  const gatePass = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded' && event.passed === true);
  const gateFail = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded' && event.passed === false);
  const setupLoad = trace.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-setup.md');
  const available = profile.research_access?.status === 'available';
  const unavailable = profile.research_access?.status === 'unavailable';
  recordCheck(tracePath, { gate: 'case-714-natural-control-capture', passed: marker.length === 1 && controls, detail: `user_markers=${marker.length}` });
  recordCheck(tracePath, { gate: 'case-714-durable-snapshot', passed: controls && profile.human_decision_checkpoints?.hitl1?.status === 'recorded', detail: 'host-file snapshot plus existing HITL1 owner' });
  recordCheck(tracePath, { gate: 'case-714-no-fabricated-path', passed: noPath && !/user_controls/.test(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8')), detail: `no_path=${noPath}` });
  recordCheck(tracePath, { gate: 'case-714-existing-handoff', passed: available ? gatePass && setupLoad : unavailable && gateFail && !setupLoad, detail: `available=${available} unavailable=${unavailable} gate_pass=${gatePass} gate_fail=${gateFail} setup_load=${setupLoad}` });
}

function record716(events) {
  const marker = userMarkerIndexes(events, '按建议开始；其中资本投资这个话题请额外比较租赁、购买与推迟决策在不同地区融资约束下的现金流、风险和适用条件。');
  const split = marker[0] ?? events.length;
  const beforeText = assistantText(events.slice(0, split));
  const planText = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
  const profileText = readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8');
  const profile = parseYaml(profileText);
  const trace = traceEvents();
  const seedCount = readdirSync(join(bundle, 'seed_topics')).filter((name) => name.endsWith('.md')).length;
  const controls = /用户提供的本轮研究控制快照（仅作研究指导，不覆盖 Engine contracts）：[\s\S]*用户的重点原话（逐字保留）[\s\S]*租赁、购买与推迟[\s\S]*Agent 对本轮额外研究方向的理解（可由用户修正）/.test(planText);
  const available = profile.research_access?.status === 'available';
  const unavailable = profile.research_access?.status === 'unavailable';
  const gatePass = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded' && event.passed === true);
  const gateFail = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded' && event.passed === false);
  const setupLoad = trace.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-setup.md');
  const reviewableMap = seedCount > 5 && /研究线程|线程|分组/.test(beforeText);
  recordCheck(tracePath, { gate: 'case-716-broad-reviewable-topic-map', passed: marker.length === 1 && reviewableMap, detail: `user_markers=${marker.length} seeds=${seedCount}` });
  recordCheck(tracePath, { gate: 'case-716-labelled-focus-snapshot', passed: controls && profile.human_decision_checkpoints?.hitl1?.status === 'recorded' && !/重点原话|额外研究方向|租赁、购买/.test(profileText), detail: `controls=${controls} profile_has_focus=${/重点原话|额外研究方向|租赁、购买/.test(profileText)}` });
  recordCheck(tracePath, { gate: 'case-716-existing-handoff', passed: available ? gatePass && setupLoad : unavailable && gateFail && !setupLoad, detail: `available=${available} unavailable=${unavailable} gate_pass=${gatePass} gate_fail=${gateFail} setup_load=${setupLoad}` });
}

function case115ResultText(event) {
  if (typeof event?.result === 'string') return event.result.trim();
  if (typeof event?.output === 'string') return event.output.trim();
  const text = collectText(event, []).join('\n').trim();
  return text || null;
}

function parseCase115Return(events) {
  const resultPath = join(bundle, 'case-115-subject-result.json');
  let resultEvents = events.filter((event) => event?.type === 'result');
  if (existsSync(resultPath)) {
    let retained;
    try { retained = JSON.parse(readFileSync(resultPath, 'utf8')); } catch { notRun('malformed retained case-115 Subject result'); }
    if (retained.status !== 'completed' || !Array.isArray(retained.result_events)) {
      notRun('case-115 Subject did not retain one completed final result');
    }
    resultEvents = retained.result_events;
  }

  if (resultEvents.length !== 1) notRun('case-115 requires exactly one final Subject result event');
  const text = case115ResultText(resultEvents[0]);
  if (!text || !/^research_access:\s*\n/.test(text) || /```/.test(text)) {
    notRun('case-115 final Subject result is not the required compact YAML return map');
  }

  let returned;
  try { returned = parseYaml(text); } catch { notRun('case-115 final Subject return map is malformed YAML'); }
  if (!returned || typeof returned !== 'object' || Array.isArray(returned)
    || Object.keys(returned).length !== 1 || !returned.research_access
    || typeof returned.research_access !== 'object' || Array.isArray(returned.research_access)) {
    notRun('case-115 final Subject return must contain exactly one research_access object');
  }
  return returned.research_access;
}

function validateCase115Access(access) {
  const allowed = new Set([
    'status', 'probed_at', 'result_url', 'fetch_outcome', 'reason',
    'search_surface', 'fetch_surface', 'eligible_candidate_count', 'final_candidate_ordinal',
  ]);
  if (Object.keys(access).some((key) => !allowed.has(key))) return 'return map contains a non-profile observation field';
  if (!['available', 'unavailable'].includes(access.status)) return 'return map has an invalid status';
  if (typeof access.probed_at !== 'string' || Number.isNaN(Date.parse(access.probed_at))) return 'return map lacks an ISO timestamp';
  if (!Number.isInteger(access.eligible_candidate_count) || access.eligible_candidate_count < 0 || access.eligible_candidate_count > 3) return 'return map has invalid candidate count';
  if (access.search_surface !== undefined && access.search_surface !== 'WebSearch') return 'return map search surface contradicts public tool facts';
  if (access.eligible_candidate_count === 0) {
    if (access.status !== 'unavailable' || access.fetch_outcome !== 'not_attempted' || typeof access.reason !== 'string' || !access.reason.trim()
      || access.final_candidate_ordinal !== undefined || access.result_url !== undefined || access.fetch_surface !== undefined) return 'zero-candidate return map contradicts the unavailable branch';
    return null;
  }
  if (!Number.isInteger(access.final_candidate_ordinal) || access.final_candidate_ordinal !== access.eligible_candidate_count
    || typeof access.result_url !== 'string' || !eligibleProbeUrl(access.result_url)) return 'positive-count return map lacks the final returned candidate';
  if (access.status === 'available') {
    if (access.fetch_outcome !== 'success' || !['WebFetch', 'curl'].includes(access.fetch_surface)) return 'available return map contradicts its fetch result';
    return null;
  }
  if (!['failed', 'blocked', 'not_attempted'].includes(access.fetch_outcome) || typeof access.reason !== 'string' || !access.reason.trim()) {
    return 'unavailable return map lacks a direct failed observation';
  }
  return null;
}

function record115(events) {
  const tools = publicToolExchanges(events);
  const disallowed = tools.uses.filter((use) => use.value.name !== 'WebSearch'
    && use.value.name !== 'WebFetch'
    && (use.value.name !== 'Bash' || !isCurlAttempt(use.value.input.command)));
  if (disallowed.length > 0) notRun(`case-115 isolated probe used an unauthorized public tool: ${disallowed[0].value.name}`);

  const searchUses = tools.uses.filter((use) => use.value.name === 'WebSearch');
  const nativeUses = tools.uses.filter((use) => use.value.name === 'WebFetch');
  const curlUses = tools.uses.filter((use) => use.value.name === 'Bash');
  if (searchUses.length !== 1) notRun('case-115 requires exactly one public WebSearch tool_use');
  const search = searchUses[0];
  if (search.value.input.query !== 'site:wikipedia.org "Internet protocol suite"') {
    notRun('case-115 WebSearch query is not the fixed neutral capability query');
  }
  const searchResult = tools.resultFor(search);
  if (!searchResult) notRun('missing public WebSearch tool_result');
  if (nativeUses.some((use) => use.index <= searchResult.index) || curlUses.some((use) => use.index <= searchResult.index)) {
    notRun('case-115 fetch attempt preceded the public WebSearch result');
  }
  const links = searchResult.value.is_error ? [] : structuredSearchLinks(searchResult.value.content);
  const candidates = links.map((link) => link.url).filter(eligibleProbeUrl).slice(0, 3);
  const access = parseCase115Return(events);
  const shapeError = validateCase115Access(access);
  if (shapeError) notRun(shapeError);

  const count = access.eligible_candidate_count;
  const ordinal = access.final_candidate_ordinal;
  if (count === 0) {
    if (candidates.length !== 0 || nativeUses.length !== 0 || curlUses.length !== 0) {
      notRun('zero-candidate return contradicts public search or fetch events');
    }
    recordCheck(tracePath, { gate: 'hitl1-research-access-probe', passed: true, detail: 'isolated no-candidate unavailable return' });
    recordCheck(tracePath, { gate: 'probe-evidence-boundary', passed: true, detail: 'no bundle, profile, or Gate actor claim observed' });
    return;
  }

  if (ordinal !== count || count > candidates.length || access.result_url !== candidates[ordinal - 1]) {
    notRun('return map final candidate metadata contradicts public returned candidate order');
  }
  if (nativeUses.length !== count && nativeUses.length !== count - 1) {
    notRun('public native fetch count contradicts the bounded returned observation');
  }
  const nativeToCurl = new Map();
  const hasRealContent = (result) => Boolean(result && !result.value.is_error && result.value.content.trim());

  for (const [index, native] of nativeUses.entries()) {
    const nativeResult = tools.resultFor(native);
    const nextNative = nativeUses[index + 1];
    if (!nativeResult || native.value.input.url !== candidates[index]) {
      notRun('public native fetch target or result contradicts the returned candidate order');
    }
    const curls = curlUses.filter((curl) => curl.index > nativeResult.index && (!nextNative || curl.index < nextNative.index));
    if (curls.length > 1) notRun('more than one curl fallback followed a native fetch');
    const curl = curls[0];
    if (curl) {
      const curlResult = tools.resultFor(curl);
      if (!curlResult || hasRealContent(nativeResult) || exactCurlUrl(curl.value.input.command) !== candidates[index]) {
        notRun('public curl fallback is not an exact same-URL native-failure fallback');
      }
      nativeToCurl.set(index, { use: curl, result: curlResult });
    }
    if (hasRealContent(nativeResult) && (index !== count - 1 || curl)) {
      notRun('probe continued after native real page content');
    }
    if (curl && hasRealContent(nativeToCurl.get(index).result) && index !== count - 1) {
      notRun('probe continued after fallback real page content');
    }
    if (index < count - 1 && (!curl || hasRealContent(nativeToCurl.get(index).result))) {
      notRun('probe considered a later candidate without exhausting the current permitted sequence');
    }
  }
  const finalIndex = count - 1;
  const finalNative = nativeUses[finalIndex];
  const unboundCurls = curlUses.filter((curl) => ![...nativeToCurl.values()].some((entry) => entry.use.id === curl.id));
  let absentNativeFinalCurl = null;
  if (!finalNative && unboundCurls.length === 1) {
    const curl = unboundCurls[0];
    const curlResult = tools.resultFor(curl);
    if (!curlResult || exactCurlUrl(curl.value.input.command) !== candidates[finalIndex]) {
      notRun('public curl fallback is not an exact same-URL native-absent fallback');
    }
    absentNativeFinalCurl = { use: curl, result: curlResult };
  } else if (unboundCurls.length > 0) {
    notRun('public curl fallback has no preceding native fetch');
  }

  const finalNativeResult = finalNative ? tools.resultFor(finalNative) : null;
  const finalCurl = nativeToCurl.get(finalIndex) || absentNativeFinalCurl;
  let branch = null;
  if (!finalNative) {
    if (!finalCurl && (access.status !== 'unavailable' || access.fetch_outcome !== 'not_attempted')) {
      notRun('no-legal-fetch return contradicts public tool facts');
    }
    if (finalCurl && hasRealContent(finalCurl.result)) {
      if (access.status !== 'available' || access.fetch_outcome !== 'success' || access.fetch_surface !== 'curl') {
        notRun('available curl return contradicts public same-URL native-absent fallback content');
      }
      branch = 'available-curl';
    } else if (finalCurl) {
      if (access.status !== 'unavailable' || access.fetch_outcome === 'success' || access.fetch_surface !== 'curl') {
        notRun('unavailable native-absent fallback return contradicts public fetch facts');
      }
      branch = 'unavailable-curl';
    } else {
      branch = 'unavailable-no-native-surface';
    }
  } else if (hasRealContent(finalNativeResult)) {
    if (access.status !== 'available' || access.fetch_outcome !== 'success' || access.fetch_surface !== 'WebFetch') {
      notRun('available native return contradicts public fetch content');
    }
    branch = 'available-native';
  } else if (finalCurl && hasRealContent(finalCurl.result)) {
    if (access.status !== 'available' || access.fetch_outcome !== 'success' || access.fetch_surface !== 'curl') {
      notRun('available curl return contradicts public same-URL fallback content');
    }
    branch = 'available-curl';
  } else {
    if (access.status !== 'unavailable' || access.fetch_outcome === 'success') {
      notRun('unavailable return contradicts public non-success fetch facts');
    }
    if (finalCurl && access.fetch_surface !== 'curl') notRun('unavailable fallback return has the wrong final fetch surface');
    if (!finalCurl && access.fetch_surface !== undefined && access.fetch_surface !== 'WebFetch') notRun('unavailable native return has the wrong fetch surface');
    branch = finalCurl ? 'unavailable-curl' : 'unavailable-native';
  }

  recordCheck(tracePath, { gate: 'hitl1-research-access-probe', passed: true, detail: `isolated ${branch} return matched public events` });
  recordCheck(tracePath, { gate: 'probe-evidence-boundary', passed: true, detail: 'probe return is compact; observer attributes no profile write or Gate execution' });
  if (branch === 'available-curl') {
    recordCheck(tracePath, { gate: 'hitl1-native-to-curl-fallback', passed: true, detail: 'public permitted same-URL curl return matched' });
  }
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
  const hasOpenBoundary = /不足|缺口|谨慎|空缺|未知|gap/i.test(beforeText);
  const hasOneNextStep = /推荐|建议|下一步/i.test(beforeText);
  recordCheck(tracePath, { gate: 'case-712-review-and-one-recommendation', passed: marker.length === 1 && /证据|研究/.test(beforeText) && hasOpenBoundary && hasOneNextStep, detail: `user_markers=${marker.length}` });
  recordCheck(tracePath, { gate: 'case-712-natural-language-mapping', passed: hitl2.status === 'recorded' && hitl2.user_decision === 'rerun' && /资本约束/.test(hitl2.rationale || '') && /用户的重点原话（逐字保留）/.test(hitl2.rationale || '') && /Agent 对本轮额外研究方向的理解（可由用户修正）/.test(hitl2.rationale || '') && gatePass && rerunLoad && /rb_profile\.yaml|hitl2-recorded|enter-phase/.test(tools.serialized), detail: JSON.stringify({ status: hitl2.status, decision: hitl2.user_decision, rationale: hitl2.rationale, gatePass, rerunLoad }) });
  recordCheck(tracePath, { gate: 'case-712-user-facing-contract', passed: !/(proceed_to_readiness|request_view_revision|stop_blocked|quick_factual|exploratory_map|claim_verification)/.test(allAssistant) && !/(是否确认|确定吗|再确认|请确认)/.test(assistantText(events.slice(split + 1))), detail: allAssistant.slice(0, 400) });
}

function record713() {
  const transition = JSON.parse(readFileSync(join(bundle, 'case-713-transition-observation.json'), 'utf8'));
  const readinessEvents = transcriptEvents(join(bundle, 'case-713-readiness-transcript.jsonl'));
  const finalEvents = transcriptEvents(join(bundle, 'case-713-final-transcript.jsonl'));
  const finalFiles = readdirSync(join(bundle, 'final')).filter((name) => name !== '.gitkeep');
  recordCheck(tracePath, { gate: 'case-713-runner-transition-allowlist', passed: transition.gate_passed === true && transition.next === 'phases/phase-final.md' && transition.allowlist_match === true, detail: JSON.stringify(transition.changed) });
  recordCheck(tracePath, { gate: 'case-713-final-remains-empty', passed: finalFiles.length === 0, detail: JSON.stringify(finalFiles) });
  recordCheck(tracePath, { gate: 'case-713-transcript-digests', passed: readinessEvents !== null && finalEvents !== null && readinessEvents.length > 0 && finalEvents.length > 0, detail: `readiness=${!!readinessEvents} final=${!!finalEvents}` });
}

function verdict() {
  if (caseId === '115' || caseId === '711' || caseId === '712' || caseId === '714' || caseId === '716') {
    const path = option('--transcript') || join(bundle, `case-${caseId}-transcript.jsonl`);
    const events = transcriptEvents(path);
    if (!events) {
      notRun(`missing independent subject transcript: ${path}`);
    }
    if (caseId === '115') record115(events);
    else if (caseId === '711') record711(events);
    else if (caseId === '712') record712(events);
    else if (caseId === '714') record714(events);
    else record716(events);
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
