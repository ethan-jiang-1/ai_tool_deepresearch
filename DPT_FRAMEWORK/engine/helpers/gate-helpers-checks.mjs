// gate-helpers-checks.mjs — Gate rule checks: reference validation, content_dedup, cache_coverage
// @impl GSK-001, GSK-002, CRC-006
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readOutputDeclarations, listMatchingBundleFiles, getDeclaredReferencePaths, parseMdFrontmatter, readBundlePlan } from './gate-helpers-readers.mjs';


// ═══════════════════════════════════════════════════════════════════════════
// Similarity & Text Utilities
// ═══════════════════════════════════════════════════════════════════════════

export function tokenizeForSimilarity(text) {
  if (!text) return [];
  const tokens = [];
  const cjk = /\p{Script=Han}/u;
  let i = 0;
  while (i < text.length) {
    if (cjk.test(text[i])) {
      if (i + 1 < text.length && cjk.test(text[i + 1])) {
        tokens.push(text[i] + text[i + 1]);
      }
      i++;
    } else if (/[a-zA-Z]/.test(text[i])) {
      let word = '';
      while (i < text.length && /[a-zA-Z0-9]/.test(text[i])) {
        word += text[i].toLowerCase();
        i++;
      }
      if (word.length > 0) tokens.push(word);
    } else {
      i++;
    }
  }
  return tokens;
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B|. */
export function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersect = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersect.size / union.size;
}

/** Extract a named Markdown section body. */
export function extractSection(mdContent, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`##{1,3}\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##{1,3}\\s|$)`, 'i');
  const match = mdContent.match(re);
  return match ? match[1].trim() : '';
}

/** Normalize URL: lowercase scheme+host, remove fragment, trim trailing slash. */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase().replace(/#.*$/, '').replace(/\/+$/, '');
  }
}

export function isHomepageUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    if (path === '' || path === '/' || /\/index\.(html?|php|asp|jsp)$/i.test(path)) return true;
    const depth = path.split('/').filter(Boolean).length;
    return depth < 2;
  } catch { return false; }
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
  'related_topic',
];

export const REQUIRED_REFERENCE_SECTIONS = [
  'Key Facts',
  'Core Content Capture',
  'Relevance To This Research',
  'Quotable Terms / Concepts',
  'Risks And Limitations',
];

export function parseReferenceMetadata(mdContent) {
  const beforeFirstSection = mdContent.split(/\n##\s+/)[0] || '';
  const metadata = new Map();
  for (const line of beforeFirstSection.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*([A-Za-z0-9_]+):\s*(.*)$/);
    if (match) metadata.set(match[1], match[2].trim());
  }
  return metadata;
}


// ═══════════════════════════════════════════════════════════════════════════
// Reference Validation Checks
// ═══════════════════════════════════════════════════════════════════════════

export function checkReferenceFormatFiles(files) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    if (content.trimStart().startsWith('---')) {
      inspect.push(`YAML frontmatter is not allowed in ${file.relPath}`);
      continue;
    }
    const metadata = parseReferenceMetadata(content);
    for (const field of REQUIRED_REFERENCE_METADATA_FIELDS) {
      if (!metadata.has(field) || !metadata.get(field)) {
        inspect.push(`Missing required metadata "${field}" in ${file.relPath}`);
      }
    }
    for (const section of REQUIRED_REFERENCE_SECTIONS) {
      if (!extractSection(content, section)) {
        inspect.push(`Missing or empty section "## ${section}" in ${file.relPath}`);
      }
    }
  }
  return { passed: inspect.length === 0, inspect };
}

