import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

export const RETURN_MAP_FIELDS = ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop'];
export const RETURN_MAP_RELATIONSHIPS = ['supports', 'refutes', 'partial', 'opens', 'defers', 'context'];
export const RETURN_MAP_STATUS_LABELS = ['supported', 'refuted', 'partial', 'open', 'emergent', 'deferred'];

const FIELD_PATTERNS = {
  evidence_meaning: /\bevidence_meaning\s*:/i,
  relationship: /\brelationship\s*:/i,
  refs: /\brefs\s*:/i,
  status: /\bstatus\s*:/i,
  next_hop: /\bnext_hop\s*:/i,
};

function readText(absPath) {
  if (!existsSync(absPath)) return null;
  return readFileSync(absPath, 'utf-8');
}

function hasBackfillToken(content) {
  return /__BACKFILL_[A-Z0-9_]+__/.test(content || '');
}

function hasNakedEvidenceList(content) {
  const lines = String(content || '').split(/\r?\n/);
  const evidenceLines = lines.filter((line) =>
    /^\s*[-*]\s+(?:https?:\/\/|\[[^\]]+\]\([^)]+\)|reference\/|artifacts\/|_cache\/|_work_units\/)/i.test(line)
  ).length;
  return evidenceLines >= 2;
}

function hasUnsupportedProse(content) {
  const body = String(content || '').replace(/^---[\s\S]*?---\s*/m, '').trim();
  if (body.length < 80) return false;
  const hasAnyPath = /\b(?:reference|artifacts|_cache|_work_units|seed_topics)\//.test(body);
  const hasMapField = RETURN_MAP_FIELDS.some((field) => FIELD_PATTERNS[field].test(body));
  return !hasAnyPath && !hasMapField;
}

