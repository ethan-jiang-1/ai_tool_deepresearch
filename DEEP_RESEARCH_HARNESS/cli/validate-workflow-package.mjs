#!/usr/bin/env node
// validate-workflow-package.mjs — Workflow package consistency validation CLI
// @impl WNC-007
// Usage: node validate-workflow-package.mjs [--workflows-dir <path>] [--gate-defs-dir <path>]
//                                         [--transitions-chain <path>]
//
// Exit codes:
//   0 — package is consistent (all checks pass)
//   1 — consistency issues found
//   2 — invocation error (missing required context, unreadable files, unknown flags)

import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { validateWorkflowPackage } from '../engine/consistency-validator.mjs';

function invocationError(message) {
  console.error(`invocation error: ${message}`);
  console.error(
    'Usage: node validate-workflow-package.mjs [--workflows-dir <path>] [--gate-defs-dir <path>] [--transitions-chain <path>]',
  );
  process.exit(2);
}

let values;
try {
  values = parseArgs({
    options: {
      'workflows-dir': { type: 'string' },
      'gate-defs-dir': { type: 'string' },
      'transitions-chain': { type: 'string' },
    },
  }).values;
} catch (error) {
  invocationError(error.message);
}

for (const [flag, label] of [
  ['workflows-dir', 'workflows directory'],
  ['gate-defs-dir', 'gate definitions directory'],
  ['transitions-chain', 'transitions chain file'],
]) {
  const path = values[flag];
  if (path !== undefined && !existsSync(path)) {
    invocationError(`${label} not found or unreadable: ${path}`);
  }
}

const report = validateWorkflowPackage({
  workflowsDir: values['workflows-dir'],
  gateDefsDir: values['gate-defs-dir'],
  transitionsChainPath: values['transitions-chain'],
});

// Machine-readable report
console.log(JSON.stringify(report, null, 2));

if (report.passed) {
  process.exit(0);
} else {
  console.error(`\n${report.issues.length} consistency issue(s) found.`);
  process.exit(1);
}
