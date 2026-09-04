#!/usr/bin/env node
// Deterministic regression-suite sharding.
//
// `node scripts/test-shard.mjs <n> <m>` discovers every `tests/**/*.test.mjs`
// (skipping symlinks and `.test-*` disposable output dirs, mirroring the
// canonical `npm test` find), sorts the list, assigns files to shards by
// `index % n === m`, and runs `node --test` over shard m (1-based) with
// inherited stdio. Each shard of a full `n`-way split is independent, so
// running all n shards in parallel yields wall time ~= full parallel / n.
//
// The pure partition function is exported for unit testing.
// discoverTestFiles is exported so `npm test` (scripts/run-tests.mjs) and the
// shard runner share one file-discovery source of record.
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function loadWeights(weightsPath) {
  if (!existsSync(weightsPath)) return {};
  return JSON.parse(readFileSync(weightsPath, 'utf8'));
}

export function shardFiles(files, n, m, weights = {}) {
  const shardCount = Number(n);
  const shardIndex = Number(m);
  if (!Number.isInteger(shardCount) || shardCount < 1) return [];
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= shardCount) return [];
  if (!Array.isArray(files) || files.length === 0) return [];

  // Pair files with original index and weight
  const items = files.map((f, i) => {
    const rawWeight = weights && Object.prototype.hasOwnProperty.call(weights, f) ? weights[f] : undefined;
    const w = typeof rawWeight === 'number' && Number.isFinite(rawWeight) && rawWeight >= 0 ? rawWeight : 0;
    return { file: f, index: i, weight: w };
  });

  // Sort descending by weight, breaking ties by original index to ensure determinism and stability
  items.sort((a, b) => (b.weight - a.weight) || (a.index - b.index));

  // Initialize shards
  const shards = Array.from({ length: shardCount }, () => []);
  const shardWeights = new Array(shardCount).fill(0);

  // Greedy LPT assignment: assign each file to the shard with the lowest cumulative weight
  for (const item of items) {
    let minShard = 0;
    for (let s = 1; s < shardCount; s++) {
      if (
        shardWeights[s] < shardWeights[minShard] ||
        (shardWeights[s] === shardWeights[minShard] && shards[s].length < shards[minShard].length)
      ) {
        minShard = s;
      }
    }
    shards[minShard].push(item.file);
    shardWeights[minShard] += item.weight;
  }

  return shards[shardIndex];
}

export function discoverTestFiles(baseDir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(baseDir)) {
    if (entry.startsWith('.test-')) continue; // disposable output dirs
    const full = join(baseDir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    const st = lstatSync(full);
    if (st.isSymbolicLink()) continue; // find does not follow symlinked dirs
    if (st.isDirectory()) out.push(...discoverTestFiles(full, rel));
    else if (entry.endsWith('.test.mjs')) out.push(rel);
  }
  return out;
}

function main() {
  const n = Number(process.argv[2]);
  const m1 = Number(process.argv[3]); // 1-based user input
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(m1) || m1 < 1 || m1 > n) {
    console.error('usage: node scripts/test-shard.mjs <n> <m>   (1 <= m <= n)');
    process.exit(2);
  }
  const files = discoverTestFiles('tests', 'tests').sort();
  const weightsPath = join(process.cwd(), 'scripts', 'test-weights.json');
  const weights = loadWeights(weightsPath);
  const shard = shardFiles(files, n, m1 - 1, weights);
  if (shard.length === 0) {
    console.error(`shard ${m1}/${n}: no files assigned (files=${files.length})`);
    process.exit(2);
  }
  const result = spawnSync(process.execPath, ['--test', ...shard], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();
