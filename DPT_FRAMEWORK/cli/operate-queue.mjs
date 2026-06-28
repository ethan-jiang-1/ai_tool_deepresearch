#!/usr/bin/env node
// @impl AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006
// @impl FRE-001: Canonical CLI location DPT_FRAMEWORK/cli/operate-queue.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  claim, complete, enqueue, fail, inspect,
  loadQueue, pendingCount, preempt, render, saveQueue, QUEUE, SLOT_NAMES,
} from '../engine/queue-manager.mjs';

function usage() {
  console.error(`Usage:
  node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
  node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task <task.json>
  node DPT_FRAMEWORK/cli/operate-queue.mjs claim <bundle> --actor <main-agent|sub-agent>
  node DPT_FRAMEWORK/cli/operate-queue.mjs complete <bundle> --result <result.json>
  node DPT_FRAMEWORK/cli/operate-queue.mjs fail <bundle> --failure <failure.json>
  node DPT_FRAMEWORK/cli/operate-queue.mjs preempt <bundle> --task <task.json> --reason <reason> [--unsafe-current]
  node DPT_FRAMEWORK/cli/operate-queue.mjs count <bundle>
  node DPT_FRAMEWORK/cli/operate-queue.mjs render <bundle>`);
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
let queue = loadQueue(bundleDir);

try {
  if (command === 'check') {
    const feedback = inspect(queue, bundleDir);
    emit(feedback);
    process.exit(feedback.passed ? 0 : 1);
  }

  if (command === 'count') {
    const active = SLOT_NAMES.filter((slot) => queue.active_window[slot] !== null).length;
    emit({
      pending: pendingCount(queue),
      active_window: active,
      refill_pool: queue.refill_pool.length,
    });
    process.exit(0);
  }

  if (command === 'enqueue') {
    if (!values.task) throw new Error('--task is required');
    queue = enqueue(queue, readJson(values.task));
    saveQueue(bundleDir, queue);
    emit({ ok: true, queue });
  } else if (command === 'claim') {
    const result = claim(queue, { actor: values.actor });
    saveQueue(bundleDir, result.queue);
    emit(result);
  } else if (command === 'complete') {
    if (!values.result) throw new Error('--result is required');
    const result = complete(queue, readJson(values.result), bundleDir);
    saveQueue(bundleDir, result.queue);
    emit(result);
    process.exit(result.feedback.passed ? 0 : 1);
  } else if (command === 'fail') {
    if (!values.failure) throw new Error('--failure is required');
    queue = fail(queue, readJson(values.failure), bundleDir);
    saveQueue(bundleDir, queue);
    emit({ ok: true, queue });
  } else if (command === 'preempt') {
    if (!values.task) throw new Error('--task is required');
    queue = preempt(queue, readJson(values.task), {
      reason: values.reason,
      unsafeCurrent: values['unsafe-current'],
      replaceCurrent: values['unsafe-current'],
    });
    saveQueue(bundleDir, queue);
    emit({ ok: true, queue });
  } else if (command === 'render') {
    const projection = render(queue, bundleDir);
    saveQueue(bundleDir, queue);
    emit({ ok: true, projection });
  } else {
    usage();
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
