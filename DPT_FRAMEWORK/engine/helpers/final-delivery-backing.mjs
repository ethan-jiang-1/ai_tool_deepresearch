// @impl FDB-001, FDB-002
// Read-only Final Evidence Map admission. This checker establishes structural
// declarations and submitted provenance only; it never judges claim quality.

import {
  existsSync,
  lstatSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { classifyReferenceAuthority } from './gate-helpers-checks.mjs';
import { readSubmittedWorkUnitDeclarations } from './gate-helpers-readers.mjs';
import {
  markdownSemanticSectionEntries,
  normalizeMarkdownSemanticHeading,
} from './markdown-semantic-sections.mjs';

export const FINAL_DELIVERY_BACKING_SCHEMA_VERSION = 'final-delivery-backing.v1';

export const FinalDeliveryBackingCheckSchema = z.object({
  passed: z.boolean(),
  subject: z.literal('final_delivery_backing'),
  target: z.string().min(1),
  declared_finding_count: z.number().int().nonnegative(),
  backing_link_count: z.number().int().nonnegative(),
}).strict();

export const FinalDeliveryBackingInspectSchema = z.object({
  code: z.string().min(1),
  detail: z.string().min(1),
  map_row: z.number().int().positive().nullable(),
  finding_id: z.string().nullable(),
  href: z.string().nullable(),
  resolved_path: z.string().nullable(),
  repair_surface: z.string().min(1),
}).strict();

export const FinalDeliveryBackingAdviceSchema = z.object({
  operation: z.literal('persist-final-report'),
  action: z.literal('repair_and_rerun'),
  repair_surface: z.string().min(1),
}).strict();

export const FinalDeliveryBackingEvaluationSchema = z.object({
  schema_version: z.literal(FINAL_DELIVERY_BACKING_SCHEMA_VERSION),
  check: FinalDeliveryBackingCheckSchema,
  inspect: z.array(FinalDeliveryBackingInspectSchema),
  advice: z.array(FinalDeliveryBackingAdviceSchema),
}).strict().superRefine((value, context) => {
  if (value.check.passed && (value.inspect.length > 0 || value.advice.length > 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['inspect'], message: 'a passing Final-backing check cannot retain repair feedback' });
  }
  if (!value.check.passed && (value.inspect.length !== 1 || value.advice.length !== 1)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['inspect'], message: 'a failed Final-backing check requires one direct repair fact and rerun action' });
  }
});

const REQUIRED_COLUMNS = Object.freeze([
  'finding id',
  'declared key finding',
  'submitted backing',
]);
const DIRECT_BACKING_ROLES = new Set(['source_yaml', 'evidence_summary']);

function normalizedTarget(value) {
  return typeof value === 'string' ? value.replaceAll('\\', '/') : '';
}

/** Safe Final Markdown target predicate shared by admission and recovery. */
export function isFinalMarkdownTarget(target) {
  const normalized = normalizedTarget(target);
  if (!normalized || normalized !== target || !normalized.startsWith('final/')) return false;
  const segments = normalized.split('/');
  if (segments.length < 2 || segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;
  return /\.md$/i.test(segments.at(-1));
}

function mapFeedback({
  target,
  passed,
  declaredFindingCount = 0,
  backingLinkCount = 0,
  issue = null,
}) {
  const inspect = issue ? [{
    code: issue.code,
    detail: issue.detail,
    map_row: issue.mapRow ?? null,
    finding_id: issue.findingId ?? null,
    href: issue.href ?? null,
    resolved_path: issue.resolvedPath ?? null,
    repair_surface: issue.repairSurface || 'retained_staging_report',
  }] : [];
  return FinalDeliveryBackingEvaluationSchema.parse({
    schema_version: FINAL_DELIVERY_BACKING_SCHEMA_VERSION,
    check: {
      passed,
      subject: 'final_delivery_backing',
      target: target || '<missing-final-target>',
      declared_finding_count: declaredFindingCount,
      backing_link_count: backingLinkCount,
    },
    inspect,
    advice: issue ? [{
      operation: 'persist-final-report',
      action: 'repair_and_rerun',
      repair_surface: issue.repairSurface || 'retained_staging_report',
    }] : [],
  });
}

function splitMarkdownTableRow(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function isDividerRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function tableBlocks(section) {
  const lines = String(section || '').split(/\r?\n/);
  const blocks = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const headers = splitMarkdownTableRow(lines[index]);
    const divider = splitMarkdownTableRow(lines[index + 1]);
    if (!headers || !divider || headers.length !== divider.length || !isDividerRow(divider)) continue;

    const rows = [];
    let cursor = index + 2;
    while (cursor < lines.length) {
      const cells = splitMarkdownTableRow(lines[cursor]);
      if (!cells) break;
      rows.push({ cells, mapRow: rows.length + 1 });
      cursor += 1;
    }
    blocks.push({ headers, rows });
    index = cursor - 1;
  }
  return blocks;
}

function normalizeColumnName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function requiredColumnIndexes(headers) {
  const indexes = new Map();
  for (const required of REQUIRED_COLUMNS) indexes.set(required, []);
  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header);
    if (indexes.has(normalized)) indexes.get(normalized).push(index);
  });
  return indexes;
}

