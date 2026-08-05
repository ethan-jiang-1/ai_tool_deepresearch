import { basename } from 'node:path';

export function normalizeBundleBasename(dirName) {
  const value = String(dirName || '');
  const production = value.match(/^dpt_rb_(.+)$/);
  if (production) return production[1];
  const disposable = value.match(/^dpt_disp_(.+)_[0-9a-f]+$/);
  if (disposable) return disposable[1].replace(/^case-\d+_/, '');
  return null;
}

export function normalizedBundleBasenameFromPath(bundlePath) {
  return normalizeBundleBasename(basename(bundlePath));
}
