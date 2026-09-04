#!/usr/bin/env node
// Full-suite regression entry (`npm test`): orchestrates `node --test` over
// every discovered test file at machine parallelism with a shared V8 compile
// cache.
//
// Verdict authority stays with node --test: this wrapper inherits stdio and
// propagates the child exit code verbatim. It parses no test output and makes
// no pass/fail judgment. `scripts/test-weights.json` is a performance
// projection (per-file wall seconds from scripts/regen-test-weights.mjs).
//
// Scheduling note (R1 decision gate, probed 2026-09-04): `node --test` sorts
// file arguments lexicographically before scheduling (arg order f1..f10
// produced start order f1,f10,f2,f3,...), so CLI-arg LPT scheduling is not
// possible and `lptOrder` is intentionally NOT applied here. It stays
// exported for the unit contract and for a future shard-based scheduler.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { discoverTestFiles } from './test-shard.mjs';

export function loadWeights(weightsPath) {
  if (!existsSync(weightsPath)) return {}; // R5 degradation: discovery order
  return JSON.parse(readFileSync(weightsPath, 'utf8'));
}

// Longest-processing-time-first ordering: weighted files by descending
// weight (stable: ties keep discovery order), unweighted files appended in
// their original relative order. Never changes the file set, only the order.
export function lptOrder(files, weights) {
  const weighted = [];
  const unweighted = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (Object.prototype.hasOwnProperty.call(weights, f) && Number.isFinite(weights[f])) {
      weighted.push([f, i]);
    } else {
      unweighted.push(f);
    }
  }
  weighted.sort((a, b) => (weights[b[0]] - weights[a[0]]) || (a[1] - b[1]));
  return [...weighted.map((entry) => entry[0]), ...unweighted];
}

function main() {
  const repoRoot = process.cwd();
  const dryRun = process.argv.includes('--dry-run');
  // Pass-through: any other args are forwarded to `node --test` AFTER the
  // wrapper's own flags, so documented measurement modes keep working, e.g.
  // `npm test -- --test-concurrency=1 --test-reporter=tap` (serial per-file
  // timing baseline; the last --test-concurrency occurrence wins).
  const forwardArgs = process.argv.slice(2).filter((a) => a !== '--dry-run');
  const files = discoverTestFiles('tests', 'tests');
  // R1 fallback: no re-ordering — node --test sorts args lexicographically
  // (see header note), so discovery order is handed to the runner as-is.
  const ordered = files;

  if (dryRun) {
    console.log(`files: ${ordered.length}`);
    for (const f of ordered.slice(0, 5)) console.log(`  ${f}`);
    return;
  }

  const cacheDir = join(repoRoot, '.cache', 'v8-compile-cache', `node-${process.versions.node}`);
  const result = spawnSync(process.execPath, ['--test', `--test-concurrency=${availableParallelism()}`, ...ordered, ...forwardArgs], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, NODE_COMPILE_CACHE: cacheDir },
  });
  process.exit(result.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();
