#!/usr/bin/env node
// @impl CTS-003, CTS-004

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { applyCanonicalTopicState, inspectCanonicalTopicState, recoverCanonicalTopicState, TOPIC_STATE_SCHEMA_VERSION } from '../engine/helpers/canonical-topic-state.mjs';

const raw = process.argv.slice(2); const operation = raw[0];
function emit(value) { writeFileSync(1, `${JSON.stringify(value, null, 2)}\n`); }
function fail(reason) { emit({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: operation || null, error: 'invalid_invocation', reason }); process.exit(2); }
if (!['inspect', 'apply', 'recover'].includes(operation)) fail('operation must be inspect, apply or recover');
let values;
try { ({ values } = parseArgs({ args: raw.slice(1), options: { bundle: { type: 'string' }, input: { type: 'string' }, 'operation-id': { type: 'string' } }, strict: true })); } catch (error) { fail(error.message); }
if (!values.bundle) fail('--bundle is required');
try {
  let result;
  if (operation === 'inspect') { if (values.input || values['operation-id']) fail('inspect accepts only --bundle'); result = inspectCanonicalTopicState({ bundlePath: values.bundle }); }
  else if (operation === 'apply') { if (!values.input || values['operation-id']) fail('apply requires --input only'); result = applyCanonicalTopicState({ bundlePath: values.bundle, input: JSON.parse(readFileSync(values.input, 'utf8')) }); }
  else { if (!values['operation-id'] || values.input) fail('recover requires --operation-id only'); result = recoverCanonicalTopicState({ bundlePath: values.bundle, operationId: values['operation-id'] }); }
  emit(result); process.exit(result.verdict === 'blocked' || result.passed === false ? 1 : 0);
} catch (error) { emit({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation, error: 'operation_failed', reason: error.message }); process.exit(2); }
