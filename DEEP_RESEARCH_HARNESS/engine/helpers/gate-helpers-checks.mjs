// gate-helpers-checks.mjs — Gate rule checks: reference validation and cache_coverage
// @impl GSK-001, GSK-002, CRC-006, REF-008, WPG-012, WPG-017, RWG-017
// Canonical location: DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve as resolvePath } from 'node:path';
import {
  readOutputDeclarations,
  readBundlePlan,
  readSubmittedWorkUnitDeclarations,
  getDeclaredReferencePaths,
  parseMdFrontmatter,
} from './gate-helpers-readers.mjs';
import { validateIndexMD } from '../../schema/contracts/reference.mjs';
import { evaluateTopicLayouts, resolveReferenceTopicBinding } from './topic-layout.mjs';
import {
  CACHE_BASE_LEAF_FILES,
  CACHE_SOURCE_MAPPING_FIELDS,
  cacheLeafMapping,
  inspectCacheLeaf,
} from './cache-leaf-contract.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { normalizeWave1ReferenceUrl } from './reference-url.mjs';
import { readSubmittedWave0Backing } from '../work-unit-projection.mjs';
import {
  extractSection,
  markdownSemanticSectionEntries,
  normalizeMarkdownSemanticHeading,
  parseMarkdownSemanticSections,
} from './markdown-semantic-sections.mjs';

export { extractSection, parseMarkdownSemanticSections };

function checkerFinding(rule, {
  defaultRuleId,
  id = null,
  blockingBasis,
  surface,
  expected,
  observed,
  missingFact,
  repairKind,
  writeTo,
  repair,
  detail,
}) {
  const ruleId = rule?.id || defaultRuleId;
  return makeContractFinding({
    id: id || ruleId,
    ruleId,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis,
    surface,
    expected,
    observed,
    missingFact,
    repairKind,
    writeTo,
    repair,
    detail,
  });
}

function normalizeUrl(url) {
  return normalizeWave1ReferenceUrl(url) || String(url || '').trim();
}

const ACCEPTED_SOURCE_STATUSES = new Set(['accepted', 'countable', 'accepted_countable']);

function acceptedSourceStatus(status) {
  return ACCEPTED_SOURCE_STATUSES.has(String(status || '').trim().toLowerCase());
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function isSafeBundleRef(ref) {
  return typeof ref === 'string' && ref.length > 0 && !ref.startsWith('/') && !ref.split(/[\\/]+/).includes('..');
}

function sourceUrlsFromMetadata(metadata) {
  const raw = metadata.get('source_url') || '';
  return raw.split(';').map((url) => url.trim()).filter(Boolean);
}

function normalizeIndexRef(ref) {
  let value = String(ref || '').trim().replace(/^`|`$/g, '');
  if (!value) return '';
  if (value.startsWith('./')) value = value.slice(2);
  if (!value.startsWith('reference/')) value = `reference/${value}`;
  return value;
}

function splitMarkdownTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((part) => part.trim());
}

function readReferenceIndexRows(bundlePath) {
  const indexPath = join(bundlePath, 'reference', '_INDEX.md');
  if (!existsSync(indexPath)) {
    return { exists: false, rows: [], rowByFile: new Map() };
  }

  const content = readFileSync(indexPath, 'utf-8');
  const validation = validateIndexMD(content);
  if (!validation.valid) {
    return { exists: true, valid: false, errors: validation.errors, rows: [], rowByFile: new Map() };
  }
  const lines = content.split(/\r?\n/);
  const rows = [];
  const rowByFile = new Map();
  let headers = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = splitMarkdownTableRow(trimmed);
    if (!headers) {
      if (cells.includes('ref_file')) headers = cells;
      continue;
    }
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    const row = {};
    for (let i = 0; i < headers.length; i++) row[headers[i]] = cells[i] || '';
    const ref = normalizeIndexRef(row.ref_file);
    if (ref) {
      rows.push(row);
      rowByFile.set(ref, row);
    }
  }
  return { exists: true, valid: true, errors: [], rows, rowByFile };
}

function hasExplicitDegradedCapture(pageText, meta) {
  const text = String(pageText || '').toLowerCase();
  const reason = [
    meta?.capture_status,
    meta?.fetch_status,
    meta?.degraded_capture,
    meta?.failure_reason,
    meta?.reason,
  ].filter((value) => value !== undefined && value !== null).join(' ').toLowerCase();
  return /degraded|fetch[-_ ]?failure|access[-_ ]?failure|blocked|unavailable|failed/.test(`${text} ${reason}`);
}

function submittedBackingIndex(bundlePath) {
  const rows = readSubmittedWorkUnitDeclarations(bundlePath);
  const referenceOutputs = new Map();
  const acceptedUrls = new Map();
  const priorAcceptedUrls = new Map();
  const targetedAcceptedUrls = new Map();
  const submittedRefs = new Set();

  function addUrl(map, url, row, source) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    if (!map.has(normalized)) map.set(normalized, []);
    map.get(normalized).push({ row, source });
  }

  for (const row of rows) {
    if (row.work_id) submittedRefs.add(row.work_id);
    if (row.work_unit_ref) submittedRefs.add(row.work_unit_ref);
    if (row.result_ref) submittedRefs.add(row.result_ref);
    if (row.runtime_receipt_ref) submittedRefs.add(row.runtime_receipt_ref);

    for (const output of row.output_files || []) {
      if (output.path) submittedRefs.add(output.path);
      if (output.role === 'reference' && output.path) referenceOutputs.set(output.path, row);
      if (output.source_url) {
        addUrl(acceptedUrls, output.source_url, row, 'output_files.source_url');
        if (row.wave === 2 || row.kind === 'wave2_targeted_evidence') addUrl(targetedAcceptedUrls, output.source_url, row, 'output_files.source_url');
        else addUrl(priorAcceptedUrls, output.source_url, row, 'output_files.source_url');
      }
    }

    for (const claim of row.source_claims || []) {
      if (!acceptedSourceStatus(claim.acceptance_status)) continue;
      addUrl(acceptedUrls, claim.url, row, 'source_claims.url');
      if (row.wave === 2 || row.kind === 'wave2_targeted_evidence') addUrl(targetedAcceptedUrls, claim.url, row, 'source_claims.url');
      else addUrl(priorAcceptedUrls, claim.url, row, 'source_claims.url');
      if (claim.source_ref) submittedRefs.add(claim.source_ref);
      for (const ref of claim.cache_trail_refs || []) submittedRefs.add(ref);
      if (claim.degraded_capture_ref) submittedRefs.add(claim.degraded_capture_ref);
    }

    for (const url of row.accepted_source_urls || []) {
      addUrl(acceptedUrls, url, row, 'accepted_source_urls');
      if (row.wave === 2 || row.kind === 'wave2_targeted_evidence') addUrl(targetedAcceptedUrls, url, row, 'accepted_source_urls');
      else addUrl(priorAcceptedUrls, url, row, 'accepted_source_urls');
    }

    for (const trail of row.cache_trails || []) {
      submittedRefs.add(trail);
      const meta = readJsonSafe(join(bundlePath, trail, 'meta.json'));
      const pagePath = join(bundlePath, trail, 'page.md');
      const pageText = existsSync(pagePath) ? readFileSync(pagePath, 'utf-8') : '';
      const urls = [meta?.url, meta?.source_url, meta?.final_url, meta?.fetched_url].filter(Boolean);
      for (const url of urls) {
        addUrl(acceptedUrls, url, row, hasExplicitDegradedCapture(pageText, meta) ? 'degraded_cache_trail' : 'cache_trail');
        if (row.wave === 2 || row.kind === 'wave2_targeted_evidence') addUrl(targetedAcceptedUrls, url, row, 'cache_trail');
        else addUrl(priorAcceptedUrls, url, row, 'cache_trail');
      }
    }
  }

  return { rows, referenceOutputs, acceptedUrls, priorAcceptedUrls, targetedAcceptedUrls, submittedRefs };
}

