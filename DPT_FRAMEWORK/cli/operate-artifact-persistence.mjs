#!/usr/bin/env node
// @impl ARP-001, ARP-002, ARP-003

import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
  ArtifactPersistenceConfigError,
  inspectArtifactPersistenceRequest,
  persistBundleFile,
  persistFinalReport,
  redirectFinalMarkdownPersist,
  sweepPendingArtifactWrites,
} from '../engine/helpers/artifact-persistence.mjs';
import { isFinalMarkdownTarget } from '../engine/helpers/final-delivery-backing.mjs';
import { logToRun } from '../engine/logger.mjs';

function emit(value) {
  writeFileSync(1, `${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return [
    'Usage:',
    '  node DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs persist --bundle <path> --source <file> --target <bundle-relative-path> (--expect-absent | --expect-sha256 <digest>)',
    '  node DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs persist-final-report --bundle <path> --source <file> --target <final/report.md> (--expect-absent | --expect-sha256 <digest>)',
    '  node DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs sweep --bundle <path>',
    '',
    'Sweep requires a quiescent bundle: do not run it concurrently with persist.',
  ].join('\n');
}

function invocationError(operation, reason) {
  return {
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: operation || null,
    error: 'invalid_invocation',
    reason,
    usage: usage(),
  };
}

const rawArgs = process.argv.slice(2);
const operation = rawArgs[0];
if (operation === '--help' || operation === '-h') {
  writeFileSync(1, `${usage()}\n`);
  process.exit(0);
}

let values;
try {
  ({ values } = parseArgs({
    args: rawArgs.slice(1),
    options: {
      bundle: { type: 'string' },
      source: { type: 'string' },
      target: { type: 'string' },
      'expect-absent': { type: 'boolean', default: false },
      'expect-sha256': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
    strict: true,
  }));
} catch (error) {
  emit(invocationError(operation, error.message));
  process.exit(2);
}

if (values.help) {
  writeFileSync(1, `${usage()}\n`);
  process.exit(0);
}

if (!['persist', 'persist-final-report', 'sweep'].includes(operation)) {
  emit(invocationError(operation, 'operation must be persist, persist-final-report, or sweep'));
  process.exit(2);
}
if (!values.bundle) {
  emit(invocationError(operation, '--bundle is required'));
  process.exit(2);
}

try {
  if (operation === 'persist' || operation === 'persist-final-report') {
    if (!values.source || !values.target) {
      emit(invocationError(operation, '--source and --target are required for persistence operations'));
      process.exit(2);
    }
    const expectationCount = Number(values['expect-absent']) + Number(Boolean(values['expect-sha256']));
    if (expectationCount !== 1) {
      emit(invocationError(operation, `${operation} requires exactly one of --expect-absent or --expect-sha256`));
      process.exit(2);
    }
    const expectedTarget = values['expect-absent']
      ? { kind: 'absent' }
      : { kind: 'sha256', value: values['expect-sha256'] };
    const request = inspectArtifactPersistenceRequest({
      bundlePath: values.bundle,
      sourcePath: values.source,
      target: values.target,
      expectedTarget,
    });
    if (operation === 'persist' && isFinalMarkdownTarget(values.target)) {
      const result = redirectFinalMarkdownPersist({ target: request.target });
      logToRun(values.bundle, 'warn', 'artifact_persistence_persist', result);
      emit(result);
      process.exit(1);
    }
    if (operation === 'persist-final-report') {
      const result = persistFinalReport({
        bundlePath: values.bundle,
        sourcePath: values.source,
        target: values.target,
        expectedTarget,
      });
      logToRun(values.bundle, result.verdict === 'blocked' ? 'warn' : 'info', 'artifact_persistence_persist_final_report', result);
      emit(result);
      process.exit(result.verdict === 'blocked' ? 1 : 0);
    }
    const result = persistBundleFile({
      bundlePath: values.bundle,
      sourcePath: values.source,
      target: values.target,
      expectedTarget,
    });
    logToRun(values.bundle, result.verdict === 'blocked' ? 'warn' : 'info', 'artifact_persistence_persist', result);
    emit(result);
    process.exit(result.verdict === 'blocked' ? 1 : 0);
  }

  if (values.source || values.target || values['expect-absent'] || values['expect-sha256']) {
    emit(invocationError(operation, 'sweep accepts only --bundle'));
    process.exit(2);
  }
  const result = sweepPendingArtifactWrites({ bundlePath: values.bundle });
  logToRun(values.bundle, result.passed ? 'info' : 'warn', 'artifact_persistence_sweep', {
    passed: result.passed,
    blocked_count: result.blocked_count,
    entry_count: result.entries.length,
  });
  emit(result);
  process.exit(result.passed ? 0 : 1);
} catch (error) {
  const configError = error instanceof ArtifactPersistenceConfigError || error?.name === 'ZodError';
  emit({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation,
    error: configError ? 'invalid_configuration' : 'operation_failed',
    reason_code: error.code || null,
    reason: error.message,
  });
  process.exit(2);
}
