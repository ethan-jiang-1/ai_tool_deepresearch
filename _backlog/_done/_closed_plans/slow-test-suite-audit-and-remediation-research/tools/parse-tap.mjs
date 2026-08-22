// Parse TAP output into a per-file profile + the >3s leaf inventory.
// Node >=20, no deps.
//
// CLI usage:
//   node tools/parse-tap.mjs <tap-file> [out.json] [--file-name NAME] [--collect-all]
//
// Library usage:
//   import { parseTap } from './parse-tap.mjs';
//   parseTap(tapText, { fileOverride: 'tests/.../x.test.mjs' })  // single-file run
//   parseTap(tapText, { collectAll: true })                      // suite-wide leaf inventory
//   parseTap(tapText)                                            // multi-file TAP with path subtests
//
// TAP shape (node --test --test-reporter=tap):
//   # Subtest: tests/integration/.../x.test.mjs     <- file scope, when present
//       # Subtest: <describe name>
//       ok 1 - <leaf name>
//         ---
//         duration_ms: 1234.5
//         type: 'test'
//         ...
//   # duration_ms 822455.123                        <- global wall (col 0)
//
// Only leaves with type: 'test' are counted (describe suites are excluded,
// matching the plan's "TAP parsed at type: test leaves").
//
// NOTE: node --test with explicit file args does NOT emit per-file path
// subtests in the tap reporter (top-level subtests are the files' own
// describe names). Use fileOverride per single-file run, or collectAll for a
// suite-wide inventory; a file-path subtest is only used when present AND it
// looks like a path (contains '/'), so describe names ending in '.mjs' cannot
// hijack attribution.
import { readFileSync, writeFileSync } from 'node:fs';

export function parseTap(text, opts = {}) {
  const { fileOverride = null, collectAll = false } = opts;
  const lines = String(text).split('\n');

  const files = new Map();
  let currentFile = null;
  let pendingLeaf = null;
  let yamlOpen = false;
  let yamlDuration = null;
  let yamlType = null;
  let globalWall = null;

  const subtestRe = /^\s*# Subtest: (.*)$/;
  const leafRe = /^\s*(not )?ok \d+ - (.*)$/;
  const yamlCloseRe = /^\s*\.\.\.\s*$/;
  const yamlOpenRe = /^\s*---\s*$/;
  const durRe = /^\s*duration_ms:\s*([\d.]+)/;
  const typeRe = /^\s*type:\s*'([^']+)'/;
  const globalDurRe = /^# duration_ms ([0-9.]+)/;

  const ensure = (f) => {
    if (!files.has(f)) files.set(f, { leaves: 0, totalMs: 0, slow: [], top: [] });
    return files.get(f);
  };

  for (const line of lines) {
    const gd = line.match(globalDurRe);
    if (gd) { globalWall = Number(gd[1]); continue; }

    const sm = line.match(subtestRe);
    if (sm) {
      const name = sm[1].trim();
      // Only treat names ending in .mjs as file boundaries when they look
      // like paths; a describe named "helper.mjs" must not hijack attribution.
      if (!fileOverride && !collectAll && name.endsWith('.mjs') && name.includes('/')) currentFile = name;
      continue;
    }

    const lm = line.match(leafRe);
    if (lm) { pendingLeaf = lm[2]; yamlOpen = false; yamlDuration = null; yamlType = null; continue; }

    if (yamlOpen) {
      const dr = line.match(durRe);
      if (dr) yamlDuration = Number(dr[1]);
      const tr = line.match(typeRe);
      if (tr) yamlType = tr[1];
      if (yamlCloseRe.test(line)) {
        const f = collectAll ? 'all' : (fileOverride ?? currentFile);
        if (f && yamlType === 'test' && pendingLeaf !== null && yamlDuration !== null) {
          const rec = ensure(f);
          rec.leaves += 1;
          rec.totalMs += yamlDuration;
          rec.top.push({ name: pendingLeaf, ms: yamlDuration });
          if (yamlDuration >= 3000) rec.slow.push({ name: pendingLeaf, ms: yamlDuration });
        }
        yamlOpen = false;
        pendingLeaf = null;
        yamlDuration = null;
        yamlType = null;
      }
      continue;
    }

    if (yamlOpenRe.test(line) && pendingLeaf !== null) yamlOpen = true;
  }

  const profile = { wall_ms: globalWall, files: [] };
  let slowTotal = 0;
  let slowCount = 0;
  for (const [file, rec] of files) {
    rec.top.sort((a, b) => b.ms - a.ms);
    rec.slow.sort((a, b) => b.ms - a.ms);
    slowTotal += rec.slow.reduce((s, x) => s + x.ms, 0);
    slowCount += rec.slow.length;
    profile.files.push({ file, leaves: rec.leaves, total_ms: Math.round(rec.totalMs), slow: rec.slow, top: rec.top.slice(0, 5) });
  }
  profile.files.sort((a, b) => b.total_ms - a.total_ms);
  profile.slow_total_ms = Math.round(slowTotal);
  profile.slow_count = slowCount;
  return profile;
}

function renderMarkdown(profile, tapPath) {
  const rows = profile.files
    .map((f) => `| \`${f.file}\` | ${f.leaves} | ${(f.total_ms / 1000).toFixed(3)}s | ${f.slow.length} |`)
    .join('\n');
  const slowRows = [];
  for (const f of profile.files) {
    for (const s of f.slow) slowRows.push(`| ${(s.ms / 1000).toFixed(3)}s | \`${s.name}\` | \`${f.file}\` |`);
  }
  return [
    `# Serial profile (${tapPath})`,
    '',
    `- Global wall: **${profile.wall_ms !== null ? (profile.wall_ms / 1000).toFixed(3) + 's' : 'n/a'}**`,
    `- Files: ${profile.files.length} | Leaves: ${profile.files.reduce((s, f) => s + f.leaves, 0)} | >3s leaves: ${profile.slow_count} (${(profile.slow_total_ms / 1000).toFixed(3)}s)`,
    '',
    '## Per-file (sorted by total)',
    '',
    '| File | Leaves | Total | >3s leaves |',
    '|---|---:|---:|---:|',
    rows,
    '',
    '## >3s inventory',
    '',
    '| Seconds | Leaf | File |',
    '|---|---:|---|',
    slowRows.join('\n'),
    '',
  ].join('\n');
}

// CLI entry.
const isMain = process.argv[1] && process.argv[1].endsWith('parse-tap.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const tapPath = args.find((a) => !a.startsWith('--'));
  const outPath = args.find((a) => /\.json$/.test(a) && a !== tapPath);
  const fileOverride = (() => {
    const i = args.indexOf('--file-name');
    return i >= 0 ? args[i + 1] : null;
  })();
  const collectAll = args.includes('--collect-all');
  const text = readFileSync(tapPath, 'utf8');
  const profile = parseTap(text, { fileOverride, collectAll });
  if (outPath) writeFileSync(outPath, JSON.stringify(profile, null, 2) + '\n');
  console.log(renderMarkdown(profile, tapPath));
}