function markdownLinks(cell) {
  const links = [];
  const pattern = /\[[^\]\r\n]*\]\(\s*(?:<([^>\r\n]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  const text = String(cell || '');
  for (const match of text.matchAll(pattern)) {
    if (match.index > 0 && text[match.index - 1] === '!') continue;
    const href = (match[1] || match[2] || '').trim();
    if (href) links.push(href);
  }
  return links;
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveBackingHref({ bundleReal, target, href }) {
  const rawPath = String(href || '').split('#', 1)[0];
  if (!rawPath || rawPath.includes('?') || rawPath.includes('\\') || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(rawPath) || rawPath.startsWith('/')) {
    return { ok: false, code: 'unsafe_backing_href', detail: `Evidence Map backing link is not a safe local bundle path: ${href || '<empty>'}` };
  }

  let linkPath;
  try {
    linkPath = decodeURIComponent(rawPath);
  } catch {
    return { ok: false, code: 'malformed_backing_href', detail: `Evidence Map backing link cannot be decoded safely: ${href}` };
  }
  if (!linkPath || linkPath.includes('\0') || linkPath.includes('\\') || path.isAbsolute(linkPath)) {
    return { ok: false, code: 'unsafe_backing_href', detail: `Evidence Map backing link is not a safe local bundle path: ${href}` };
  }

  const targetPath = path.resolve(bundleReal, ...target.split('/'));
  const resolved = path.resolve(path.dirname(targetPath), linkPath);
  if (!inside(bundleReal, resolved)) {
    return { ok: false, code: 'backing_path_escapes_bundle', detail: `Evidence Map backing link escapes the selected bundle: ${href}` };
  }
  const relPath = path.relative(bundleReal, resolved).split(path.sep).join('/');
  if (!relPath || relPath.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    return { ok: false, code: 'unsafe_backing_href', detail: `Evidence Map backing link is not a safe bundle-relative path: ${href}` };
  }
  return { ok: true, relPath, absPath: resolved };
}

function inspectRegularBackingFile(bundleReal, relPath) {
  let current = bundleReal;
  const segments = relPath.split('/');
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    if (!existsSync(current)) {
      return { ok: false, code: 'backing_file_missing', detail: `Evidence Map backing file is missing: ${relPath}` };
    }
    const info = lstatSync(current);
    if (info.isSymbolicLink()) {
      return { ok: false, code: 'backing_path_symlink', detail: `Evidence Map backing path must not contain a symlink: ${relPath}` };
    }
    if (index < segments.length - 1 && !info.isDirectory()) {
      return { ok: false, code: 'backing_parent_invalid', detail: `Evidence Map backing path has a non-directory parent: ${relPath}` };
    }
    if (index === segments.length - 1 && !info.isFile()) {
      return { ok: false, code: 'backing_not_regular_file', detail: `Evidence Map backing must be a regular file: ${relPath}` };
    }
  }
  return { ok: true };
}

function submittedDirectBackingIndex(bundlePath) {
  const rows = readSubmittedWorkUnitDeclarations(bundlePath);
  const directPaths = new Map();
  for (const row of rows) {
    for (const output of row.output_files || []) {
      if (!DIRECT_BACKING_ROLES.has(output?.role) || typeof output?.path !== 'string') continue;
      if (!directPaths.has(output.path)) directPaths.set(output.path, { row, output });
    }
  }
  return directPaths;
}

function prohibitedBackingPath(relPath) {
  if (relPath.startsWith('final/')) return 'final_output_not_backing';
  if (relPath.startsWith('_cache/')) return 'cache_only_not_backing';
  if (relPath === 'reference/_INDEX.md') return 'reference_index_not_backing';
  if (/(?:^|\/)(?:finding-index\.ya?ml|cross-topic-ledger\.md)$/i.test(relPath)) return 'synthesis_index_not_backing';
  return null;
}

function evaluationFailure(target, issue, counts = {}) {
  return mapFeedback({ target, passed: false, issue, ...counts });
}

/**
 * Evaluate one staged Final Markdown report without mutating the bundle.
 * Links resolve relative to the intended final target, not the staging path.
 */
export function evaluateFinalDeliveryBacking({ bundlePath, target, markdown } = {}) {
  if (!isFinalMarkdownTarget(target)) {
    return evaluationFailure(target, {
      code: 'final_markdown_target_required',
      detail: 'Final-backing admission requires a safe Markdown target under final/.',
      repairSurface: 'persistence_target',
    });
  }

  const sections = markdownSemanticSectionEntries(markdown)
    .filter((entry) => entry.name === normalizeMarkdownSemanticHeading('Evidence Map'));
  if (sections.length !== 1) {
    return evaluationFailure(target, {
      code: sections.length === 0 ? 'evidence_map_missing' : 'evidence_map_ambiguous',
      detail: sections.length === 0
        ? 'Final Markdown report is missing its designated Evidence Map section.'
        : 'Final Markdown report contains more than one Evidence Map section.',
      repairSurface: 'retained_staging_report',
    });
  }

  const tables = tableBlocks(sections[0].body);
  if (tables.length !== 1) {
    return evaluationFailure(target, {
      code: tables.length === 0 ? 'evidence_map_table_missing' : 'evidence_map_table_ambiguous',
      detail: tables.length === 0
        ? 'Evidence Map must contain one standard Markdown table.'
        : 'Evidence Map contains more than one table and has no unambiguous declaration table.',
      repairSurface: 'retained_staging_report',
    });
  }

  const table = tables[0];
  const columns = requiredColumnIndexes(table.headers);
  const missingOrAmbiguousColumn = REQUIRED_COLUMNS.find((column) => columns.get(column).length !== 1);
  if (missingOrAmbiguousColumn) {
    return evaluationFailure(target, {
      code: 'evidence_map_columns_invalid',
      detail: `Evidence Map must contain exactly one '${missingOrAmbiguousColumn}' column.`,
      repairSurface: 'retained_staging_report',
    });
  }
  if (table.rows.length === 0) {
    return evaluationFailure(target, {
      code: 'evidence_map_empty',
      detail: 'Evidence Map must declare at least one finding row.',
      repairSurface: 'retained_staging_report',
    });
  }

  const findingColumn = columns.get('finding id')[0];
  const declarationColumn = columns.get('declared key finding')[0];
  const backingColumn = columns.get('submitted backing')[0];
  const declarations = new Map();
  const parsedRows = [];
  let backingLinkCount = 0;

  for (const row of table.rows) {
    const findingId = (row.cells[findingColumn] || '').trim();
    const declaration = (row.cells[declarationColumn] || '').trim();
    const backingCell = (row.cells[backingColumn] || '').trim();
    if (!findingId || !declaration || !backingCell) {
      return evaluationFailure(target, {
        code: 'evidence_map_row_incomplete',
        detail: `Evidence Map row ${row.mapRow} requires Finding ID, Declared Key Finding, and Submitted Backing.`,
        mapRow: row.mapRow,
        findingId: findingId || null,
        repairSurface: 'retained_staging_report',
      }, { declaredFindingCount: declarations.size, backingLinkCount });
    }
    const previous = declarations.get(findingId);
    if (previous !== undefined && previous !== declaration) {
      return evaluationFailure(target, {
        code: 'evidence_map_declaration_conflict',
        detail: `Evidence Map row ${row.mapRow} gives '${findingId}' a different declared key finding.`,
        mapRow: row.mapRow,
        findingId,
        repairSurface: 'retained_staging_report',
      }, { declaredFindingCount: declarations.size, backingLinkCount });
    }
    declarations.set(findingId, declaration);
    const links = markdownLinks(backingCell);
    if (links.length === 0) {
      return evaluationFailure(target, {
        code: 'evidence_map_backing_link_missing',
        detail: `Evidence Map row ${row.mapRow} has no parseable Markdown backing link.`,
        mapRow: row.mapRow,
        findingId,
        repairSurface: 'retained_staging_report',
      }, { declaredFindingCount: declarations.size, backingLinkCount });
    }
    backingLinkCount += links.length;
    parsedRows.push({ mapRow: row.mapRow, findingId, links });
  }

  let bundleReal;
  let bundleReaderPath;
  try {
    bundleReaderPath = path.resolve(bundlePath || '');
    const info = lstatSync(bundleReaderPath);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('selected bundle is not a real directory');
    bundleReal = realpathSync(bundleReaderPath);
  } catch (error) {
    return evaluationFailure(target, {
      code: 'bundle_unavailable',
      detail: `Final-backing admission cannot inspect the selected bundle: ${error.message}`,
      repairSurface: 'persistence_bundle',
    }, { declaredFindingCount: declarations.size, backingLinkCount });
  }

  const resolvedLinks = [];
  for (const row of parsedRows) {
    for (const href of row.links) {
      const resolved = resolveBackingHref({ bundleReal, target, href });
      if (!resolved.ok) {
        return evaluationFailure(target, {
          code: resolved.code,
          detail: resolved.detail,
          mapRow: row.mapRow,
          findingId: row.findingId,
          href,
          repairSurface: 'retained_staging_report',
        }, { declaredFindingCount: declarations.size, backingLinkCount });
      }
      const fileFact = inspectRegularBackingFile(bundleReal, resolved.relPath);
      if (!fileFact.ok) {
        return evaluationFailure(target, {
          code: fileFact.code,
          detail: fileFact.detail,
          mapRow: row.mapRow,
          findingId: row.findingId,
          href,
          resolvedPath: resolved.relPath,
          repairSurface: fileFact.code === 'backing_file_missing' ? 'retained_staging_report' : 'backing_path_safety',
        }, { declaredFindingCount: declarations.size, backingLinkCount });
      }
      const prohibited = prohibitedBackingPath(resolved.relPath);
      if (prohibited) {
        return evaluationFailure(target, {
          code: prohibited,
          detail: `Evidence Map backing path is not an admissible submitted evidence surface: ${resolved.relPath}`,
          mapRow: row.mapRow,
          findingId: row.findingId,
          href,
          resolvedPath: resolved.relPath,
          repairSurface: 'retained_staging_report',
        }, { declaredFindingCount: declarations.size, backingLinkCount });
      }
      resolvedLinks.push({ row, href, resolved });
    }
  }

  let directPaths;
  try {
    directPaths = submittedDirectBackingIndex(bundleReaderPath);
  } catch (error) {
    return evaluationFailure(target, {
      code: 'submitted_declaration_ledger_invalid',
      detail: `Final-backing admission cannot read submitted work-unit declarations: ${error.message}`,
      repairSurface: 'submitted_authority',
    }, { declaredFindingCount: declarations.size, backingLinkCount });
  }

  for (const { row, href, resolved } of resolvedLinks) {
    if (directPaths.has(resolved.relPath)) continue;

    if (resolved.relPath.startsWith('reference/')) {
      const classification = classifyReferenceAuthority(bundleReaderPath, {
        relPath: resolved.relPath,
        absPath: resolved.absPath,
      });
      if (classification.passed) continue;
      return evaluationFailure(target, {
        code: classification.reason_code || 'reference_backing_unavailable',
        detail: `Evidence Map reference backing is not submitted-backed: ${classification.reason}`,
        mapRow: row.mapRow,
        findingId: row.findingId,
        href,
        resolvedPath: resolved.relPath,
        repairSurface: 'reference_or_submitted_authority',
      }, { declaredFindingCount: declarations.size, backingLinkCount });
    }

    return evaluationFailure(target, {
      code: 'submitted_direct_backing_missing',
      detail: `Evidence Map backing path is not an exact submitted source_yaml or evidence_summary output: ${resolved.relPath}`,
      mapRow: row.mapRow,
      findingId: row.findingId,
      href,
      resolvedPath: resolved.relPath,
      repairSurface: 'retained_staging_report',
    }, { declaredFindingCount: declarations.size, backingLinkCount });
  }

  return mapFeedback({
    target,
    passed: true,
    declaredFindingCount: declarations.size,
    backingLinkCount,
  });
}
