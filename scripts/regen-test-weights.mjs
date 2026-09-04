#!/usr/bin/env node
// Regenerates scripts/test-weights.json: per-file wall seconds measured at
// 8-way parallelism — the same contention-inflated methodology as the
// 2026-09-04 profiling pass, so only the relative order is meaningful.
// Consumed as a performance projection (never a correctness input) by
// scripts/run-tests.mjs (`lptOrder`, currently unused after the R1 ruling)
// and by heavy-file triage for the spawn-cost reduction change.
//
// Usage: node scripts/regen-test-weights.mjs   (runs ~4-8 min on this suite)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { discoverTestFiles } from './test-shard.mjs';

const files = discoverTestFiles('tests', 'tests');
const weights = {};
let next = 0;
let done = 0;

function worker() {
  if (next >= files.length) return;
  const f = files[next++];
  const t0 = performance.now();
  const child = spawn(process.execPath, [f], { stdio: 'ignore' });
  child.on('exit', () => {
    weights[f] = Number(((performance.now() - t0) / 1000).toFixed(3));
    done++;
    if (done % 50 === 0) console.error(`  ${done}/${files.length}`);
    worker();
  });
}

const allDone = new Promise((resolve) => {
  const check = setInterval(() => {
    if (done >= files.length) { clearInterval(check); resolve(); }
  }, 100);
});

for (let i = 0; i < availableParallelism(); i++) worker();
await allDone;

const sorted = Object.fromEntries(
  Object.entries(weights).sort((a, b) => b[1] - a[1]),
);
const outPath = join(process.cwd(), 'scripts', 'test-weights.json');
writeFileSync(outPath, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`wrote ${Object.keys(sorted).length} entries -> ${outPath}`);
console.log(`heaviest: ${Object.keys(sorted).slice(0, 3).join(', ')}`);
