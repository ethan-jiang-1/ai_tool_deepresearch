// plan-progress-blocks.mjs
// @impl PHS-010
// Shared Engine-owned parse of the canonical `rb_plan.md## Progress` section
// into a baseline block plus zero or more `### Rerun cycle <N>` blocks. This is
// the single block-membership authority: the Progress writer
// (gate-helpers-plan-progress.mjs) and the phase status auditor
// (phase-status-audit.mjs) both consume this parse so they can never disagree
// about which block a line belongs to.
//
// Semantics (formerly duplicated, now singular): detection is trim-based; a
// trimmed line matching the canonical header `### Rerun cycle <N> (spawned
// <ts>)` with an ISO 8601 Zulu timestamp opens a canonical block; a trimmed
// line that merely looks like a cycle header (wrong shape, non-Zulu or missing
// timestamp) opens an `unparseable` block — manual interference, fail closed.
// Trailing blank lines are dropped from the preceding block so a rebuild can
// re-emit exactly one blank separator before each header
// (parse(rebuild(x)) == x).

// Engine-owned cycle block header: `### Rerun cycle <N> (spawned <ts>)`.
export const PROGRESS_CYCLE_HEADER_PATTERN = /^### Rerun cycle (\d+) \(spawned (.+)\)$/;
export const PROGRESS_CYCLE_HEADER_LOOKS_LIKE = /^### Rerun cycle/i;

// Canonical Engine-written spawn timestamp form: ISO 8601 Zulu
// (`new Date().toISOString()`). Shape-valid but non-real dates still fail the
// witness window below via Date.parse -> NaN.
export const SPAWN_TS_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function popTrailingBlankLines(block) {
  while (block.lines.length > 0 && block.lines[block.lines.length - 1].trim() === '') {
    block.lines.pop();
  }
}

export function parseProgressBlocks(sectionContent) {
  const blocks = [];
  let current = { header: null, ordinal: null, spawnTs: null, unparseable: false, lines: [] };
  blocks.push(current);
  for (const rawLine of String(sectionContent ?? '').split('\n')) {
    const line = rawLine.trim();
    const match = line.match(PROGRESS_CYCLE_HEADER_PATTERN);
    if (match && SPAWN_TS_PATTERN.test(match[2])) {
      popTrailingBlankLines(current);
      current = { header: rawLine, ordinal: Number(match[1]), spawnTs: match[2], unparseable: false, lines: [] };
      blocks.push(current);
      continue;
    }
    if (PROGRESS_CYCLE_HEADER_LOOKS_LIKE.test(line)) {
      // Cycle-looking header the Engine never writes — manual interference.
      // Fail closed: checked lines in this block have no verifiable witness
      // window and are tamper evidence.
      popTrailingBlankLines(current);
      current = { header: rawLine, ordinal: null, spawnTs: null, unparseable: true, lines: [] };
      blocks.push(current);
      continue;
    }
    current.lines.push(rawLine);
  }
  return blocks;
}

// Parsed-milliseconds view of one canonical Zulu timestamp, or null when the
// value is not in the canonical form or does not parse as a real date. All
// witness-window membership decisions go through this so correctness never
// depends on lexical Zulu ordering.
export function zuluTimestampMs(ts) {
  if (typeof ts !== 'string' || !SPAWN_TS_PATTERN.test(ts)) return null;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : null;
}