function bodyHasSubmittedBackingRef(content, index) {
  for (const ref of index.submittedRefs) {
    if (ref && content.includes(ref)) return true;
  }
  return /(?:artifacts|_cache|_work_units)\/wave[01]\//.test(content);
}

function bodyHasWave2ProcessRefs(content) {
  return /W2F-\d{3}/.test(content) &&
    /(?:artifacts\/wave2\/)?(?:finding-index\.yaml|cross-topic-ledger\.md)/.test(content);
}

function isWave1TopicReference(relPath) {
  return /^reference\/(?!00-shared-)(?!00-cross-)[^/]+-[^/]+\.md$/.test(relPath);
}

function isWave2CrossReference(relPath) {
  return /^reference\/00-cross-[^/]+\.md$/.test(relPath);
}

function isWave0SharedReference(relPath) {
  return /^reference\/00-shared-[^/]+\.md$/.test(relPath);
}

function referenceBody(content) {
  const text = String(content || '');
  const frontmatter = text.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  return frontmatter ? text.slice(frontmatter[0].length) : text;
}

function wave0IdentityMentions(content) {
  const identities = new Set();
  const pattern = /\b(wu-[A-Za-z0-9_-]+\/[1-9][0-9]*)\b/g;
  for (const match of String(content || '').matchAll(pattern)) identities.add(match[1]);
  return [...identities];
}

function classifyWave0SharedProjection(bundlePath, relPath, content, sourceUrls) {
  const normalizedUrls = [...new Set(sourceUrls.map(normalizeUrl).filter(Boolean))];
  if (normalizedUrls.length !== 1) {
    return referenceAuthorityFailure({
      authority: 'unbacked_projection',
      reasonCode: 'wave0_projection_source_url_ambiguous',
      reason: `projection_backing_drift: ${relPath} must name one source_url before submitted Wave0 backing can be resolved`,
      blockingBasis: 'binding_integrity',
      repairKind: 'agent_action',
      writeTo: `${resolvePath(bundlePath, relPath)}#metadata.source_url`,
      missingFact: `${relPath} has ${normalizedUrls.length} distinct source_url values; one exact submitted source identity is required.`,
    });
  }

  const body = referenceBody(content);
  const entryIds = wave0IdentityMentions(body);
  if (entryIds.length === 0) {
    return referenceAuthorityFailure({
      authority: 'unbacked_projection',
      reasonCode: 'wave0_source_identity_missing',
      reason: `projection_backing_drift: ${relPath} has no exact <work_id>/<ordinal> submitted Wave0 source identity in its body`,
      blockingBasis: 'binding_integrity',
      repairKind: 'agent_action',
      writeTo: resolvePath(bundlePath, relPath),
      missingFact: `${relPath} must cite one exact submitted Wave0 source identity in its scannable body; source_url alone is not a selector.`,
    });
  }
  if (entryIds.length > 1) {
    return referenceAuthorityFailure({
      authority: 'unbacked_projection',
      reasonCode: 'wave0_source_identity_ambiguous',
      reason: `projection_backing_drift: ${relPath} names multiple submitted Wave0 source identities`,
      blockingBasis: 'binding_integrity',
      repairKind: 'agent_action',
      writeTo: resolvePath(bundlePath, relPath),
      missingFact: `${relPath} names ${entryIds.join(', ')}; a Wave0 consumer projection must bind exactly one source identity.`,
    });
  }

  const [entryId] = entryIds;
  const workId = entryId.slice(0, entryId.lastIndexOf('/'));
  const backingResult = readSubmittedWave0Backing(bundlePath, {
    work_id: workId,
    entry_id: entryId,
  });
  if (!backingResult.passed) {
    const root = backingResult.root_findings?.[0] || {};
    return referenceAuthorityFailure({
      authority: 'unbacked_projection',
      reasonCode: root.rule_id || 'submitted_wave0_backing_unavailable',
      reason: `projection_backing_drift: ${relPath} cannot resolve submitted Wave0 backing for ${entryId}`,
      blockingBasis: root.blocking_basis || 'binding_integrity',
      repairKind: root.repair_kind || 'engine_operation',
      writeTo: root.write_to || 'Existing Wave0 submitted-backing reader boundary',
      missingFact: root.missing_fact || `No exact submitted Wave0 backing is available for ${entryId}.`,
    });
  }

  const backing = backingResult.backing;
  if (normalizeUrl(backing.source_url) !== normalizedUrls[0]) {
    return referenceAuthorityFailure({
      authority: 'unbacked_projection',
      reasonCode: 'wave0_submitted_backing_url_mismatch',
      reason: `projection_backing_drift: ${relPath} source_url does not match submitted source identity ${entryId}`,
      blockingBasis: 'binding_integrity',
      repairKind: 'agent_action',
      writeTo: `${resolvePath(bundlePath, relPath)}#metadata.source_url`,
      missingFact: `${relPath} source_url does not equal the authenticated submitted URL for ${entryId}.`,
    });
  }

  const requiredRefs = [
    backing.source_yaml_ref,
    ...backing.cache_trail_refs,
    backing.result_ref,
    backing.work_unit_ref,
  ];
  const missingRefs = requiredRefs.filter((ref) => !body.includes(ref));
  if (missingRefs.length > 0) {
    return referenceAuthorityFailure({
      authority: 'unbacked_projection',
      reasonCode: 'wave0_submitted_backing_refs_missing',
      reason: `projection_backing_drift: ${relPath} lacks scannable submitted Wave0 backing refs`,
      blockingBasis: 'required_structure',
      repairKind: 'agent_action',
      writeTo: resolvePath(bundlePath, relPath),
      missingFact: `${relPath} must cite the authenticated backing refs for ${entryId}: ${missingRefs.join(', ')}.`,
    });
  }

  return {
    authority: 'phase_owned_projection',
    passed: true,
    reason: `Phase-owned Wave0 shared reference is backed by submitted source identity ${entryId}: ${relPath}`,
    source_identity: {
      work_id: backing.work_id,
      entry_id: backing.entry_id,
      source_ordinal: backing.source_ordinal,
    },
  };
}

