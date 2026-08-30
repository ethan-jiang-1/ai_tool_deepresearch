#!/usr/bin/env node
// @impl POF-001, POF-002, POF-003

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  applyPostFinalRecovery,
  inspectPostFinalRecovery,
  POST_FINAL_RECOVERY_SCHEMA_VERSION,
  recoverPostFinalRecovery,
} from '../engine/helpers/post-final-recovery.mjs';
import { logToRun } from '../engine/logger.mjs';

const raw = process.argv.slice(2);
const operation = raw[0];

function emit(value) { writeFileSync(1, `${JSON.stringify(value, null, 2)}\n`); }
function fail(reason) {
  emit({ schema_version: POST_FINAL_RECOVERY_SCHEMA_VERSION, operation: operation || null, error: 'invalid_invocation', reason });
  process.exit(2);
}

if (!['inspect', 'apply', 'recover'].includes(operation)) fail('operation must be inspect, apply or recover');

let values;
try {
  ({ values } = parseArgs({
    args: raw.slice(1),
    options: { bundle: { type: 'string' }, input: { type: 'string' }, 'operation-id': { type: 'string' } },
    strict: true,
  }));
} catch (error) {
  fail(error.message);
}

if (!values.bundle) fail('--bundle is required');

try {
  let result;
  if (operation === 'inspect') {
    if (values.input || values['operation-id']) fail('inspect accepts only --bundle');
    result = inspectPostFinalRecovery({ bundlePath: values.bundle });
  } else if (operation === 'apply') {
    if (!values.input || values['operation-id']) fail('apply requires --input only');
    let request;
    try {
      request = JSON.parse(readFileSync(values.input, 'utf8'));
    } catch (parseError) {
      fail(`--input is not valid JSON: ${parseError.message}`);
    }
    result = applyPostFinalRecovery({ bundlePath: values.bundle, input: request });
  } else {
    if (!values['operation-id'] || values.input) fail('recover requires --operation-id only');
    result = recoverPostFinalRecovery({ bundlePath: values.bundle, operationId: values['operation-id'] });
  }
  if (operation !== 'inspect') logToRun(values.bundle, ['blocked', 'recover_required'].includes(result.verdict) ? 'warn' : 'info', `post_final_recovery_${operation}`, { verdict: result.verdict, reason_code: result.reason_code, operation_id: result.operation_id, stage: result.stage });
  emit(result);
  process.exit(['blocked', 'recover_required'].includes(result.verdict) ? 1 : 0);
} catch (error) {
  if (error?.name === 'ZodError') {
    emit({
      schema_version: POST_FINAL_RECOVERY_SCHEMA_VERSION,
      operation,
      error: 'invalid_configuration',
      reason: error.message,
    });
    process.exit(2);
  }
  emit({
    schema_version: POST_FINAL_RECOVERY_SCHEMA_VERSION,
    operation,
    verdict: 'blocked',
    reason_code: 'operation_failed',
    reason: error?.message ?? String(error),
    warnings: [],
    facts: null,
    operation_id: null,
    workspace: null,
    stage: null,
    next_action: null,
  });
  process.exit(1);
}
