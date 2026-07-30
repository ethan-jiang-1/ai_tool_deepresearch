#!/usr/bin/env node
// @impl PHS-007, CLE-001

import { readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';

import {
  renderNoControls,
  renderSuppliedControls,
} from '../engine/helpers/plan-hostfile-sections.mjs';
import {
  invocationError,
  parseOperationInvocation,
  validateReadableRegularFile,
} from '../engine/helpers/cli-operation-contract.mjs';

const command = 'node DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs';
const usage = [
  'Usage:',
  `  ${command} render-no-controls`,
  `  ${command} render-supplied-controls --input <snapshot-path>`,
].join('\n');

const invocation = parseOperationInvocation(process.argv.slice(2), {
  usage,
  forms: [
    { id: 'render-no-controls', positionals: ['render-no-controls'], options: {} },
    { id: 'render-supplied-controls', positionals: ['render-supplied-controls'], options: { input: { required: true } } },
  ],
});

function fail(reason, operation = null, extra = {}) {
  process.stdout.write(`${JSON.stringify({
    ...invocationError({ command: 'plan-hostfile-sections', operation, reason, usage }),
    ...extra,
  }, null, 2)}\n`);
  process.exit(2);
}

if (invocation.kind === 'help') {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}
if (invocation.kind === 'invalid') fail(invocation.reason);

if (invocation.form.id === 'render-no-controls') {
  process.stdout.write(`${renderNoControls()}\n`);
  process.exit(0);
}

const input = validateReadableRegularFile(invocation.values.input, '<snapshot-path>');
if (!input.ok) fail(input.reason, invocation.form.id, { coordinate: input.coordinate });

let snapshot;
try {
  snapshot = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(input.path));
} catch {
  fail('snapshot input must be valid UTF-8', invocation.form.id, { coordinate: '<snapshot-path>' });
}
process.stdout.write(`${renderSuppliedControls(snapshot)}\n`);
