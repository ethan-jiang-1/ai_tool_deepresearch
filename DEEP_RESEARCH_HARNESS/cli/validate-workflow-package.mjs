#!/usr/bin/env node
// validate-workflow-package.mjs — Workflow package consistency validation CLI
// @impl WNC-007
// Usage: node validate-workflow-package.mjs [--workflows-dir <path>] [--gate-defs-dir <path>]
//                                         [--transitions-chain <path>]
//
// Exit codes:
//   0 — package is consistent (all checks pass)
//   1 — consistency issues found
//   2 — invocation error (missing required context, unreadable files)

import { parseArgs } from 'node:util';
import { validateWorkflowPackage } from '../engine/consistency-validator.mjs';

const { values } = parseArgs({
  options: {
    'workflows-dir': { type: 'string' },
    'gate-defs-dir': { type: 'string' },
    'transitions-chain': { type: 'string' },
  },
});

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
