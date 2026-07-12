#!/usr/bin/env node
// @impl FRE-005, DEW-002, DEW-013, DEW-014
// Work-unit CLI. Claim/inspect/submit are wired; terminal commands are added in later apply sections.

import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  drySubmitWorkUnit,
  inspectWorkUnits,
  lateSubmitWorkUnit,
  openWorkUnitBatch,
  submitWorkUnit,
  timeoutPreflightWorkUnit,
} from '../engine/work-unit-core.mjs';

function usage() {
  console.error(`Usage:
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase waveN [--count N] --actor-outcome <available|unavailable|unknown> --actor-source <native_probe|not_observed> --actor-role-key <role> --actor-reason <reason> --execution-actor <delegated_subagent|phase_agent_fallback>
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs dry-submit <bundle> --work-id <id> --result <result.json>
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <id> [--result <result.json>]
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <id> --result <result.json>
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs fail <bundle> --work-id <id> --reason <reason>
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout <bundle> --work-id <id> --reason <reason> [--force]
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs abandon <bundle> --work-id <id> --reason <reason>
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch <bundle> --phase waveN --reason <reason>
  node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>`);
}

function emit(value) {
  writeFileSync(1, `${JSON.stringify(value, null, 2)}\n`);
}

function isHelpToken(value) {
  return value === '--help' || value === '-h';
}

function guardInvocation(args) {
  const [maybeCommand, maybeBundle] = args;
  if (isHelpToken(maybeCommand)) {
    usage();
    process.exit(0);
  }
  if (!maybeCommand || !maybeBundle) {
    usage();
    process.exit(1);
  }
  if (isHelpToken(maybeBundle)) {
    console.error(`Subcommand '${maybeCommand}' requires a bundle path before help flags.`);
    usage();
    process.exit(1);
  }
  if (String(maybeBundle).startsWith('-')) {
    console.error(`Suspicious bundle argument '${maybeBundle}': positional bundle paths must not start with '-'.`);
    usage();
    process.exit(1);
  }
}

const rawArgs = process.argv.slice(2);
guardInvocation(rawArgs);

const [command, bundle] = rawArgs;
if (!command || !bundle) {
  usage();
  process.exit(1);
}

const bundleDir = path.resolve(bundle);
const { values } = parseArgs({
  args: rawArgs.slice(2),
  options: {
    phase: { type: 'string' },
    count: { type: 'string', default: '1' },
    'work-id': { type: 'string' },
    result: { type: 'string' },
    reason: { type: 'string' },
    force: { type: 'boolean', default: false },
    'actor-outcome': { type: 'string' },
    'actor-source': { type: 'string' },
    'actor-role-key': { type: 'string' },
    'actor-reason': { type: 'string' },
    'execution-actor': { type: 'string', default: 'delegated_subagent' },
  },
  allowPositionals: false,
});

try {
  if (command === 'claim') {
    if (!values.phase) throw new Error('--phase is required');
    const hasObservation = values['actor-outcome'] || values['actor-source'] || values['actor-role-key'] || values['actor-reason'];
    const actorObservation = hasObservation ? {
      outcome: values['actor-outcome'],
      source: values['actor-source'],
      role_key: values['actor-role-key'],
      reason_code: values['actor-reason'],
    } : null;
    const result = claimWorkUnits(bundleDir, {
      phase: values.phase,
      count: values.count,
      actorObservation,
      executionActorClass: values['execution-actor'],
    });
    emit(result);
    process.exit(result.claimed_count > 0 ? 0 : 1);
  }
  if (command === 'inspect') {
    const result = inspectWorkUnits(bundleDir, {
      emitDiagnostics: true,
      diagnosticSource: 'operate-work-unit',
    });
    emit(result);
    process.exit(result.passed ? 0 : 1);
  }
  if (command === 'submit') {
    if (!values['work-id']) throw new Error('--work-id is required');
    if (!values.result) throw new Error('--result is required');
    const result = submitWorkUnit(bundleDir, {
      work_id: values['work-id'],
      resultPath: path.resolve(values.result),
    });
    emit(result);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === 'dry-submit') {
    if (!values['work-id']) throw new Error('--work-id is required');
    if (!values.result) throw new Error('--result is required');
    const result = drySubmitWorkUnit(bundleDir, {
      work_id: values['work-id'],
      resultPath: path.resolve(values.result),
    });
    emit(result);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === 'late-submit') {
    if (!values['work-id']) throw new Error('--work-id is required');
    if (!values.result) throw new Error('--result is required');
    const result = lateSubmitWorkUnit(bundleDir, {
      work_id: values['work-id'],
      resultPath: path.resolve(values.result),
      reason: values.reason,
    });
    emit(result);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === 'timeout-preflight') {
    if (!values['work-id']) throw new Error('--work-id is required');
    const result = timeoutPreflightWorkUnit(bundleDir, {
      work_id: values['work-id'],
      resultPath: values.result ? path.resolve(values.result) : null,
    });
    emit(result);
    process.exit(result.timeout_eligible ? 0 : 1);
  }
  if (['fail', 'timeout', 'abandon'].includes(command)) {
    if (!values['work-id']) throw new Error('--work-id is required');
    if (!values.reason) throw new Error('--reason is required');
    const status = command === 'fail' ? 'failed' : command === 'timeout' ? 'timed_out' : 'abandoned';
    const result = closeWorkUnitAttempt(bundleDir, {
      work_id: values['work-id'],
      status,
      reason: values.reason,
      force: command === 'timeout' ? Boolean(values.force) : false,
    });
    emit(result);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === 'open-batch') {
    if (!values.phase) throw new Error('--phase is required');
    if (!values.reason) throw new Error('--reason is required');
    const result = openWorkUnitBatch(bundleDir, { phase: values.phase, reason: values.reason });
    emit(result);
    process.exit(result.ok ? 0 : 1);
  }
  usage();
  process.exit(1);
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