export function checkReferenceSourceUrls(files) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    const metadata = parseReferenceMetadata(content);
    const sourceUrl = metadata.get('source_url') || '';
    if (!sourceUrl) {
      inspect.push(`Missing metadata source_url in ${file.relPath}`);
      continue;
    }
    const urls = sourceUrl.split(';').map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      inspect.push(`Empty metadata source_url in ${file.relPath}`);
      continue;
    }
    for (const url of urls) {
      if (isHomepageUrl(url)) inspect.push(`Homepage or shallow source_url in ${file.relPath}: ${url}`);
    }
  }
  return { passed: inspect.length === 0, inspect };
}

export function checkReferenceKeyFactsMinLines(files, minLines = 5) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    const keyFacts = extractSection(content, 'Key Facts');
    const bulletCount = keyFacts.split(/\r?\n/).filter((line) => /^\s*-\s+\S/.test(line)).length;
    if (bulletCount < minLines) {
      inspect.push(`Key Facts in ${file.relPath} has ${bulletCount} bullet line(s), expected at least ${minLines}`);
    }
  }
  return { passed: inspect.length === 0, inspect };
}


export function checkReferenceLedgerCoverage(bundlePath, files) {
  const declared = getDeclaredReferencePaths(bundlePath);
  const missing = files.map((f) => f.relPath).filter((p) => !declared.has(p));
  return {
    passed: missing.length === 0,
    inspect: missing.map((p) => `Reference file is not declared in rb_output_declarations.jsonl: ${p}`),
  };
}

const SELF_REF_PATTERNS = [
  /this\s+reference\s+supplements/i,
  /this\s+document\s+provides/i,
  /this\s+file\s+contains/i,
  /本文(件|档)?(用于|提供|补充)/,
  /本参考(用于|提供|补充)/,
];

// ═══════════════════════════════════════════════════════════════════════════
// content_dedup Gate Check
// ═══════════════════════════════════════════════════════════════════════════

export function checkContentDedup(bundlePath, threshold = {}) {
  const jaccardThreshold = threshold.jaccard ?? 0.8;
  const checkUrlDedup = threshold.url_dedup !== false;
  const checkHomepage = threshold.homepage_detect !== false;
  const checkSelfRef = threshold.self_ref_detect !== false;

  const inspect = [];
  const advice = [];

  const declarations = readOutputDeclarations(bundlePath);
  if (declarations.length === 0) {
    return {
      passed: false,
      inspect: ['rb_output_declarations.jsonl is missing or empty — no completed Agent output declarations available'],
      advice: ['Run delegated Sub-agent intake through Relay and complete() to populate the declaration ledger.'],
    };
  }

  // Collect reference entries with content
  const references = [];
  for (const decl of declarations) {
    for (const entry of decl.output_files) {
      if (entry.role === 'reference') {
        const filePath = join(bundlePath, entry.path);
        let content = '';
        if (existsSync(filePath)) content = readFileSync(filePath, 'utf-8');
        references.push({
          path: entry.path,
          source_url: entry.source_url || '',
          keyFacts: extractSection(content, 'Key Facts'),
        });
      }
    }
  }

  if (references.length === 0) {
    return {
      passed: false,
      inspect: ['rb_output_declarations.jsonl contains no role=reference output declarations'],
      advice: ['Complete delegated reference-producing tasks through Relay/Queue so reference files are declared in rb_output_declarations.jsonl.'],
    };
  }

  let passed = true;

  // URL Dedup
  if (checkUrlDedup) {
    const urlMap = new Map();
    for (const ref of references) {
      if (!ref.source_url) {
        passed = false;
        inspect.push(`Missing source_url in declared reference "${ref.path}"`);
        advice.push('Every declared reference output must include a non-empty source_url.');
        continue;
      }
      const norm = normalizeUrl(ref.source_url);
      if (urlMap.has(norm)) {
        passed = false;
        inspect.push(`URL duplicate: "${ref.path}" and "${urlMap.get(norm)}" share normalized URL ${norm}`);
        advice.push('Duplicate source URL detected.');
      } else {
        urlMap.set(norm, ref.path);
      }
    }
  }

  // Homepage Detection
  if (checkHomepage) {
    for (const ref of references) {
      if (!ref.source_url) continue;
      const urls = ref.source_url.split(';').map((u) => u.trim()).filter(Boolean);
      for (const url of urls) {
        if (isHomepageUrl(url)) {
          passed = false;
          inspect.push(`Homepage URL in "${ref.path}": ${url}`);
          advice.push('Replace homepage URL with a specific article URL.');
        }
      }
    }
  }

  // Self-Referential Language
  if (checkSelfRef) {
    for (const ref of references) {
      if (!ref.keyFacts) continue;
      for (const pattern of SELF_REF_PATTERNS) {
        if (pattern.test(ref.keyFacts)) {
          passed = false;
          inspect.push(`Self-referential Key Facts in "${ref.path}"`);
          advice.push('Key Facts describes the file itself. Rewrite with factual content.');
          break;
        }
      }
    }
  }

  // Jaccard Clone Detection
  for (let i = 0; i < references.length; i++) {
    for (let j = i + 1; j < references.length; j++) {
      const kfA = references[i].keyFacts;
      const kfB = references[j].keyFacts;
      if (!kfA || !kfB) continue;
      const sim = jaccardSimilarity(tokenizeForSimilarity(kfA), tokenizeForSimilarity(kfB));
      if (sim >= jaccardThreshold) {
        passed = false;
        inspect.push(`Jaccard clone (${sim.toFixed(3)} >= ${jaccardThreshold}): "${references[i].path}" vs "${references[j].path}"`);
        advice.push('Near-duplicate Key Facts detected. This often indicates template or script-generated reference files. Use sub-agent relay (dpt-evidence-extractor) to produce genuinely unique reference files from real WebSearch+WebFetch. Do NOT use template substitution or batch scripts.');
      }
    }
  }

  return { passed, inspect, advice };
}

