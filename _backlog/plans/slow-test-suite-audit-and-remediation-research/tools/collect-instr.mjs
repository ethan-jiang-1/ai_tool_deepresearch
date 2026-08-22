// Aggregate the instrument log (lines written by count-preload.mjs) into a
// per-file table, optionally joined with the parse-tap profile.
//
// Usage:
//   node tools/collect-instr.mjs /tmp/dsh-instr.log [profile.json]
import { readFileSync } from 'node:fs';

const [logPath, profilePath] = process.argv.slice(2);
const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
const byFile = new Map();
for (const line of lines) {
  let rec;
  try { rec = JSON.parse(line); } catch { continue; }
  const f = byFile.get(rec.file) ?? { spawn: 0, spawnSync: 0, exec: 0, execSync: 0, execFile: 0, execFileSync: 0, fork: 0, copyCalls: 0, copyBytes: 0 };
  for (const k of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork', 'copyCalls', 'copyBytes']) f[k] += rec[k] ?? 0;
  byFile.set(rec.file, f);
}

const profile = profilePath ? JSON.parse(readFileSync(profilePath, 'utf8')) : null;
const timeByFile = new Map((profile?.files ?? []).map((f) => [f.file, f]));

const rows = [...byFile.entries()]
  .map(([file, c]) => {
    const t = timeByFile.get(file);
    const spawns = c.spawn + c.spawnSync + c.exec + c.execSync + c.execFile + c.execFileSync + c.fork;
    return `| \`${file}\` | ${t ? `${(t.total_ms / 1000).toFixed(1)}s` : '—'} | ${t ? t.leaves : '—'} | ${spawns} | ${c.copyCalls} | ${(c.copyBytes / 1024).toFixed(0)}KB |`;
  })
  .sort((a, b) => {
    const ma = a.match(/([\d.]+)s/); const mb = b.match(/([\d.]+)s/);
    const na = ma ? Number(ma[1]) : -1; const nb = mb ? Number(mb[1]) : -1;
    return nb - na;
  })
  .join('\n');

console.log([
  '# Instrumented cost table',
  '',
  `Files instrumented: ${byFile.size}${profile ? ` / total files in profile: ${profile.files.length}` : ''}`,
  '',
  '| File | Total (profile) | Leaves | Launches | Copy calls | Copy bytes |',
  '|---|---:|---:|---:|---:|---:|',
  rows,
  '',
].join('\n'));