export function validateReturnMapContent(content, relPath, {
  requireFields = RETURN_MAP_FIELDS,
  requireFindingId = false,
  requireWave1Refs = false,
  requireWave2Refs = false,
} = {}) {
  const inspect = [];
  const advice = [];
  const text = String(content || '');
  const missingFields = requireFields.filter((field) => !FIELD_PATTERNS[field].test(text));

  if (missingFields.length > 0) {
    inspect.push(`[return_map_missing_fields] ${relPath}: missing ${missingFields.join(', ')}; return-map checks are diagnostic-only and do not establish or revoke gate coverage.`);
    advice.push(`Add return-map entries to ${relPath} with evidence_meaning, relationship, refs, status, and next_hop. Keep refs bundle-relative and repair through normal work-unit/gate paths; do not bypass phase status or user-surface.`);
  }

  if (/\brelationship\s*:/i.test(text)) {
    const relationshipLines = text.match(/relationship\s*:\s*([^\n\r]+)/gi) || [];
    for (const line of relationshipLines) {
      const value = line.split(':').slice(1).join(':').trim().toLowerCase().replace(/[`"'.,;]+$/g, '');
      if (value && !RETURN_MAP_RELATIONSHIPS.some((allowed) => value.includes(allowed))) {
        inspect.push(`[return_map_relationship] ${relPath}: relationship should use supports/refutes/partial/opens/defers/context, got "${value}".`);
      }
    }
  }

  if (/\bstatus\s*:/i.test(text)) {
    const statusLines = text.match(/status\s*:\s*([^\n\r]+)/gi) || [];
    for (const line of statusLines) {
      const value = line.split(':').slice(1).join(':').trim().toLowerCase().replace(/[`"'.,;]+$/g, '');
      if (value && !RETURN_MAP_STATUS_LABELS.some((allowed) => value.includes(allowed))) {
        inspect.push(`[return_map_status] ${relPath}: status should use supported/refuted/partial/open/emergent/deferred, got "${value}".`);
      }
    }
  }

  if (hasNakedEvidenceList(text) && missingFields.length > 0) {
    inspect.push(`[return_map_naked_evidence_list] ${relPath}: evidence paths/URLs appear without the minimum return-map fields.`);
  }

  if (hasUnsupportedProse(text)) {
    inspect.push(`[return_map_unsupported_prose] ${relPath}: prose conclusion lacks bundle-relative refs and return-map fields.`);
  }

  if (requireFindingId && !/\bW2F-\d{3,}\b/.test(text)) {
    inspect.push(`[return_map_missing_finding_id] ${relPath}: Wave2 backfill should preserve W2F-xxx finding ids.`);
    advice.push(`Add W2F-xxx ids in ${relPath} and link them to artifacts/wave2/finding-index.yaml and artifacts/wave2/cross-topic-ledger.md.`);
  }

  if (requireWave1Refs && !/\b(?:artifacts\/wave1\/[^/\s]+\/(?:evidence-summary|question-list)\.md|reference\/[^)\s]+\.md|_cache\/|_work_units\/)/.test(text)) {
    inspect.push(`[return_map_missing_wave1_refs] ${relPath}: Wave1 backfill should point to evidence-summary.md, question-list.md, reference, cache, or work-unit surfaces.`);
  }

  if (requireWave2Refs && !/\b(?:artifacts\/wave2\/(?:cross-topic-ledger\.md|finding-index\.yaml)|finding-index\.yaml|cross-topic-ledger\.md)/.test(text)) {
    inspect.push(`[return_map_missing_wave2_refs] ${relPath}: Wave2 backfill should link to cross-topic-ledger.md and finding-index.yaml.`);
  }

  return {
    passed: inspect.length === 0,
    inspect,
    advice,
    missingFields,
    diagnosticOnly: true,
  };
}

export function inspectSeedTopicReturnMaps(bundlePath, {
  wave,
  topicSlugs = [],
} = {}) {
  const inspect = [];
  const advice = [];
  const seedDir = join(bundlePath, 'seed_topics');
  if (!existsSync(seedDir)) {
    return { passed: true, inspect, advice, diagnosticOnly: true };
  }

  const files = topicSlugs.length > 0
    ? topicSlugs.map((slug) => `${slug}.md`)
    : readdirSync(seedDir).filter((file) => file.endsWith('.md'));

  for (const file of files) {
    const relPath = `seed_topics/${file}`;
    const content = readText(join(seedDir, file));
    if (content === null || hasBackfillToken(content)) continue;

    const validation = validateReturnMapContent(content, relPath, {
      requireFindingId: wave === 'wave2',
      requireWave1Refs: wave === 'wave1',
      requireWave2Refs: wave === 'wave2',
    });
    inspect.push(...validation.inspect);
    advice.push(...validation.advice);
  }

  return { passed: inspect.length === 0, inspect, advice, diagnosticOnly: true };
}

export function inspectWaveArtifactReturnMaps(bundlePath, wave, topicSlugs = []) {
  const inspect = [];
  const advice = [];

  if (wave === 'wave1') {
    for (const topic of topicSlugs) {
      for (const file of ['evidence-summary.md', 'question-list.md']) {
        const relPath = `artifacts/wave1/${topic}/${file}`;
        const content = readText(join(bundlePath, relPath));
        if (content === null) continue;
        const validation = validateReturnMapContent(content, relPath, { requireWave1Refs: true });
        inspect.push(...validation.inspect);
        advice.push(...validation.advice);
      }
    }
  }

  if (wave === 'wave2') {
    for (const file of ['cross-topic-ledger.md', 'synthesis.md']) {
      const relPath = `artifacts/wave2/${file}`;
      const content = readText(join(bundlePath, relPath));
      if (content === null) continue;
      const validation = validateReturnMapContent(content, relPath, {
        requireFindingId: true,
        requireWave2Refs: file === 'synthesis.md',
      });
      inspect.push(...validation.inspect);
      advice.push(...validation.advice);
    }
    const indexRel = 'artifacts/wave2/finding-index.yaml';
    const indexContent = readText(join(bundlePath, indexRel));
    if (indexContent !== null && !/\b(?:id|origin_refs|trigger_refs|synthesis_refs|handoff_refs)\s*:/.test(indexContent)) {
      inspect.push(`[return_map_missing_finding_lineage] ${indexRel}: finding index lacks id/origin_refs/trigger_refs lineage fields.`);
      advice.push(`Add finding ids and lineage refs to ${indexRel}; this is diagnostic guidance and does not replace gate or handoff evidence.`);
    }
  }

  return { passed: inspect.length === 0, inspect, advice, diagnosticOnly: true };
}

export function inspectReferenceReturnMaps(bundlePath, prefix = '') {
  const inspect = [];
  const advice = [];
  const refDir = join(bundlePath, 'reference');
  if (!existsSync(refDir)) return { passed: true, inspect, advice, diagnosticOnly: true };

  for (const file of readdirSync(refDir).filter((entry) => entry.endsWith('.md'))) {
    if (file === '_INDEX.md' || file === 'README.md') continue;
    if (prefix && !file.startsWith(prefix)) continue;
    const relPath = `reference/${basename(file)}`;
    const content = readText(join(refDir, file));
    if (content === null) continue;
    const validation = validateReturnMapContent(content, relPath);
    inspect.push(...validation.inspect);
    advice.push(...validation.advice);
  }

  return { passed: inspect.length === 0, inspect, advice, diagnosticOnly: true };
}
