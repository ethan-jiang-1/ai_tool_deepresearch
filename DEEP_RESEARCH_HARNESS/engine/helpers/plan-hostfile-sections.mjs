// @impl PHS-007, URC-001
// Bounded host-file helpers. This intentionally recognizes only the one
// controls subsection and caller-requested top-level template sections.

export const NO_CONTROLS_SENTENCE = '未提供额外的本轮研究控制；按已确认的问题、范围和研究 profile 执行。';
export const SUPPLIED_CONTROLS_LABEL = '用户提供的本轮研究控制快照（仅作研究指导，不覆盖 Engine contracts）：';

function lineEnd(body, start) {
  const end = body.indexOf('\n', start);
  return end === -1 ? body.length : end;
}

function longestBacktickRun(value) {
  let longest = 0;
  for (const match of String(value).matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  return longest;
}

function canonicalConstraintsRange(body) {
  const header = '## Constraints';
  let offset = 0;
  while (offset <= body.length) {
    const end = lineEnd(body, offset);
    if (body.slice(offset, end) === header) {
      const contentStart = end === body.length ? body.length : end + 1;
      let sectionEnd = body.length;
      let cursor = contentStart;
      while (cursor < body.length) {
        const nextEnd = lineEnd(body, cursor);
        if (body.startsWith('## ', cursor)) {
          sectionEnd = cursor > 0 && body[cursor - 1] === '\n' ? cursor - 1 : cursor;
          break;
        }
        if (nextEnd === body.length) break;
        cursor = nextEnd + 1;
      }
      return { contentStart, end: sectionEnd };
    }
    if (end === body.length) break;
    offset = end + 1;
  }
  return null;
}

export function renderSuppliedControls(snapshot) {
  const literal = String(snapshot ?? '');
  const fence = '`'.repeat(Math.max(3, longestBacktickRun(literal) + 1));
  return `### User Research Controls\n\n${SUPPLIED_CONTROLS_LABEL}\n\n${fence}\n${literal}\n${fence}`;
}

export function renderNoControls() {
  return `### User Research Controls\n\n${NO_CONTROLS_SENTENCE}`;
}

// Returns only a complete, exact supplied-controls literal region. Lookalikes
// are deliberately ordinary Markdown rather than an alternate machine state.
export function locateSuppliedControls(body) {
  const heading = '### User Research Controls';
  const constraints = canonicalConstraintsRange(body);
  if (!constraints) return null;
  let cursor = 0;
  while (cursor < body.length) {
    const found = body.indexOf(heading, cursor);
    if (found === -1) return null;
    const lineStart = found === 0 || body[found - 1] === '\n' ? found : -1;
    if (lineStart === -1 || found < constraints.contentStart || found >= constraints.end || lineEnd(body, found) !== found + heading.length) {
      cursor = found + heading.length;
      continue;
    }
    const labelStart = found + heading.length + 2;
    if (!body.startsWith(SUPPLIED_CONTROLS_LABEL, labelStart) || body.slice(found + heading.length, labelStart) !== '\n\n') {
      cursor = found + heading.length;
      continue;
    }
    const afterLabel = labelStart + SUPPLIED_CONTROLS_LABEL.length;
    if (!body.startsWith('\n\n', afterLabel)) {
      cursor = found + heading.length;
      continue;
    }
    const fenceStart = afterLabel + 2;
    const fenceEnd = lineEnd(body, fenceStart);
    const fence = body.slice(fenceStart, fenceEnd);
    if (!/^`{3,}$/.test(fence) || fenceEnd === body.length) {
      cursor = found + heading.length;
      continue;
    }
    const contentStart = fenceEnd + 1;
    const closingNeedle = `\n${fence}`;
    const closingStart = body.indexOf(closingNeedle, contentStart);
    if (closingStart === -1) {
      cursor = found + heading.length;
      continue;
    }
    const closingEnd = closingStart + closingNeedle.length;
    if (closingEnd < body.length && body[closingEnd] !== '\n') {
      cursor = found + heading.length;
      continue;
    }
    const content = body.slice(contentStart, closingStart);
    if (longestBacktickRun(content) >= fence.length) {
      cursor = found + heading.length;
      continue;
    }
    return {
      start: found,
      end: closingEnd,
      content,
      fence,
      text: body.slice(found, closingEnd),
    };
  }
  return null;
}

export function controlsState(body) {
  const supplied = locateSuppliedControls(body);
  if (supplied) return { kind: 'supplied', ...supplied };
  return { kind: 'none' };
}

export function stripSuppliedControlsForTemplateScan(body) {
  const supplied = locateSuppliedControls(body);
  if (!supplied) return body;
  // Preserve every offset so callers can safely use locations discovered in
  // the masked scan against the original host-file bytes.
  return `${body.slice(0, supplied.start)}${supplied.text.replace(/[^\n]/g, ' ')}${body.slice(supplied.end)}`;
}

export function locateCanonicalSection(body, name) {
  const visible = stripSuppliedControlsForTemplateScan(body);
  const header = `## ${name}`;
  let start = -1;
  let offset = 0;
  while (offset <= visible.length) {
    const end = lineEnd(visible, offset);
    if (visible.slice(offset, end) === header) { start = offset; break; }
    if (end === visible.length) break;
    offset = end + 1;
  }
  if (start === -1) return null;
  const headerEnd = lineEnd(visible, start);
  let sectionEnd = visible.length;
  offset = headerEnd === visible.length ? visible.length : headerEnd + 1;
  while (offset < visible.length) {
    const end = lineEnd(visible, offset);
    if (visible.startsWith('## ', offset)) { sectionEnd = offset > 0 && visible[offset - 1] === '\n' ? offset - 1 : offset; break; }
    if (end === visible.length) break;
    offset = end + 1;
  }
  return { start, headerEnd, contentStart: headerEnd === body.length ? body.length : headerEnd + 1, end: sectionEnd };
}

export function locateCanonicalSections(body, name) {
  const visible = stripSuppliedControlsForTemplateScan(body);
  const header = `## ${name}`;
  const sections = [];
  let offset = 0;
  while (offset < visible.length) {
    const end = lineEnd(visible, offset);
    if (visible.slice(offset, end) === header) {
      const start = offset;
      const headerEnd = end;
      let sectionEnd = visible.length;
      let cursor = headerEnd === visible.length ? visible.length : headerEnd + 1;
      while (cursor < visible.length) {
        const nextEnd = lineEnd(visible, cursor);
        if (visible.startsWith('## ', cursor)) {
          sectionEnd = cursor > 0 && visible[cursor - 1] === '\n' ? cursor - 1 : cursor;
          break;
        }
        if (nextEnd === visible.length) break;
        cursor = nextEnd + 1;
      }
      sections.push({ start, headerEnd, contentStart: headerEnd === body.length ? body.length : headerEnd + 1, end: sectionEnd });
      offset = sectionEnd + 1;
      continue;
    }
    if (end === visible.length) break;
    offset = end + 1;
  }
  return sections;
}


export function canonicalSectionContent(body, name) {
  const section = locateCanonicalSection(body, name);
  if (!section) return null;
  return { ...section, content: body.slice(section.contentStart, section.end) };
}
