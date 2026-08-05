#!/usr/bin/env node
// audit-phase-status.mjs — diagnostic-only phase/status drift audit
// @impl CPT-006, CDP-005
// Usage: node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <path>
//
// Exit codes:
//   0 — audit passed or explicit bootstrap exception
//   1 — drift/violation diagnosed
//   2 — invocation error

import { parseArgs } from 'node:util';
import { auditPhaseStatus } from '../engine/helpers/phase-status-audit.mjs';

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
  },
});

if (!values.bundle) {
  console.log(JSON.stringify({
    ok: false,
    outcome: 'missing_witness',
    inspect: ['Missing required --bundle <path>'],
    advice: ['Usage: node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <path>'],
    diagnostic_only: true,
  }, null, 2));
  process.exit(2);
}

const result = auditPhaseStatus(values.bundle);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
