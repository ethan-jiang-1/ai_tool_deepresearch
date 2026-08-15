#!/usr/bin/env node
// @impl CDG-002, CDG-004
import { writeFileSync } from 'node:fs';
import {
  invocationError,
  parseOperationInvocation,
  validateBundleDirectory,
  validateReadableRegularFile,
  validateWorkflowPhaseReference,
} from '../engine/helpers/cli-operation-contract.mjs';
import {
  migrateLegacyCompositionHandoff,
  restoreCompositionHandoff,
} from '../engine/helpers/composition-handoff-operation.mjs';

const command = 'node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs';
const usage = [
  'Usage:',
  `  ${command} restore --bundle <bundle-path> --current-node phases/phase-readiness.md`,
  `  ${command} migrate-legacy --bundle <bundle-path> --current-node phases/phase-readiness.md --input <projection.yaml>`,
].join('\n');

function emit(value) {
  writeFileSync(1, `${JSON.stringify(value)}\n`);
}

function fail(operation, reason, extra = {}) {
  emit({ ...invocationError({ command: 'operate-composition-handoff', operation, reason, usage }), ...extra });
  process.exit(2);
}

const invocation = parseOperationInvocation(process.argv.slice(2), {
  usage,
  forms: [
    {
      id: 'restore',
      positionals: ['restore'],
      options: {
        bundle: { required: true },
        'current-node': { required: true },
      },
    },
    {
      id: 'migrate-legacy',
      positionals: ['migrate-legacy'],
      options: {
        bundle: { required: true },
        'current-node': { required: true },
        input: { required: true },
      },
    },
  ],
});

if (invocation.kind === 'help') {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}
if (invocation.kind === 'invalid') fail(null, invocation.reason);

const bundle = validateBundleDirectory(invocation.values.bundle);
if (!bundle.ok) fail(invocation.form.id, bundle.reason, { coordinate: bundle.coordinate });
const currentNode = validateWorkflowPhaseReference(invocation.values['current-node']);
if (!currentNode.ok) fail(invocation.form.id, currentNode.reason, { coordinate: currentNode.coordinate });

if (invocation.form.id === 'migrate-legacy') {
  const input = validateReadableRegularFile(invocation.values.input, '<projection.yaml>');
  if (!input.ok) fail('migrate-legacy', input.reason, { coordinate: input.coordinate });
  const result = migrateLegacyCompositionHandoff({
    bundlePath: bundle.path,
    inputPath: input.path,
    currentNode: currentNode.value,
  });
  emit(result);
  process.exit(result.verdict === 'migrated' ? 0 : 1);
}

const result = restoreCompositionHandoff({ bundlePath: bundle.path, currentNode: currentNode.value });
emit(result);
process.exit(['restored', 'unchanged'].includes(result.verdict) ? 0 : 1);
