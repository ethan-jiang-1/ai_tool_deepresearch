// spec-unit-parse.mjs — shared deterministic unit parser for spec hygiene tools.
//
// Sole implementation of "requirement block / prose paragraph / scenario"
// segmentation used by scan-restatement-candidates.mjs and
// assemble-spec-delta.mjs. Both tools MUST import segmentation from here so
// that "第 N 段散文 / 第 M 个场景" has one meaning across the toolchain.
//
// Method (matches CLS-084 / F4 deep-dive unit analysis):
//   - A requirement block runs from a `### Requirement:` heading line to the
//     line before the next `### Requirement:` heading (or EOF).
//   - Inside a block, a prose paragraph is a maximal run of consecutive
//     non-empty prose lines. Loose list / quote / table / numbered-list runs
//     merge into the PRECEDING prose paragraph (deep-dive: 松散列表并入前属);
//     a run with no preceding paragraph merges into the FOLLOWING one.
//   - A scenario runs from `#### Scenario:` to the line before the next
//     `#### Scenario:` / `### Requirement:` / EOF; everything inside
//     (including its WHEN/THEN list lines) belongs to the scenario.
// All line numbers are 1-based and refer to the whole file text.

const RE_REQ_HEADING = /^### Requirement:/;
const RE_SCENARIO_HEADING = /^#### Scenario:/;

function isBlank(line) {
  return line.trim().length === 0;
}

function lineClass(line) {
  if (isBlank(line)) return 'blank';
  if (RE_SCENARIO_HEADING.test(line)) return 'scenario';
  if (/^#{1,6}\s/.test(line)) return 'heading';
  if (/^> req:/.test(line)) return 'meta'; // inline requirement-ID line: metadata, never prose content
  if (/^(-|\*|\d+\.)\s/.test(line)) return 'list';
  if (/^\s+\S/.test(line)) return 'indent'; // list-item continuation line
  if (/^>/.test(line)) return 'quote';
  if (/^\|/.test(line)) return 'table';
  return 'prose';
}

/**
 * Split file text into requirement blocks.
 * @param {string} text full file text
 * @returns {{ blocks: Array<{title: string, titleLine: number, startLine: number, endLine: number}>, lines: string[] }}
 *   title is the heading line itself (e.g. "### Requirement: Foo").
 *   startLine/endLine are inclusive, covering the heading through the last
 *   line before the next requirement heading (trailing blank lines excluded
 *   from endLine; they separate blocks and are not block content).
 */
export function parseRequirementBlocks(text) {
  const lines = text.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (RE_REQ_HEADING.test(lines[i])) starts.push(i);
  }
  const blocks = [];
  for (let s = 0; s < starts.length; s++) {
    const startIdx = starts[s];
    const nextStart = s + 1 < starts.length ? starts[s + 1] : lines.length;
    let endIdx = nextStart - 1;
    while (endIdx > startIdx && isBlank(lines[endIdx])) endIdx--;
    blocks.push({
      title: lines[startIdx],
      titleLine: startIdx + 1,
      startLine: startIdx + 1,
      endLine: endIdx + 1,
    });
  }
  return { blocks, lines };
}

/**
 * Parse one requirement block (given as the whole-file lines plus the block
 * boundary) into prose paragraphs and scenarios.
 * @param {string[]} lines whole-file lines (0-based array)
 * @param {{startLine: number, endLine: number}} block 1-based inclusive bounds
 * @returns {{
 *   prose: Array<{index: number, startLine: number, endLine: number, firstLine: string}>,
 *   scenarios: Array<{index: number, startLine: number, endLine: number, title: string}>
 * }}
 *   prose[i].firstLine is the paragraph's first non-empty line text.
 *   Every non-blank block line outside scenarios belongs to exactly one
 *   prose paragraph (loose list/quote/table runs merge into the preceding
 *   paragraph, or the following one when no paragraph precedes yet).
 */