function urlsBound(urls, map) {
  if (urls.length === 0) return false;
  return urls.every((url) => map.has(normalizeUrl(url)));
}

function referenceAuthorityFailure({
  authority,
  reasonCode,
  reason,
  blockingBasis,
  repairKind,
  writeTo,
  missingFact,
}) {
  return {
    authority,
    passed: false,
    reason,
    reason_code: reasonCode,
    root_contract: {
      blocking_basis: blockingBasis,
      repair_kind: repairKind,
      write_to: writeTo,
      missing_fact: missingFact,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Reference Metadata Constants & Parser
// ═══════════════════════════════════════════════════════════════════════════

export const REQUIRED_REFERENCE_METADATA_FIELDS = [
  'source_url',
  'acceptance_status',
  'source_type',
  'tier',
  'evidence_role',
  'trust_level',
  'why_it_matters',
  'accessed_at',
];

export const REFERENCE_TOPIC_BINDING_FIELDS = ['related_topic_uid', 'related_topic'];

export const REQUIRED_REFERENCE_SECTIONS = [
  'Key Facts',
  'Core Content Capture',
  'Relevance To This Research',
  'Quotable Terms / Concepts',
  'Risks And Limitations',
];

const RAW_DOCUMENT_MARKUP_SIGNATURE = /<!doctype\b|<\/?(?:html|head|body|script|style|iframe)(?=[\s/>])/i;

function nonFencedMarkdown(content) {
  const visible = [];
  let fence = null;
  for (const line of String(content || '').split(/\r?\n/)) {
    if (!fence) {
      const opening = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
      if (opening) {
        fence = { marker: opening[1][0], length: opening[1].length };
        visible.push('');
        continue;
      }
      visible.push(line);
      continue;
    }
    const closing = line.match(/^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/);
    if (closing && closing[1][0] === fence.marker && closing[1].length >= fence.length) fence = null;
    visible.push('');
  }
  return visible.join('\n');
}

function hasRawDocumentMarkup(content) {
  return RAW_DOCUMENT_MARKUP_SIGNATURE.test(nonFencedMarkdown(content));
}

function metadataValueToString(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(metadataValueToString).filter(Boolean).join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim();
}

function legacyReferenceMetadata(mdContent) {
  const semanticNames = new Set(REQUIRED_REFERENCE_SECTIONS.map(normalizeMarkdownSemanticHeading));
  const firstSemanticSection = markdownSemanticSectionEntries(mdContent)
    .find((entry) => semanticNames.has(entry.name));
  const beforeFirstSection = firstSemanticSection
    ? String(mdContent || '').slice(0, firstSemanticSection.headingStart)
    : String(mdContent || '');
  const metadata = new Map();
  for (const line of beforeFirstSection.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*([A-Za-z0-9_]+):\s*(.*)$/);
    if (match) metadata.set(match[1], match[2].trim());
  }
  return metadata;
}

// @impl REF-002, REF-007
// The shared reader keeps writer presentation separate from metadata semantics:
// new references use an opening YAML mapping, while legacy bullet metadata
// remains a read-only compatibility input for all existing consumers.
/**
 * Build a frontmatter parse diagnostic that names the offending line.
 * The `yaml` parser message carries "at line N, column M"; extract line N and
 * echo the corresponding frontmatter line so the Agent can see the exact value
 * that broke serialization instead of only a generic "YAML parse failed".
 * @impl REF-010
 */
function frontmatterParseReason(content, error) {
  const message = String(error?.message || 'YAML parse error');
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const lines = fm ? fm[1].split(/\r?\n/) : [];
  const lineMatch = message.match(/at line (\d+)/);
  const lineNo = lineMatch ? Number(lineMatch[1]) : 0;
  const offending = lineNo > 0 && lineNo <= lines.length ? lines[lineNo - 1] : lines[lines.length - 1];
  const hint = String(offending || '').trim();
  const detail = hint
    ? `YAML parse failed: ${message}. Offending frontmatter line ${lineNo || lines.length}: "${hint}". Repair the opening YAML frontmatter mapping; quote YAML-sensitive values (for example "accepted :warning:").`
    : `YAML parse failed: ${message}. Repair the opening YAML frontmatter mapping; quote YAML-sensitive values.`;
  return detail;
}

export function readReferenceMetadata(mdContent) {
  const content = String(mdContent || '');
  if (!/^---(?:\r?\n|$)/.test(content)) {
    return { metadata: legacyReferenceMetadata(content), presentation: 'legacy_bullets', error: null };
  }

  if (!/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content)) {
    return {
      metadata: new Map(),
      presentation: 'frontmatter',
      error: {
        code: 'reference_metadata_frontmatter_invalid',
        reason: 'frontmatter boundary is missing or malformed',
      },
    };
  }

  let parsed;
  try {
    parsed = parseMdFrontmatter(content);
  } catch (error) {
    return {
      metadata: new Map(),
      presentation: 'frontmatter',
      error: {
        code: 'reference_metadata_frontmatter_invalid',
        reason: frontmatterParseReason(content, error),
      },
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      metadata: new Map(),
      presentation: 'frontmatter',
      error: {
        code: 'reference_metadata_frontmatter_invalid',
        reason: 'frontmatter must decode to one YAML mapping',
      },
    };
  }

  return {
    metadata: new Map(Object.entries(parsed).map(([key, value]) => [key, metadataValueToString(value)])),
    presentation: 'frontmatter',
    error: null,
  };
}

export function parseReferenceMetadata(mdContent) {
  return readReferenceMetadata(mdContent).metadata;
}

function referenceMetadataRootFinding(rule, file, error, { defaultRuleId = 'reference_format' } = {}) {
  const ruleId = rule?.id || defaultRuleId;
  const detail = `[reference_metadata_frontmatter_invalid] ${file.relPath}: ${error.reason}. Repair the opening YAML frontmatter mapping.`;
  return checkerFinding(rule, {
    defaultRuleId,
    id: `${ruleId}:${file.relPath}:metadata_frontmatter`,
    blockingBasis: 'required_structure',
    surface: file.absPath,
    expected: 'One opening YAML frontmatter mapping containing reference metadata.',
    observed: error.reason,
    missingFact: `${file.relPath} has invalid reference metadata frontmatter: ${error.reason}.`,
    repairKind: 'agent_action',
    writeTo: `${file.absPath}#frontmatter`,
    repair: `Repair the opening YAML frontmatter mapping in ${file.relPath}, then rerun this checkpoint.`,
    detail,
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// Reference Validation Checks
// ═══════════════════════════════════════════════════════════════════════════

export function checkReferenceFormatFiles(files, { rule = null, bundlePath = null } = {}) {
  const inspect = [];
  const findings = [];
  let layouts = null;
  if (bundlePath) {
    const plan = readBundlePlan(bundlePath);
    if (Array.isArray(plan?.topic_registry)) layouts = evaluateTopicLayouts(plan.topic_registry);
  }
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    const metadataRead = readReferenceMetadata(content);
    const metadata = metadataRead.metadata;
    if (metadataRead.error) {
      const finding = referenceMetadataRootFinding(rule, file, metadataRead.error);
      inspect.push(finding.detail);
      findings.push(finding);
    } else {
    for (const field of REQUIRED_REFERENCE_METADATA_FIELDS) {
      if (!metadata.has(field) || !metadata.get(field)) {
        const detail = `Missing required metadata "${field}" in ${file.relPath}`;
        inspect.push(detail);
        findings.push(checkerFinding(rule, {
          defaultRuleId: 'reference_format',
          id: `${rule?.id || 'reference_format'}:${file.relPath}:metadata:${field}`,
          blockingBasis: 'required_structure',
          surface: file.absPath,
          expected: `Non-empty reference metadata field '${field}'.`,
          observed: metadata.get(field) || null,
          missingFact: `${file.relPath} is missing required non-empty metadata field '${field}'.`,
          repairKind: 'agent_action',
          writeTo: `${file.absPath}#metadata.${field}`,
          repair: `Add non-empty metadata field '${field}' to ${file.relPath}.`,
          detail,
        }));
      }
    }
    const binding = layouts
      ? resolveReferenceTopicBinding(layouts, metadata)
      : REFERENCE_TOPIC_BINDING_FIELDS.some((field) => Boolean(metadata.get(field)))
        ? { ok: true }
        : { ok: false, reason_code: 'reference_topic_binding_missing' };
    if (!binding.ok) {
      const reason = binding.reason_code || 'reference_topic_binding_invalid';
      const detail = `Invalid reference topic binding in ${file.relPath}: ${reason}`;
      const writeField = reason === 'reference_topic_binding_conflict'
        ? 'related_topic_uid,related_topic'
        : metadata.get('related_topic_uid')
          ? 'related_topic_uid'
          : 'related_topic';
      inspect.push(detail);
      findings.push(checkerFinding(rule, {
        defaultRuleId: 'reference_format',
        id: `${rule?.id || 'reference_format'}:${file.relPath}:topic_binding:${reason}`,
        blockingBasis: 'binding_integrity',
        surface: file.absPath,
        expected: 'One resolvable reference topic binding: exact registered related_topic_uid or compatible exact related_topic id/slug list; dual forms must agree.',
        observed: {
          related_topic_uid: metadata.get('related_topic_uid') || null,
          related_topic: metadata.get('related_topic') || null,
          reason_code: reason,
        },
        missingFact: reason === 'reference_topic_binding_conflict'
          ? `${file.relPath} has conflicting related_topic_uid and related_topic bindings.`
          : `${file.relPath} topic binding is not resolvable: ${reason}.`,
        repairKind: 'agent_action',
        writeTo: `${file.absPath}#metadata.${writeField}`,
        repair: `Repair the reference topic binding in ${file.relPath} to one exact registered UID or compatible current/previous id or slug, then rerun this checkpoint.`,
        detail,
      }));
    }
    }
    for (const section of REQUIRED_REFERENCE_SECTIONS) {
      const sectionContent = extractSection(content, section);
      if (!sectionContent) {
        const detail = `Missing or empty section "## ${section}" in ${file.relPath}`;
        inspect.push(detail);
        findings.push(checkerFinding(rule, {
          defaultRuleId: 'reference_format',
          id: `${rule?.id || 'reference_format'}:${file.relPath}:section:${section}`,
          blockingBasis: 'required_structure',
          surface: file.absPath,
          expected: `Non-empty semantic section '${section}'.`,
          observed: 'missing or empty',
          missingFact: `${file.relPath} is missing the non-empty semantic section '${section}'.`,
          repairKind: 'agent_action',
          writeTo: `${file.absPath}#section:${section}`,
          repair: `Add non-empty semantic section '${section}' to ${file.relPath}.`,
          detail,
        }));
      } else if (hasRawDocumentMarkup(sectionContent)) {
        const detail = `Raw document markup in section "${section}" in ${file.relPath}`;
        inspect.push(detail);
        findings.push(checkerFinding(rule, {
          defaultRuleId: 'reference_format',
          id: `${rule?.id || 'reference_format'}:${file.relPath}:section:${section}:document_markup`,
          blockingBasis: 'required_structure',
          surface: file.absPath,
          expected: `Interpreted Markdown facts without raw document-markup signatures in semantic section '${section}'.`,
          observed: 'raw document-markup signature',
          missingFact: `${file.relPath} section '${section}' contains copied raw document markup.`,
          repairKind: 'agent_action',
          writeTo: `${file.absPath}#section:${section}`,
          repair: `Replace copied document markup in ${file.relPath} section '${section}' with interpreted Markdown facts, then rerun this checkpoint.`,
          detail,
        }));
      }
    }
  }
  return { passed: inspect.length === 0, inspect, findings };
}

export function checkReferenceSourceUrls(files, { rule = null } = {}) {
  const inspect = [];
  const findings = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    const metadataRead = readReferenceMetadata(content);
    if (metadataRead.error) {
      const finding = referenceMetadataRootFinding(rule, file, metadataRead.error, {
        defaultRuleId: 'reference_source_url_parseable',
      });
      inspect.push(finding.detail);
      findings.push(finding);
      continue;
    }
    const metadata = metadataRead.metadata;
    const sourceUrl = metadata.get('source_url') || '';
    if (!sourceUrl) {
      const detail = `Missing metadata source_url in ${file.relPath}`;
      inspect.push(detail);
      findings.push(checkerFinding(rule, {
        defaultRuleId: 'reference_source_url_parseable',
        id: `${rule?.id || 'reference_source_url_parseable'}:${file.relPath}:missing`,
        blockingBasis: 'required_structure',
        surface: file.absPath,
        expected: 'At least one parseable http(s) source_url metadata value.',
        observed: null,
        missingFact: `${file.relPath} has no source_url metadata value.`,
        repairKind: 'agent_action',
        writeTo: `${file.absPath}#metadata.source_url`,
        repair: `Add the real source URL to source_url in ${file.relPath}.`,
        detail,
      }));
      continue;
    }
    const urls = sourceUrl.split(';').map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      const detail = `Empty metadata source_url in ${file.relPath}`;
      inspect.push(detail);
      findings.push(checkerFinding(rule, {
        defaultRuleId: 'reference_source_url_parseable',
        id: `${rule?.id || 'reference_source_url_parseable'}:${file.relPath}:empty`,
        blockingBasis: 'required_structure',
        surface: file.absPath,
        expected: 'At least one parseable http(s) source_url metadata value.',
        observed: sourceUrl,
        missingFact: `${file.relPath} has an empty source_url metadata value.`,
        repairKind: 'agent_action',
        writeTo: `${file.absPath}#metadata.source_url`,
        repair: `Add the real source URL to source_url in ${file.relPath}.`,
        detail,
      }));
      continue;
    }
    for (const url of urls) {
      try {
        new URL(url);
      } catch {
        const detail = `Invalid metadata source_url in ${file.relPath}: ${url}`;
        inspect.push(detail);
        findings.push(checkerFinding(rule, {
          defaultRuleId: 'reference_source_url_parseable',
          id: `${rule?.id || 'reference_source_url_parseable'}:${file.relPath}:invalid:${url}`,
          blockingBasis: 'authority_integrity',
          surface: file.absPath,
          expected: 'A URL-parseable http(s) source_url metadata value.',
          observed: url,
          missingFact: `${file.relPath} source_url '${url}' is not URL-parseable.`,
          repairKind: 'agent_action',
          writeTo: `${file.absPath}#metadata.source_url`,
          repair: `Replace the invalid source_url in ${file.relPath} with the real parseable source URL.`,
          detail,
        }));
      }
    }
  }
  return { passed: inspect.length === 0, inspect, findings };
}

/**
 * Classify a reference artifact by deterministic backing surfaces.
 *
 * @impl REF-008, WPG-012, RWG-017
 */
export function classifyReferenceAuthority(bundlePath, file) {
  const relPath = typeof file === 'string' ? file : file?.relPath;
  const absPath = typeof file === 'string' ? join(bundlePath, file) : file?.absPath;

  if (!relPath || !isSafeBundleRef(relPath)) {
    return referenceAuthorityFailure({
      authority: 'unbacked',
      reasonCode: 'unsafe_reference_path',
      reason: `unsafe_reference_path: ${relPath || '<missing>'}`,
      blockingBasis: 'authority_integrity',
      repairKind: 'missing_contract',
      writeTo: 'Reference path-safety contract boundary',
      missingFact: `Reference path '${relPath || '<missing>'}' is absent or unsafe for bundle-relative resolution.`,
    });
  }

  let index;
  try {
    index = submittedBackingIndex(bundlePath);
  } catch (error) {
    return referenceAuthorityFailure({
      authority: 'unbacked',
      reasonCode: 'submitted_backing_ledger_invalid',
      reason: `projection_backing_drift: submitted backing ledger is invalid for ${relPath}: ${error.message}`,
      blockingBasis: 'authority_integrity',
      repairKind: 'missing_contract',
      writeTo: `Submitted declaration integrity boundary for ${resolvePath(bundlePath, 'rb_output_declarations.jsonl')}`,
      missingFact: `Submitted backing ledger cannot be validated for ${relPath}: ${error.message}`,
    });
  }

  if (index.referenceOutputs.has(relPath)) {
    return {
      authority: 'delegated_fetched_evidence',
      passed: true,
      reason: `reference declared by submitted work-unit output: ${relPath}`,
      row: index.referenceOutputs.get(relPath),
    };
  }
  if (!absPath || !existsSync(absPath)) {
    return referenceAuthorityFailure({
      authority: 'unbacked',
      reasonCode: 'reference_file_missing',
      reason: `reference file missing: ${relPath}`,
      blockingBasis: 'required_structure',
      repairKind: 'agent_action',
      writeTo: resolvePath(bundlePath, relPath),
      missingFact: `Reference projection ${relPath} is missing.`,
    });
  }

  const content = readFileSync(absPath, 'utf-8');
  const metadataRead = readReferenceMetadata(content);
  if (metadataRead.error) {
    return referenceAuthorityFailure({
      authority: 'unbacked',
      reasonCode: metadataRead.error.code,
      reason: `projection_backing_drift: ${relPath} has invalid reference metadata frontmatter: ${metadataRead.error.reason}`,
      blockingBasis: 'required_structure',
      repairKind: 'agent_action',
      writeTo: `${resolvePath(bundlePath, relPath)}#frontmatter`,
      missingFact: `${relPath} has invalid reference metadata frontmatter needed to bind submitted source backing.`,
    });
  }
  const metadata = metadataRead.metadata;
  const sourceUrls = sourceUrlsFromMetadata(metadata);
  if (sourceUrls.length === 0) {
    return referenceAuthorityFailure({
      authority: 'unbacked',
      reasonCode: 'reference_source_url_missing',
      reason: `projection_backing_drift: ${relPath} lacks source_url metadata`,
      blockingBasis: 'required_structure',
      repairKind: 'agent_action',
      writeTo: `${resolvePath(bundlePath, relPath)}#metadata.source_url`,
      missingFact: `${relPath} lacks source_url metadata needed to bind submitted source backing.`,
    });
  }

  if (isWave1TopicReference(relPath)) {
    if (!urlsBound(sourceUrls, index.acceptedUrls)) {
      return referenceAuthorityFailure({
        authority: 'unbacked_projection',
        reasonCode: 'submitted_source_backing_missing',
        reason: `projection_backing_drift: ${relPath} source_url is absent from submitted source claims, accepted source URL surfaces, cache trails, and degraded-capture backing`,
        blockingBasis: 'binding_integrity',
        repairKind: 'engine_operation',
        writeTo: `operate-work-unit claim/submit path for source backing of ${relPath}`,
        missingFact: `${relPath} source_url is not present on submitted source/cache/degraded backing authority.`,
      });
    }
    if (!bodyHasSubmittedBackingRef(content, index)) {
      return referenceAuthorityFailure({
        authority: 'unbacked_projection',
        reasonCode: 'reference_body_backing_ref_missing',
        reason: `projection_backing_drift: ${relPath} lacks scannable body refs to submitted source/cache/work-unit backing`,
        blockingBasis: 'required_structure',
        repairKind: 'agent_action',
        writeTo: resolvePath(bundlePath, relPath),
        missingFact: `${relPath} does not cite the submitted source/cache/work-unit backing it projects.`,
      });
    }
    return {
      authority: 'phase_owned_projection',
      passed: true,
      reason: `Phase-owned topic reference is backed by submitted source/cache/work-unit surfaces: ${relPath}`,
    };
  }

  if (isWave2CrossReference(relPath)) {
    if (urlsBound(sourceUrls, index.targetedAcceptedUrls)) {
      return {
        authority: 'delegated_fetched_evidence',
        passed: true,
        reason: `Wave2 cross reference source_url binds to submitted targeted evidence backing: ${relPath}`,
      };
    }
    if (!urlsBound(sourceUrls, index.priorAcceptedUrls)) {
      return referenceAuthorityFailure({
        authority: 'unbacked_projection',
        reasonCode: 'wave2_source_backing_missing',
        reason: `projection_backing_drift: ${relPath} source_url is not a prior accepted backing URL and no submitted targeted evidence backs it`,
        blockingBasis: 'binding_integrity',
        repairKind: 'engine_operation',
        writeTo: `operate-work-unit claim/submit path for Wave2 source backing of ${relPath}`,
        missingFact: `${relPath} is not bound to prior accepted backing or submitted Wave2 targeted evidence.`,
      });
    }
    if (!bodyHasWave2ProcessRefs(content)) {
      return referenceAuthorityFailure({
        authority: 'unbacked_projection',
        reasonCode: 'wave2_process_refs_missing',
        reason: `projection_backing_drift: ${relPath} lacks W2F-xxx plus finding-index/cross-topic-ledger refs`,
        blockingBasis: 'required_structure',
        repairKind: 'agent_action',
        writeTo: resolvePath(bundlePath, relPath),
        missingFact: `${relPath} lacks its W2F finding id and finding-index/cross-topic-ledger process refs.`,
      });
    }
    if (!bodyHasSubmittedBackingRef(content, index)) {
      return referenceAuthorityFailure({
        authority: 'unbacked_projection',
        reasonCode: 'wave2_submitted_locator_missing',
        reason: `projection_backing_drift: ${relPath} locator refs do not resolve to submitted prior-wave backing`,
        blockingBasis: 'binding_integrity',
        repairKind: 'agent_action',
        writeTo: resolvePath(bundlePath, relPath),
        missingFact: `${relPath} locator refs do not identify submitted prior-wave backing.`,
      });
    }
    return {
      authority: 'phase_owned_projection',
      passed: true,
      reason: `Existing-backed Wave2 cross reference is a Phase-owned projection: ${relPath}`,
    };
  }

  if (isWave0SharedReference(relPath)) {
    return classifyWave0SharedProjection(bundlePath, relPath, content, sourceUrls);
  }

  return referenceAuthorityFailure({
    authority: 'delegated_bypass',
    reasonCode: 'delegated_bypass',
    reason: `delegated_bypass: ${relPath} is not a legal Phase-owned projection and is absent from submitted work-unit reference outputs`,
    blockingBasis: 'binding_integrity',
    repairKind: 'engine_operation',
    writeTo: `operate-work-unit claim/submit path for ${relPath}`,
    missingFact: `${relPath} is neither a legal Phase-owned projection nor a submitted work-unit reference output.`,
  });
}

export function checkReferenceLedgerCoverage(bundlePath, files, { rule = null } = {}) {
  const declared = getDeclaredReferencePaths(bundlePath);
  const missing = [];
  const findings = [];
  for (const file of files) {
    if (declared.has(file.relPath)) continue;
    const classification = classifyReferenceAuthority(bundlePath, file);
    if (!classification.passed) {
      missing.push(`${file.relPath}: ${classification.reason}`);
      const root = classification.root_contract || {};
      findings.push(checkerFinding(rule, {
        defaultRuleId: 'reference_ledger_coverage',
        id: `${rule?.id || 'reference_ledger_coverage'}:${file.relPath}:${classification.reason_code || 'unbacked'}`,
        blockingBasis: root.blocking_basis || 'binding_integrity',
        surface: file.absPath || resolvePath(bundlePath, file.relPath),
        expected: 'Reference projection is declared by a submitted work-unit output or has accepted Phase-owned submitted backing.',
        observed: { authority: classification.authority, reason_code: classification.reason_code || null },
        missingFact: root.missing_fact || `${file.relPath} lacks accepted submitted backing.`,
        repairKind: root.repair_kind || 'missing_contract',
        writeTo: root.write_to || `Reference submitted-backing contract boundary for ${file.relPath}`,
        repair: `Repair ${file.relPath} through the action named by its submitted-backing root, then rerun the same checkpoint.`,
        detail: `Reference file lacks submitted backing: ${file.relPath}: ${classification.reason}`,
      }));
    }
  }
  return {
    passed: missing.length === 0,
    inspect: missing.map((detail) => `Reference file lacks submitted backing: ${detail}`),
    findings,
  };
}

export function checkReferenceIndexCoverage(bundlePath, files, { sourceLayer = null, rule = null } = {}) {
  const index = readReferenceIndexRows(bundlePath);
  const inspect = [];
  const findings = [];
  const indexPath = resolvePath(bundlePath, 'reference/_INDEX.md');
  if (!index.exists) {
    if (files.length > 0) inspect.push(`[missing_index_row] reference/_INDEX.md is missing for ${files.length} materialized reference file(s)`);
    if (files.length > 0) findings.push(checkerFinding(rule, {
      defaultRuleId: 'reference_index_coverage',
      id: `${rule?.id || 'reference_index_coverage'}:index_missing`,
      blockingBasis: 'required_structure',
      surface: indexPath,
      expected: 'reference/_INDEX.md exists and contains navigation rows for materialized references.',
      observed: { exists: false, materialized_reference_count: files.length },
      missingFact: `reference/_INDEX.md is missing while ${files.length} materialized reference file(s) require navigation rows.`,
      repairKind: 'agent_action',
      writeTo: indexPath,
      repair: 'Create reference/_INDEX.md with the accepted navigation table and rows, then rerun this checkpoint.',
      detail: inspect[0],
    }));
    return {
      passed: inspect.length === 0,
      inspect,
      advice: inspect.length > 0 ? ['Create reference/_INDEX.md and add one row per materialized reference projection.'] : [],
      findings,
    };
  }

  if (files.length === 0) {
    return { passed: true, inspect: [], advice: [], findings: [] };
  }

  if (!index.valid) {
    const detail = `[reference_index_table_invalid] reference/_INDEX.md does not satisfy the accepted eight-column table contract: ${index.errors.join('; ')}`;
    inspect.push(detail);
    findings.push(checkerFinding(rule, {
      defaultRuleId: 'reference_index_coverage',
      id: `${rule?.id || 'reference_index_coverage'}:index_table_invalid`,
      blockingBasis: 'required_structure',
      surface: indexPath,
      expected: 'A parseable reference/_INDEX.md table with all eight accepted columns and at least one data row.',
      observed: { errors: index.errors },
      missingFact: `reference/_INDEX.md parent table is invalid: ${index.errors.join('; ')}.`,
      repairKind: 'agent_action',
      writeTo: indexPath,
      repair: 'Repair the accepted eight-column reference index table, then rerun this checkpoint before evaluating per-file rows.',
      detail,
    }));
    return {
      passed: false,
      inspect,
      advice: ['Repair the reference/_INDEX.md table parent before per-file navigation rows are evaluated.'],
      findings,
    };
  }

  for (const file of files) {
    const row = index.rowByFile.get(file.relPath);
    if (!row) {
      const detail = `[missing_index_row] ${file.relPath}: no matching reference/_INDEX.md row`;
      inspect.push(detail);
      findings.push(checkerFinding(rule, {
        defaultRuleId: 'reference_index_coverage',
        id: `${rule?.id || 'reference_index_coverage'}:${file.relPath}:missing_row`,
        blockingBasis: 'required_structure',
        surface: indexPath,
        expected: `One reference/_INDEX.md row for ${file.relPath}.`,
        observed: null,
        missingFact: `reference/_INDEX.md has no row for materialized reference ${file.relPath}.`,
        repairKind: 'agent_action',
        writeTo: `${indexPath}#row:${file.relPath}`,
        repair: `Add the missing navigation row for ${file.relPath}.`,
        detail,
      }));
      continue;
    }
    if (sourceLayer && row.source_layer !== sourceLayer) {
      const detail = `[missing_index_row] ${file.relPath}: reference/_INDEX.md source_layer is "${row.source_layer || '<missing>'}", expected "${sourceLayer}"`;
      inspect.push(detail);
      findings.push(checkerFinding(rule, {
        defaultRuleId: 'reference_index_coverage',
        id: `${rule?.id || 'reference_index_coverage'}:${file.relPath}:source_layer`,
        blockingBasis: 'binding_integrity',
        surface: indexPath,
        expected: { ref_file: file.relPath, source_layer: sourceLayer },
        observed: { source_layer: row.source_layer || null },
        missingFact: `reference/_INDEX.md row for ${file.relPath} has source_layer '${row.source_layer || '<missing>'}', expected '${sourceLayer}'.`,
        repairKind: 'agent_action',
        writeTo: `${indexPath}#row:${file.relPath}/source_layer`,
        repair: `Correct the source_layer cell for ${file.relPath} in reference/_INDEX.md.`,
        detail,
      }));
    }
  }

  return {
    passed: inspect.length === 0,
    inspect,
    advice: inspect.length > 0
      ? ['Repair reference/_INDEX.md rows for consumer navigation. source_layer is a navigation label only; submitted backing still determines authority.']
      : [],
    findings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// cache_coverage Gate Check
// ═══════════════════════════════════════════════════════════════════════════

export function checkCacheCoverage(bundlePath, { rule = null } = {}) {
  let declarations;
  try {
    declarations = readSubmittedWorkUnitDeclarations(bundlePath);
  } catch (error) {
    const detail = `[cache_coverage] FAIL: invalid submitted work-unit ledger: ${error.message}`;
    return {
      passed: false,
      inspect: [detail],
      advice: ['Repair work-unit submit/index/ledger drift before rerunning the gate.'],
      findings: [checkerFinding(rule, {
        defaultRuleId: 'cache_coverage',
        id: `${rule?.id || 'cache_coverage'}:submitted_ledger_invalid`,
        blockingBasis: 'authority_integrity',
        surface: resolvePath(bundlePath, 'rb_output_declarations.jsonl'),
        expected: 'Schema-valid, hash-valid submitted work-unit declaration rows.',
        observed: error.message,
        missingFact: `Submitted work-unit ledger is invalid while checking cache coverage: ${error.message}`,
        repairKind: 'missing_contract',
        writeTo: `Submitted declaration integrity boundary for ${resolvePath(bundlePath, 'rb_output_declarations.jsonl')}`,
        repair: 'Restore submitted declaration integrity through its Engine owner before rerunning this checkpoint.',
        detail,
      })],
    };
  }
  const inspect = [];
  const advice = [];
  const findings = [];
  let passed = true;

  function readMeta(trail) {
    try {
      const metaPath = join(bundlePath, trail, 'meta.json');
      if (!existsSync(metaPath)) return null;
      return JSON.parse(readFileSync(metaPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  function cacheContentIssue(trail) {
    const pagePath = join(bundlePath, trail, 'page.md');
    const pageText = existsSync(pagePath) ? readFileSync(pagePath, 'utf-8') : '';
    const meta = readMeta(trail);
    return inspectCacheLeaf({ availableFiles: CACHE_BASE_LEAF_FILES, pageText, meta }).issue;
  }

  if (declarations.length === 0) {
    const rawDeclarations = readOutputDeclarations(bundlePath);
    const rawReferenceRows = rawDeclarations.filter((decl) => (decl.output_files || []).some((f) => f.role === 'reference'));
    if (rawReferenceRows.length > 0) {
      const detail = '[cache_coverage] FAIL: reference output declarations exist but none are submitted work-unit ledger rows';
      return {
        passed: false,
        inspect: [detail],
        advice: ['Submit delegated reference outputs through operate-work-unit so cache coverage can validate Engine-written cache trails.'],
        findings: [checkerFinding(rule, {
          defaultRuleId: 'cache_coverage',
          id: `${rule?.id || 'cache_coverage'}:submitted_rows_missing`,
          blockingBasis: 'binding_integrity',
          surface: resolvePath(bundlePath, 'rb_output_declarations.jsonl'),
          expected: 'Reference output declarations are Engine-written submitted work-unit rows with cache trails.',
          observed: { raw_reference_rows: rawReferenceRows.length, submitted_rows: 0 },
          missingFact: `${rawReferenceRows.length} reference declaration row(s) are not submitted work-unit ledger rows, so cache coverage has no accepted authority.`,
          repairKind: 'engine_operation',
          writeTo: 'operate-work-unit claim/submit path for the affected reference outputs',
          repair: 'Execute the delegated reference work through a legal claimed work unit and formal submit.',
          detail,
        })],
      };
    }
    return { passed: true, inspect, advice, findings }; // Nothing to check
  }

  for (const decl of declarations) {
    const refOutputs = (decl.output_files || []).filter(f => f.role === 'reference');
    if (refOutputs.length === 0) continue;

    // Derive a stable identifier: prefer work_id, fall back to first reference path
    const declId = decl.work_id || (refOutputs[0]?.path ? `record for ${refOutputs[0].path}` : 'unknown');

    const cacheTrails = decl.cache_trails || [];

    // ── Phase 1: empty cache_trails → warning only ──
    if (cacheTrails.length === 0) {
      for (const ref of refOutputs) {
        const detail = `[cache_coverage] WARNING (Phase 1): ${declId} has empty cache_trails for reference ${ref.path} — gap will become fail in Phase 2`;
        inspect.push(detail);
        findings.push(makeContractFinding({
          id: `${rule?.id || 'cache_coverage'}:${declId}:${ref.path}:empty_cache_trails`,
          ruleId: rule?.id || 'cache_coverage',
          classification: 'advisory',
          surface: resolvePath(bundlePath, ref.path),
          detail,
          repair: `Ensure the next accepted work-unit submit for ${ref.path} declares verified cache trails.`,
        }));
      }
      advice.push('Empty cache_trails on a submitted work-unit reference output — ensure the work-unit result declares verified _cache/ leaves before submit.');
      continue;
    }

    // ── Non-empty: verify each trail exists with 3 files ──
    const missingTrails = [];
    const validTrails = [];
    for (const trail of cacheTrails) {
      const trailDir = join(bundlePath, trail);
      if (!existsSync(trailDir)) {
        missingTrails.push({ trail, reason: 'directory missing' });
        continue;
      }
      const missingFiles = [];
      for (const f of CACHE_BASE_LEAF_FILES) {
        if (!existsSync(join(trailDir, f))) missingFiles.push(f);
      }
      if (missingFiles.length > 0) {
        missingTrails.push({ trail, reason: `missing files: ${missingFiles.join(', ')}` });
        continue;
      }
      const contentIssue = cacheContentIssue(trail);
      if (contentIssue) {
        missingTrails.push({ trail, reason: `incomplete cache content: ${contentIssue}` });
        continue;
      }
      validTrails.push(trail);
    }

    if (missingTrails.length > 0) {
      passed = false;
      for (const mt of missingTrails) {
        const detail = `[cache_coverage] FAIL: ${declId}: cache trail ${mt.trail} — ${mt.reason}`;
        inspect.push(detail);
        findings.push(checkerFinding(rule, {
          defaultRuleId: 'cache_coverage',
          id: `${rule?.id || 'cache_coverage'}:${declId}:${mt.trail}`,
          blockingBasis: 'binding_integrity',
          surface: resolvePath(bundlePath, mt.trail),
          expected: { required_files: CACHE_BASE_LEAF_FILES, submitted_work_unit: declId },
          observed: mt.reason,
          missingFact: `Submitted work unit ${declId} cache trail ${mt.trail} is invalid: ${mt.reason}.`,
          repairKind: 'engine_operation',
          writeTo: `operate-work-unit retry/submit boundary for ${declId} and cache trail ${mt.trail}`,
          repair: `Repair or rerun work unit ${declId} so formal submit records a complete cache leaf at ${mt.trail}.`,
          detail,
        }));
      }
      advice.push(`Cache trail(s) missing for ${declId}. Re-run or repair the work unit so submit records complete cache leaves.`);
    }

    // ── Per-reference mapping: each reference must map to at least one valid trail ──
    for (const ref of refOutputs) {
      let mapped = false;
      for (const trail of validTrails) {
        // Try meta.json.url match
        try {
          const metaPath = join(bundlePath, trail, 'meta.json');
          if (existsSync(metaPath)) {
            const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
            const mapping = cacheLeafMapping(meta);
            if (ref.source_url && mapping.urls.some((url) => normalizeUrl(url) === normalizeUrl(ref.source_url))) {
              mapped = true;
              break;
            }
          }
        } catch { /* meta.json unreadable — skip this trail */ }

        // Try source_slug match from output_files entry
        if (ref.source_slug) {
          const trailBasename = basename(trail);
          if (trailBasename.includes(ref.source_slug)) {
            mapped = true;
            break;
          }
        }

        // Try filename qualifier match (reference filename stem vs trail slug)
        if (ref.path) {
          const refStem = basename(ref.path).replace(/\.md$/, '');
          const trailBasename = basename(trail);
          // Check if trail contains ref stem or ref stem appears in trail components
          if (trailBasename.includes(refStem) || refStem.includes(trailBasename)) {
            mapped = true;
            break;
          }
        }
      }

      if (!mapped && validTrails.length > 0) {
        passed = false;
        const required = CACHE_BASE_LEAF_FILES.join(', ');
        const mappingFields = `${CACHE_SOURCE_MAPPING_FIELDS.slice(0, -1).join('/')} or ${CACHE_SOURCE_MAPPING_FIELDS.at(-1)}`;
        const detail = `[cache_coverage] FAIL: ${declId}: reference ${ref.path} (source_url: ${ref.source_url || 'none'}) not mapped to any valid cache trail. Mapping uses meta.json.${mappingFields}. Required cache leaf files: ${required}.`;
        inspect.push(detail);
        advice.push(`Reference ${ref.path} has no cache trail mapping. Ensure the submitted work-unit result includes a matching _cache/ leaf via meta.json.${mappingFields}, with ${required}.`);
        findings.push(checkerFinding(rule, {
          defaultRuleId: 'cache_coverage',
          id: `${rule?.id || 'cache_coverage'}:${declId}:${ref.path}:mapping`,
          blockingBasis: 'binding_integrity',
          surface: resolvePath(bundlePath, ref.path),
          expected: `Reference source URL or source slug maps to one submitted valid cache trail via meta.json.${mappingFields}.`,
          observed: { source_url: ref.source_url || null, valid_cache_trails: validTrails },
          missingFact: `Submitted reference ${ref.path} from ${declId} is not mapped to any valid submitted cache trail.`,
          repairKind: 'engine_operation',
          writeTo: `operate-work-unit retry/submit boundary for ${declId} cache mapping of ${ref.path}`,
          repair: `Repair or rerun work unit ${declId} with a matching cache leaf and meta.json source mapping.`,
          detail,
        }));
      } else if (!mapped && validTrails.length === 0) {
        // Already reported as missing trail above — don't double-report
      }
    }
  }

  return { passed, inspect, advice, findings };
}
