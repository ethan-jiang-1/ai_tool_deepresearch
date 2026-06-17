#!/usr/bin/env node
// @impl AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { setTraceFile, traceEntry, traceInit } from './trace.mjs';
import {
  claimCurrent,
  completeCurrent,
  DEFAULT_TRACE_PATH,
  enqueue,
  failCurrent,
  inspectQueue,
  loadQueue,
  preempt,
  renderProjection,
  saveQueue,
} from './agentic-queue.mjs';

function usage() {
  console.error(`Usage:
  node agentic-queue-cli.mjs check <bundle>
  node agentic-queue-cli.mjs enqueue <bundle> --task <task.json>
  node agentic-queue-cli.mjs claim <bundle> --actor <main-agent|sub-agent>
  node agentic-queue-cli.mjs complete <bundle> --result <result.json>
  node agentic-queue-cli.mjs fail <bundle> --failure <failure.json>
  node agentic-queue-cli.mjs preempt <bundle> --task <task.json> --reason <reason> [--unsafe-current]
  node agentic-queue-cli.mjs render <bundle>`);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function emit(value) {
  console.log(JSON.stringify(value, null, 2));
}

const [command, bundle] = process.argv.slice(2);
if (!command || !bundle) {
  usage();
  process.exit(1);
}

const rest = process.argv.slice(4);
const { values } = parseArgs({
  args: rest,
  options: {
    task: { type: 'string' },
    result: { type: 'string' },
    failure: { type: 'string' },
    actor: { type: 'string', default: 'main-agent' },
    reason: { type: 'string', default: 'urgent_preemption' },
    'unsafe-current': { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

const bundleDir = path.resolve(bundle);
const tracePath = path.join(bundleDir, DEFAULT_TRACE_PATH);
setTraceFile(tracePath);
if (!existsSync(tracePath)) {
  traceInit('agq-cli', { source: 'agq-cli', command });
}
let queue = loadQueue(bundleDir);

try {
  if (command === 'check') {
    const feedback = inspectQueue(queue, bundleDir);
    traceEntry('check', { source: 'agq-cli', step: 'check', passed: feedback.passed });
    emit(feedback);
    process.exit(feedback.passed ? 0 : 1);
  }

  if (command === 'enqueue') {
    if (!values.task) throw new Error('--task is required');
    queue = enqueue(queue, readJson(values.task));
    saveQueue(bundleDir, queue);
    traceEntry('check', { source: 'agq-cli', step: 'enqueue', passed: true });
    emit({ ok: true, queue });
  } else if (command === 'claim') {
    const result = claimCurrent(queue, { actor: values.actor });
    saveQueue(bundleDir, result.queue);
    traceEntry('check', { source: 'agq-cli', step: 'claim', passed: Boolean(result.item) });
    emit(result);
  } else if (command === 'complete') {
    if (!values.result) throw new Error('--result is required');
    const result = completeCurrent(queue, readJson(values.result), bundleDir);
    saveQueue(bundleDir, result.queue);
    emit(result);
    process.exit(result.feedback.passed ? 0 : 1);
  } else if (command === 'fail') {
    if (!values.failure) throw new Error('--failure is required');
    queue = failCurrent(queue, readJson(values.failure), bundleDir);
    saveQueue(bundleDir, queue);
    traceEntry('check', { source: 'agq-cli', step: 'fail', passed: true });
    emit({ ok: true, queue });
  } else if (command === 'preempt') {
    if (!values.task) throw new Error('--task is required');
    queue = preempt(queue, readJson(values.task), {
      reason: values.reason,
      unsafeCurrent: values['unsafe-current'],
      replaceCurrent: values['unsafe-current'],
    });
    saveQueue(bundleDir, queue);
    traceEntry('check', { source: 'agq-cli', step: 'preempt', passed: true });
    emit({ ok: true, queue });
  } else if (command === 'render') {
    const projection = renderProjection(queue, bundleDir);
    saveQueue(bundleDir, queue);
    traceEntry('check', { source: 'agq-cli', step: 'render', passed: true, projection });
    emit({ ok: true, projection });
  } else {
    usage();
    process.exit(1);
  }
} catch (error) {
  traceEntry('check', { source: 'agq-cli', step: command, passed: false, error: error.message });
  console.error(error.message);
  process.exit(1);
}