export function parseBlockUnits(lines, block) {
  const b0 = block.startLine - 1; // heading line index
  const b1 = block.endLine - 1; // last content line index

  // 1. Scenario ranges.
  const scenarios = [];
  let scenStart = -1;
  for (let i = b0 + 1; i <= b1; i++) {
    if (RE_SCENARIO_HEADING.test(lines[i])) {
      if (scenStart !== -1) {
        scenarios.push({ start: scenStart, end: i - 1, title: lines[scenStart] });
      }
      scenStart = i;
    }
  }
  if (scenStart !== -1) scenarios.push({ start: scenStart, end: b1, title: lines[scenStart] });
  const inScenario = new Array(lines.length).fill(false);
  for (const sc of scenarios) {
    for (let i = sc.start; i <= sc.end; i++) inScenario[i] = true;
  }

  // 2. Prose paragraphs over non-scenario lines.
  // Model:
  //   - prose line: extends the open paragraph, or opens one. Opening prose
  //     after a loose-interrupted paragraph starts a NEW paragraph.
  //   - blank: closes the open paragraph.
  //   - loose list/quote/table run: merges into the open paragraph (owner =
  //     preceding prose — 深挖方法"松散列表并入前属"); the paragraph stays open
  //     in "loose" state so consecutive list lines keep merging, but any
  //     later prose line starts a new paragraph. With no open paragraph the
  //     loose run is held and merges into the NEXT paragraph.
  //   - scenario/heading: boundary; closes the open paragraph.
  const runs = []; // {start, end}
  let cur = null; // {start, end}
  let curLoose = false; // open paragraph was last extended by a loose block
  let lastClosed = null; // most recently closed run (for one-blank-gap reattach)
  let pending = null; // held loose run {start, end} with no preceding paragraph
  const closeCur = () => {
    if (cur) {
      runs.push(cur);
      lastClosed = cur;
      cur = null;
      curLoose = false;
    }
  };
  for (let i = b0 + 1; i <= b1; i++) {
    if (inScenario[i]) continue;
    const cls = lineClass(lines[i]);
    if (cls === 'meta') continue; // inline req-ID lines are not block content
    if (cls === 'prose') {
      if (cur && !curLoose) {
        cur.end = i;
      } else {
        closeCur();
        if (pending) {
          cur = { start: pending.start, end: i };
          pending = null;
        } else {
          cur = { start: i, end: i };
        }
      }
    } else if (cls === 'blank') {
      closeCur();
    } else if (cls === 'list' || cls === 'quote' || cls === 'table' || cls === 'indent') {
      if (cur) {
        cur.end = i; // loose block merges into preceding paragraph
        curLoose = true;
      } else if (lastClosed && lastClosed.end === i - 2 && runs[runs.length - 1] === lastClosed) {
        // loose block separated from its owning paragraph by one blank line
        // (Markdown requires the blank before a list) — reattach and keep it
        // open so consecutive loose lines keep merging.
        runs.pop();
        lastClosed.end = i;
        cur = lastClosed;
        curLoose = true;
      } else if (pending && pending.end === i - 1) {
        pending.end = i;
      } else {
        closeCur();
        pending = { start: i, end: i };
      }
    } else {
      // scenario / heading boundary
      closeCur();
    }
  }
  closeCur();
  if (pending) runs.push(pending); // orphan loose run: own paragraph fallback

  // 3. Normalize: sort by position, index from 1, extract first lines.
  runs.sort((a, b) => a.start - b.start);
  const prose = runs.map((r, idx) => ({
    index: idx + 1,
    startLine: r.start + 1,
    endLine: r.end + 1,
    firstLine: lines[r.start],
  }));
  const scenariosOut = scenarios.map((sc, idx) => ({
    index: idx + 1,
    startLine: sc.start + 1,
    endLine: sc.end + 1,
    title: sc.title,
  }));
  return { prose, scenarios: scenariosOut };
}

/**
 * Multiset difference of non-empty lines.
 * @param {string[]} before raw lines of original text
 * @param {string[]} after raw lines of transformed text
 * @param {string[]} allowedAdditions lines that may be newly added (net)
 * @returns {{ ok: boolean, missing: string[], extra: string[] }}
 *   ok=true iff multiset(after \\ allowedAdditions) === multiset(before).
 *   missing: lines present before but absent after. extra: lines present
 *   after but neither before nor in allowedAdditions.
 */
export function multisetConservation(before, after, allowedAdditions = []) {
  const count = (arr) => {
    const m = new Map();
    for (const l of arr) {
      if (isBlank(l)) continue;
      m.set(l, (m.get(l) ?? 0) + 1);
    }
    return m;
  };
  const beforeM = count(before);
  const afterM = count(after);
  const allowedM = count(allowedAdditions);

  const missing = [];
  for (const [l, n] of beforeM) {
    const a = afterM.get(l) ?? 0;
    if (a < n) missing.push(...Array(n - a).fill(l));
  }
  const extra = [];
  for (const [l, n] of afterM) {
    const b = beforeM.get(l) ?? 0;
    const allowed = allowedM.get(l) ?? 0;
    if (n > b + allowed) extra.push(...Array(n - b - allowed).fill(l));
  }
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}
