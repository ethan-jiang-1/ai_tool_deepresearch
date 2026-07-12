import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

export function snapshotTree(root) {
  const snapshot = new Map();
  function walk(current) {
    if (!existsSync(current)) return;
    const info = lstatSync(current);
    const key = relative(root, current).replaceAll('\\', '/') || '.';
    if (info.isSymbolicLink()) { snapshot.set(key, 'symlink'); return; }
    if (info.isDirectory()) {
      snapshot.set(`${key}/`, 'directory');
      for (const name of readdirSync(current).sort()) walk(join(current, name));
      return;
    }
    snapshot.set(key, createHash('sha256').update(readFileSync(current)).digest('hex'));
  }
  walk(root);
  return snapshot;
}

export function diffSnapshots(before, after) {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((key) => before.get(key) !== after.get(key)).sort();
}
