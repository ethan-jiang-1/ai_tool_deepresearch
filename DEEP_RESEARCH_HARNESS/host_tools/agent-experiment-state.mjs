#!/usr/bin/env node
// @impl EXA-005, EXA-006, PLR-003
// Narrow cross-tool-call bundle role registry; not verdict or cleanup authority.

import { closeSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import {
  AgentExperimentBundleRegistrySchema,
  loadRunContext,
} from './lib/agent-experiment-contract.mjs';

function usage() {
  console.error('Usage: agent-experiment-state.mjs register-bundle --context <path> --role <role> --path <bundle>');
  console.error('       agent-experiment-state.mjs get-bundle --context <path> --role <role>');
  process.exit(2);
}

function parseArgs(argv) {
  const command = argv[0];
  const values = Object.create(null);
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith('--') || index + 1 >= argv.length) usage();
    const key = flag.slice(2);
    if (values[key] !== undefined) throw new Error(`duplicate --${key}`);
    values[key] = argv[++index];
  }
  return { command, values };
}

function syncDirectory(pathValue) {
  const fd = openSync(pathValue, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function readRegistry(pathValue, runId) {
  const stat = lstatSync(pathValue);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('bundle registry must be a non-symlink regular file');
  const registry = AgentExperimentBundleRegistrySchema.parse(JSON.parse(readFileSync(pathValue, 'utf8')));
  if (registry.run_id !== runId) throw new Error('bundle registry run_id mismatch');
  return registry;
}

function validateBundlePath(caseRoot, pathValue) {
  const absolute = resolve(pathValue);
  const rel = relative(caseRoot, absolute);
  if (!rel || rel.startsWith(`..${sep}`) || rel.includes(sep)) throw new Error('bundle must be a direct child of the case run root');
  if (!/^dpt_(?:disp|rb)_[A-Za-z0-9._-]+$/.test(basename(absolute))) throw new Error('bundle name must use dpt_disp_* or dpt_rb_*');
  const stat = lstatSync(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('bundle must be a non-symlink directory');
  const actual = realpathSync(absolute);
  if (dirname(actual) !== caseRoot) throw new Error('bundle realpath escapes the case run root');
  return actual;
}

function registerBundle(contextInfo, role, pathValue) {
  if (!contextInfo.context.policy.bundle_roles.includes(role)) throw new Error(`role is not allowed by V2 policy: ${role}`);
  const actualPath = validateBundlePath(contextInfo.caseRoot, pathValue);
  const stateDir = dirname(contextInfo.registryPath);
  const lockPath = join(stateDir, 'bundles.lock');
  let lockFd;
  try {
    lockFd = openSync(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('bundle registry is locked; concurrent or crashed writer requires case diagnosis');
    throw error;
  }

  try {
    const registry = readRegistry(contextInfo.registryPath, contextInfo.context.run_id);
    if (registry.bundles.some((entry) => entry.role === role)) throw new Error(`bundle role already registered: ${role}`);
    if (registry.bundles.some((entry) => entry.path === actualPath)) throw new Error(`bundle path already registered under another role: ${actualPath}`);
    const byRole = new Map([...registry.bundles, { role, path: actualPath }].map((entry) => [entry.role, entry]));
    const bundles = contextInfo.context.policy.bundle_roles.filter((allowed) => byRole.has(allowed)).map((allowed) => byRole.get(allowed));
    const next = AgentExperimentBundleRegistrySchema.parse({ ...registry, bundles });
    const tempPath = join(stateDir, `.bundles.${process.pid}.${Date.now()}.tmp`);
    try {
      const tempFd = openSync(tempPath, 'wx', 0o600);
      try {
        writeFileSync(tempFd, `${JSON.stringify(next, null, 2)}\n`);
        fsyncSync(tempFd);
      } finally { closeSync(tempFd); }
      renameSync(tempPath, contextInfo.registryPath);
    } catch (error) {
      try { unlinkSync(tempPath); } catch {}
      throw error;
    }
    syncDirectory(stateDir);
    return actualPath;
  } finally {
    closeSync(lockFd);
    unlinkSync(lockPath);
    syncDirectory(stateDir);
  }
}

function main() {
  const { command, values } = parseArgs(process.argv.slice(2));
  if (!['register-bundle', 'get-bundle'].includes(command) || !values.context || !values.role) usage();
  const allowed = command === 'register-bundle' ? new Set(['context', 'role', 'path']) : new Set(['context', 'role']);
  for (const key of Object.keys(values)) if (!allowed.has(key)) throw new Error(`unknown option --${key}`);
  if (command === 'register-bundle' && !values.path) usage();
  const contextInfo = loadRunContext(values.context);
  if (command === 'register-bundle') {
    console.log(registerBundle(contextInfo, values.role, values.path));
    return;
  }
  const registry = readRegistry(contextInfo.registryPath, contextInfo.context.run_id);
  const entry = registry.bundles.find((bundle) => bundle.role === values.role);
  if (!entry) throw new Error(`bundle role is not registered: ${values.role}`);
  console.log(entry.path);
}

try { main(); }
catch (error) {
  console.error(error.message);
  process.exit(1);
}
