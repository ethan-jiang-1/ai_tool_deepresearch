import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

export const REPO_ROOT = process.cwd();
const INSTANTIATE = join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'instantiate-run-bundle.mjs');

export function runNode(args, { expectedStatus = 0, timeout = 30000 } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== expectedStatus) {
    throw new Error(`node ${args.join(' ')} exited ${result.status}, expected ${expectedStatus}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return result;
}

export function parseJsonOutput(result) {
  const raw = String(result.stdout || '').trim();
  try { return JSON.parse(raw); } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error(`command did not emit JSON: ${raw}\nstderr=${result.stderr}`);
  }
}

export function createTempRoot() {
  return mkdtempSync(join(tmpdir(), 'dpt-deterministic-e2e-'));
}

export function instantiateBundle(root, label) {
  const name = `det-e2e-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const result = runNode([INSTANTIATE, name, '--target-dir', root], { timeout: 30000 });
  const bundle = result.stdout.trim();
  if (!bundle.startsWith(root) || basename(bundle) !== `dpt_rb_${name}`) throw new Error(`unexpected instantiated bundle path: ${bundle}`);
  return bundle;
}

export function snapshotBundle(source, root) {
  const snapshot = join(root, '.baseline-snapshot');
  cpSync(source, snapshot, { recursive: true, errorOnExist: true });
  return snapshot;
}

export function restoreBundle(snapshot, target) {
  rmSync(target, { recursive: true, force: true });
  cpSync(snapshot, target, { recursive: true, errorOnExist: true });
  return target;
}

export function runGate(bundle, gate, currentNode, { expectedStatus = 0 } = {}) {
  const result = runNode([
    join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'gates', `check-gate-${gate}.mjs`),
    '--bundle', bundle,
    '--current-node', currentNode,
  ], { expectedStatus });
  return { process: result, output: parseJsonOutput(result) };
}

export function enterPhase(bundle, node, { expectedStatus = 0 } = {}) {
  return runNode([join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'enter-phase.mjs'), '--bundle', bundle, '--node', node], { expectedStatus });
}

export function advanceStatus(bundle, gate, { expectedStatus = 0 } = {}) {
  const result = runNode([join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'advance-status.mjs'), '--bundle', bundle, '--to', gate], { expectedStatus });
  return { process: result, output: parseJsonOutput(result) };
}

export function readStatus(bundle) {
  return JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
}

export function readTrace(bundle) {
  const raw = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim();
  return raw ? raw.split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
}

export function authoritySnapshot(bundle) {
  const included = ['rb_status.json', 'rb_queue.json', 'rb_output_declarations.jsonl', 'rb_trace.jsonl', '_work_units'];
  const output = {};
  function visit(path, key) {
    if (!existsSync(path)) { output[key] = null; return; }
    if (!statSync(path).isDirectory()) { output[key] = readFileSync(path).toString('base64'); return; }
    for (const name of readdirSync(path).sort()) visit(join(path, name), join(key, name));
  }
  for (const name of included) visit(join(bundle, name), name);
  return output;
}

export function cleanupRoot(root) {
  if (root && relative(tmpdir(), root) && root.startsWith(tmpdir())) rmSync(root, { recursive: true, force: true });
}
