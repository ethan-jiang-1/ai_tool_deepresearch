#!/usr/bin/env node
// check-all.mjs — aggregated read-only governance health entry (RET-007).
// Runs every check-*.mjs in this directory, one line per check, aggregate exit code.
// Without --change: runs the no-per-change checks; the change-requiring checks
// (check-capability-discovery, check-semantic-closure, check-verification-routing)
// are reported as SKIPPED. With --change <name>: those three run in plan mode
// with the change forwarded. Strictly read-only: no archive transition, no
// repair, no target edits; it never runs the finalizer.
// Usage: node openspec/governance/check-all.mjs [--change <name>]

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-all.mjs [--change <name>]');
  process.exit(2);
}

let change = null;
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--change') {
    if (i + 1 >= process.argv.length) usage('--change requires a value');
    change = process.argv[++i];
  } else {
    usage(`Unknown argument: ${process.argv[i]}`);
  }
}

const CHANGE_REQUIRING = new Map([
  ['check-capability-discovery.mjs', ['--change', '<CHANGE>']],
  ['check-semantic-closure.mjs', ['--change', '<CHANGE>', '--mode', 'plan']],
  ['check-verification-routing.mjs', ['--change', '<CHANGE>', '--mode', 'plan']],
]);

const scripts = readdirSync(HERE)
  .filter((name) => name.startsWith('check-') && name.endsWith('.mjs') && name !== 'check-all.mjs')
  .sort();

let failed = false;
for (const script of scripts) {
  let args = [ROOT];
  let label = 'PASS';
  if (CHANGE_REQUIRING.has(script)) {
    if (!change) {
      console.log(`SKIPPED(requires --change) ${script}`);
      continue;
    }
    args = CHANGE_REQUIRING.get(script).map((a) => (a === '<CHANGE>' ? change : a));
  }
  const result = spawnSync(process.execPath, [join(HERE, script), ...args], {
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.error || result.status === null || result.status !== 0) {
    label = 'FAIL';
    failed = true;
  }
  const tail = (result.stdout || '').trim().split('\n').pop() || '';
  const errTail = (result.stderr || '').trim().split('\n').pop() || '';
  console.log(`${label} ${script}${tail ? ` — ${tail}` : ''}${errTail ? ` — ${errTail}` : ''}`);
}

process.exit(failed ? 1 : 0);
