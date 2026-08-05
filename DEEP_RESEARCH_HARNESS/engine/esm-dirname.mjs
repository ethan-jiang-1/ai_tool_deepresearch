import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/**
 * ESM equivalent of CommonJS `__dirname`.
 *
 * In CommonJS Node.js provides `__dirname` as a global. In ES modules (`.mjs`)
 * it is NOT available — you must derive it from `import.meta.url`.
 *
 * Usage (one import + one call, replaces the old 3-line boilerplate):
 *   import { esmDirname } from '../DEEP_RESEARCH_HARNESS/engine/esm-dirname.mjs';
 *   const __dirname = esmDirname(import.meta.url);
 *
 * Do NOT hand-roll `fileURLToPath` + `dirname` in individual scripts.
 * Import this instead.
 *
 * Note: Node 21.2+ provides `import.meta.dirname` natively. Once the project
 * baseline reaches Node ≥22 LTS, this module can be deprecated in favor of it.
 */
export function esmDirname(metaUrl) {
  return dirname(fileURLToPath(metaUrl));
}
