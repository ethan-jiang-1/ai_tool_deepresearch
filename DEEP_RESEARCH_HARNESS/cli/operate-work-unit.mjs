#!/usr/bin/env node
// @impl FRE-005, DEW-002, DEW-006, DEW-013, DEW-014, DEW-023, DEW-024, CHI-004
// Work-unit CLI. Claim/inspect/submit are wired; terminal commands are added in later apply sections.

import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  collectEligibleRows,
  drySubmitWorkUnit,
  inspectWorkUnits,
  lateSubmitWorkUnit,
  openWorkUnitBatch,
  recoverWorkUnitDeclaration,
  recoverWorkUnitTransaction,
  replaceWorkUnitAttempt,
  submitWorkUnit,
  supersedeWorkUnitAttempt,
  timeoutPreflightWorkUnit,
} from '../engine/work-unit-core.mjs';

function usage() {
  console.error(`Usage:
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim <bundle> --phase waveN [--count N] --actor-outcome <available|unavailable|unknown> --actor-source <native_probe|not_observed> --actor-role-key <role> --actor-reason <reason> --execution-actor <delegated_subagent|phase_agent_fallback>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs dry-submit <bundle> --work-id <id> --result <result.json>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <id> [--result <result.json>]
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs submit <bundle> --work-id <id> --result <result.json>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs replace <bundle> --work-id <failed_or_abandoned_id>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede <bundle> --work-id <submitted_id> --reason <reason>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction <bundle> --tx-id <id>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs fail <bundle> --work-id <id> --reason <reason>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs timeout <bundle> --work-id <id> --reason <reason> [--force]
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs abandon <bundle> --work-id <id> --reason <reason>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs open-batch <bundle> --phase waveN --reason <reason>
  node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect <bundle>`);
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

function assertOnlySuppliedOptions(args, allowed, command) {
  const supplied = args
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => arg.slice(2).split('=', 1)[0]);
  const unsupported = [...new Set(supplied)].filter((name) => !allowed.has(name));
  if (unsupported.length > 0) {
    throw new Error(`${command} does not accept ${unsupported.map((name) => `--${name}`).join(', ')}`);
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
    'eligible-rows': { type: 'boolean', default: false },
    topic: { type: 'string' },
    'tx-id': { type: 'string' },
  },
  allowPositionals: false,
});

try {
  if (command === 'claim') {
    if (!values.phase) throw new Error('--phase is required');
    const hasObservation = ['actor-outcome', 'actor-source', 'actor-role-key', 'actor-reason']
      .some((option) => Object.hasOwn(values, option));
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
      requireExistingAuthority: true,
    });
    if (values['eligible-rows']) {
      if (!values.phase) throw new Error('--phase is required with --eligible-rows');
      const eligible = collectEligibleRows(bundleDir, values.phase, values.topic || null);
      result.eligible_rows = eligible.rows;
      if (!eligible.passed) {
        result.passed = false;
        result.check = false;
        result.inspect = [...(result.inspect || []), ...eligible.root_findings.map((finding) => finding.missing_fact)];
        result.warnings = [...(result.warnings || []), 'eligible_rows: work-unit authority is inconsistent; rows may be incomplete'];
      }
      if (eligible.warnings?.length) {
        result.warnings = [...(result.warnings || []), ...eligible.warnings];
      }
    }
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
  if (command === 'recover-declaration') {
    if (!values['work-id']) throw new Error('--work-id is required');
    if (values.result) throw new Error('recover-declaration does not accept --result');
    const result = recoverWorkUnitDeclaration(bundleDir, { work_id: values['work-id'] });
    emit(result);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === 'recover-transaction') {
    assertOnlySuppliedOptions(rawArgs.slice(2), new Set(['tx-id']), command);
    if (!values['tx-id']) throw new Error('--tx-id is required');
    const result = recoverWorkUnitTransaction(bundleDir, { tx_id: values['tx-id'] });
    emit(result);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === 'replace') {
    if (!values['work-id']) throw new Error('--work-id is required');
    const result = replaceWorkUnitAttempt(bundleDir, { work_id: values['work-id'] });
    emit(result);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === 'supersede') {
    assertOnlySuppliedOptions(rawArgs.slice(2), new Set(['work-id', 'reason']), command);
    if (!values['work-id']) throw new Error('--work-id is required');
    if (!values.reason) throw new Error('--reason is required');
    const result = supersedeWorkUnitAttempt(bundleDir, {
      work_id: values['work-id'],
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