// ═══════════════════════════════════════════════════════════════════════════
// cache_coverage Gate Check
// ═══════════════════════════════════════════════════════════════════════════

export function checkCacheCoverage(bundlePath) {
  const declarations = readOutputDeclarations(bundlePath);
  const inspect = [];
  const advice = [];
  let passed = true;

  if (declarations.length === 0) {
    return { passed: true, inspect, advice }; // Nothing to check
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
        inspect.push(`[cache_coverage] WARNING (Phase 1): ${declId} has empty cache_trails for reference ${ref.path} — gap will become fail in Phase 2`);
      }
      advice.push('Empty cache_trails on a reference-producing task — ensure sub-agents write _cache/ leaves and declare cache_trails in slot results.');
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
      for (const f of ['websearch.json', 'page.md', 'meta.json']) {
        if (!existsSync(join(trailDir, f))) missingFiles.push(f);
      }
      if (missingFiles.length > 0) {
        missingTrails.push({ trail, reason: `missing files: ${missingFiles.join(', ')}` });
        continue;
      }
      validTrails.push(trail);
    }

    if (missingTrails.length > 0) {
      passed = false;
      for (const mt of missingTrails) {
        inspect.push(`[cache_coverage] FAIL: ${declId}: cache trail ${mt.trail} — ${mt.reason}`);
      }
      advice.push(`Cache trail(s) missing for ${declId}. Re-run the delegated intake to produce complete cache leaves.`);
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
            if (meta.url && ref.source_url && normalizeUrl(meta.url) === normalizeUrl(ref.source_url)) {
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
        inspect.push(`[cache_coverage] FAIL: ${declId}: reference ${ref.path} (source_url: ${ref.source_url || 'none'}) not mapped to any valid cache trail`);
        advice.push(`Reference ${ref.path} has no cache trail mapping. Ensure sub-agent includes a matching _cache/ leaf (via meta.json.url or source_slug).`);
      } else if (!mapped && validTrails.length === 0) {
        // Already reported as missing trail above — don't double-report
      }
    }
  }

  return { passed, inspect, advice };
}
