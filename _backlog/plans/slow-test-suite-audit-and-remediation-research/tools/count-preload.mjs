// Instrumentation preload: counts child_process launches and fs copy calls
// per test-file process. Load via NODE_OPTIONS so it applies to the `node
// --test` children spawned by the canonical command.
//
//   NODE_OPTIONS="--import=$PWD/.../count-preload.mjs" INSTR_OUT=/tmp/dsh-instr.log npm test -- --test-concurrency=1
//
// Only processes whose argv[1] ends with `.test.mjs` emit a line, so
// production CLI children (argv[1] = DEEP_RESEARCH_HARNESS/... ) are ignored
// and the counts attribute to the test file that launched them.
//
// IMPORTANT: this module must never ESM-import from 'node:fs' or
// 'node:child_process'. Node snapshots builtin ESM named exports at the FIRST
// ESM import of that builtin; a snapshot taken before patching would hide the
// patch from every later module. Always access builtins via createRequire.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cp = require('node:child_process');
const fs = require('node:fs');

const isTestProc = typeof process.argv[1] === 'string' && process.argv[1].endsWith('.test.mjs');
const out = process.env.INSTR_OUT || '/tmp/dsh-instr.log';
const counts = { spawn: 0, spawnSync: 0, exec: 0, execSync: 0, execFile: 0, execFileSync: 0, fork: 0, copyCalls: 0, copyBytes: 0 };

function wrap(target, key, bump) {
  const orig = target[key];
  if (typeof orig !== 'function') return;
  target[key] = function (...a) {
    const r = orig.apply(target, a);
    // Count after the original runs so byte stats see the created file.
    if (isTestProc) bump(...a);
    return r;
  };
}

for (const k of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
  wrap(cp, k, () => { counts[k] += 1; });
}

function countCopy(dest) {
  counts.copyCalls += 1;
  try { counts.copyBytes += fs.statSync(dest).size; } catch {}
}
wrap(fs, 'copyFileSync', (src, dest) => countCopy(dest));
wrap(fs, 'copyFile', (src, dest) => countCopy(dest));
wrap(fs, 'cpSync', (src, dest) => countCopy(dest));
wrap(fs, 'cp', (src, dest) => countCopy(dest));

process.on('exit', () => {
  if (!isTestProc) return;
  try {
    fs.appendFileSync(out, JSON.stringify({ file: process.argv[1], pid: process.pid, ...counts }) + '\n');
  } catch {}
});
