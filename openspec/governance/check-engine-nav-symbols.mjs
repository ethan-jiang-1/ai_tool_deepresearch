#!/usr/bin/env node
// check-engine-nav-symbols.mjs — engine navigation-comment symbol guard.
// For every `.mjs` under DEEP_RESEARCH_HARNESS, symbols listed in a
// `// Navigation: public API — a, b, c` header comment must be declared in
// that same file (export/const/let/function/class). First ghost symbol fails
// closed with file:line:symbol. Result detail on stdout; exit code is the
// coarse signal. Not wired to any lifecycle gate beyond check-all naming.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || process.cwd());
const harness = join(root, 'DEEP_RESEARCH_HARNESS');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

const NAV_RE = /^\/\/\s*Navigation:\s*public API\s*[—:;-]\s*(.+)$/;
const DECL_RES = [
  /(?:^|[;}\s])export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm,
  /(?:^|[;}\s])export\s+const\s+([A-Za-z_$][\w$]*)/gm,
  /(?:^|[;}\s])export\s+class\s+([A-Za-z_$][\w$]*)/gm,
  /(?:^|[;}\s])export\s*\{\s*([^}]*)\s*\}\s*from/gm, // re-exports are not local declarations — ignore
  /(?:^|[;}\s])(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/gm,
  /(?:^|[;}\s])(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
  /(?:^|[;}\s])class\s+([A-Za-z_$][\w$]*)/gm,
];
// NOTE: re-export `export { x } from` and `export { x }` (aggregating imported
// names) are handled by counting any `export`/`import`/binding occurrence of
// the symbol below; ghost check = symbol never referenced outside the comment.

function declaredSymbols(filePath, text, navLineIndex) {
  const nonComment = text.split('\n').filter((_, i) => i !== navLineIndex);
  const joined = nonComment.join('\n');
  const decls = new Set();
  for (const re of DECL_RES) {
    for (const m of joined.matchAll(re)) if (m[1]) decls.add(m[1]);
  }
  // identifiers appearing in an export list or import specifier count as live
  for (const m of joined.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const name of m[1].split(',')) {
      const n = name.trim().split(/\s+as\s+/)[0];
      if (n) decls.add(n);
    }
  }
  // `export * from '<target>'`: symbols are provided by the target module.
  // Crawl up to two levels with a cycle guard.
  const STAR_RE = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
  const seen = new Set([filePath]);
  const queue = [];
  for (const m of joined.matchAll(STAR_RE)) queue.push(resolveModule(filePath, m[1]));
  for (const target of queue) {
    if (!target || seen.has(target)) continue;
    seen.add(target);
    let tt;
    try { tt = readFileSync(target, 'utf8'); } catch { continue; }
    for (const re of DECL_RES) {
      for (const m of tt.matchAll(re)) if (m[1]) decls.add(m[1]);
    }
    for (const m of tt.matchAll(/export\s*\{([^}]*)\}/g)) {
      for (const name of m[1].split(',')) {
        const n = name.trim().split(/\s+as\s+/)[0];
        if (n) decls.add(n);
      }
    }
    for (const m of tt.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
      const t2 = resolveModule(target, m[1]);
      if (t2 && !seen.has(t2)) queue.push(t2);
    }
  }
  return decls;
}

function resolveModule(fromFile, spec) {
  if (!spec.endsWith('.mjs')) return null;
  const base = join(dirname(fromFile), spec);
  if (existsSync(base)) return resolve(base);
  return null;
}

const failures = [];
let navFiles = 0;
for (const p of walk(harness)) {
  const text = readFileSync(p, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const m = line.match(NAV_RE);
    if (!m) return;
    navFiles++;
    const symbols = m[1]
      .split(/[,，;；]/)
      .map((s) => s.trim().replace(/^…+|…+$/g, '').trim())
      .filter(Boolean);
    const decls = declaredSymbols(p, text, i);
    for (const sym of symbols) {
      // strip inline annotations like (writes X) kept whole — only plain identifiers expected
      const name = sym.split(/\s*[（(].*$/)[0].trim();
      if (!name) continue;
      if (!decls.has(name) && !new RegExp(`\\b${name}\\b`).test(text.split('\n').filter((_, k) => k !== i).join('\n'))) {
        failures.push(`${relative(root, p)}:${i + 1} ghost navigation symbol: ${name}`);
      }
    }
  });
}

if (failures.length) {
  for (const f of failures) console.error('FAIL check-engine-nav-symbols —', f);
  process.exit(1);
}
console.log(`PASS check-engine-nav-symbols — ${navFiles} navigation comments scanned, 0 ghosts.`);
