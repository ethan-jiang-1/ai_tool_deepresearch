import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { existsSync } from "node:fs";

const DEFAULT_SKIP_DIRS = new Set([
  ".cache",
  ".git",
  ".next",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

export function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

export function exists(filePath) {
  return existsSync(filePath);
}

export function isDirectory(filePath) {
  try {
    return lstatSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

export function isFile(filePath) {
  try {
    return lstatSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function walkFiles(root, predicate = () => true, options = {}) {
  if (!exists(root)) {
    return [];
  }
  const skipDirs = new Set([...DEFAULT_SKIP_DIRS, ...(options.skipDirs ?? [])]);
  const skipDirPrefixes = options.skipDirPrefixes ?? [];
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name) || skipDirPrefixes.some((prefix) => entry.name.startsWith(prefix))) {
          continue;
        }
        stack.push(fullPath);
      } else if (entry.isFile() && predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  return files.sort();
}

export function relPosix(root, filePath) {
  return relative(root, filePath).split(/[\\/]/).join("/");
}

export function resolveMaybeRelative(root, value) {
  const cleaned = String(value ?? "").trim().replace(/^`|`$/g, "");
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) {
    return null;
  }
  return resolve(root, cleaned);
}
