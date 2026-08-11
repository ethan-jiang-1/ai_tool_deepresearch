#!/usr/bin/env node
// @impl CTS-003, CTS-004, CLE-001

import { readFileSync } from 'node:fs';

import {
  applyCanonicalTopicState,
  describeTopicApplyPlanSchema,
  inspectCanonicalTopicState,
  recoverCanonicalTopicState,
  TOPIC_STATE_SCHEMA_VERSION,
} from '../engine/helpers/canonical-topic-state.mjs';
import {
  invocationError,
  parseOperationInvocation,
  validateBundleDirectory,
  validateReadableRegularFile,
} from '../engine/helpers/cli-operation-contract.mjs';

const command = 'node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs';
const usage = [
  'Usage:',
  `  ${command} inspect --bundle <bundle-path>`,
  `  ${command} schema --context <context>`,
  `  ${command} apply --bundle <bundle-path> --input <input-path>`,
  `  ${command} recover --bundle <bundle-path> --operation-id <operation-id>`,
].join('\n');

const invocation = parseOperationInvocation(process.argv.slice(2), {
  usage,
  forms: [
    { id: 'inspect', positionals: ['inspect'], options: { bundle: { required: true } } },
    { id: 'schema', positionals: ['schema'], options: { context: { required: true } } },
    { id: 'apply', positionals: ['apply'], options: { bundle: { required: true }, input: { required: true } } },
    { id: 'recover', positionals: ['recover'], options: { bundle: { required: true }, 'operation-id': { required: true } } },
  ],
});

function emit(value) {
  return new Promise((resolve, reject) => {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function fail(reason, operation = null, extra = {}) {
  await emit({
    schema_version: TOPIC_STATE_SCHEMA_VERSION,
    ...invocationError({ command: 'operate-topic-state', operation, reason, usage }),
    ...extra,
  });
  process.exit(2);
}

if (invocation.kind === 'help') {
  await new Promise((resolve, reject) => {
    process.stdout.write(`${usage}\n`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  process.exit(0);
}
if (invocation.kind === 'invalid') await fail(invocation.reason);

const operation = invocation.form.id;
const values = invocation.values;

if (operation === 'schema') {
  const projection = describeTopicApplyPlanSchema(values.context);
  if (!projection.ok) {
    await fail(projection.reason, operation, {
      reason_code: projection.reason_code,
      ...(projection.supported_contexts ? { supported_contexts: projection.supported_contexts } : {}),
    });
  }
  await emit(projection);
  process.exit(0);
}

if (operation === 'recover' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(values['operation-id'])) {
  await fail('operation-id must be one topic-state workspace UUID', operation, { coordinate: '<operation-id>' });
}

const bundle = validateBundleDirectory(values.bundle);
if (!bundle.ok) await fail(bundle.reason, operation, { coordinate: bundle.coordinate });

let input = null;
if (operation === 'apply') {
  const inputFile = validateReadableRegularFile(values.input, '<input-path>');
  if (!inputFile.ok) await fail(inputFile.reason, operation, { coordinate: inputFile.coordinate });
  try {
    input = JSON.parse(readFileSync(inputFile.path, 'utf8'));
  } catch {
    await fail('input must contain valid JSON', operation, { coordinate: '<input-path>' });
  }
}

try {
  let result;
  if (operation === 'inspect') result = inspectCanonicalTopicState({ bundlePath: bundle.path });
  else if (operation === 'apply') result = applyCanonicalTopicState({ bundlePath: bundle.path, input });
  else result = recoverCanonicalTopicState({ bundlePath: bundle.path, operationId: values['operation-id'] });
  await emit(result);
  process.exit(result.verdict === 'blocked' || result.passed === false ? 1 : 0);
} catch (error) {
  await emit({
    schema_version: TOPIC_STATE_SCHEMA_VERSION,
    operation,
    error: 'operation_failed',
    reason: error.message,
  });
  process.exit(2);
}
