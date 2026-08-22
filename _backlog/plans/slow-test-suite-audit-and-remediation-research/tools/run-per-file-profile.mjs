// Per-file serial profile driver: runs every canonically discovered
// tests/**/*.test.mjs file once, serially, capturing per-file wall time, TAP
// leaf timings, and (via the preload hook) child-process / fs-copy counts.
//
//   node tools/run-per-file-profile.mjs
//
// Outputs:
//   /tmp/per-file-profile.json   per-file {file, wall_ms, leaves, total_ms, slow, top}
//   /tmp/dsh-instr.log           append-only instrument lines (consumed by collect-instr.mjs)
//
// Runtime ~15-18 min. Machine should otherwise be quiet for clean timings.
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTap } from './parse-tap.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../../');
const preload = path.join(here, 'count-preload.mjs');
const instrOut = process.env.INSTR_OUT || '/tmp/dsh-instr.log';

// Same selection as package.json's test script: find tests/ -name '*.test.mjs'
const files = execFileSync('find', ['tests/', '-name', '*.test.mjs'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean);

const results = [];
for (const [i, file] of files.entries()) {
  const t0 = performance.now();
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', file], {
    cwd: repoRoot,
    env: { ...process.env, NODE_OPTIONS: `--import=${preload}`, INSTR_OUT: instrOut },
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    // Generous per-file cap so one pathological file cannot stall the whole
    // profile; the plan's canonical command itself has no per-file timeout.
    timeout: 300000,
  });
  const wallMs = Math.round(performance.now() - t0);
  const prof = parseTap(r.stdout || '', { fileOverride: file });
  const rec = prof.files[0] ?? { leaves: 0, total_ms: 0, slow: [], top: [] };
  results.push({
    file,
    wall_ms: wallMs,
    leaves: rec.leaves,
    total_ms: rec.total_ms,
    slow: rec.slow,
    top: rec.top,
    exit: r.status,
  });
  if ((i + 1) % 25 === 0) console.error(`progress ${i + 1}/${files.length} (${file})`);
}
writeFileSync('/tmp/per-file-profile.json', JSON.stringify({ files: results }, null, 2) + '\n');
const totalWall = results.reduce((s, r) => s + r.wall_ms, 0);
console.error(`done: ${results.length} files, sum of per-file wall = ${(totalWall / 1000).toFixed(1)}s`);
