// gate-helpers-serial.mjs — YAML/JSON safe readers with repair + template scan
// @impl GSK-002, BUG-018
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-serial.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parseMdFrontmatter } from './gate-helpers-readers.mjs';
import { readBundleName, logToRun } from '../logger.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// Gate Sanity Checks — YAML/JSON read resilience (GSK-002, BUG-018)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Repair malformed JSON with deterministic fixes.
 *
 * Repairs attempted (in order):
 *   1. Trailing commas before } or ]
 *   2. Unquoted object keys ({ a: 1 } → { "a": 1 })
 *   3. Single-quoted strings ('value' → "value")
 *   4. Missing closing bracket/brace (balanced insert)
 *
 * @param {string} raw — raw JSON string
 * @returns {{ repaired: boolean, result: string, detail: string }}
 */
function repairJson(raw) {
  let s = raw.trim();
  let detail = '';

  // 1. Trailing commas
  const trailingCommaFixed = s.replace(/,(\s*[}\]])/g, '$1');
  if (trailingCommaFixed !== s) {
    s = trailingCommaFixed;
    detail = 'removed trailing commas';
  }

  // 2. Unquoted keys: match word at start of line or after {, before :
  const unquotedKeyFixed = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  if (unquotedKeyFixed !== s) {
    s = unquotedKeyFixed;
    detail = detail ? detail + '; fixed unquoted keys' : 'fixed unquoted keys';
  }

  // 3. Single-quoted strings (naive: '...' → "..." when not inside double-quoted context)
  // Only apply to values (after colon), not keys
  const sqFixed = s.replace(/:\s*'([^']*)'/g, ': "$1"');
  if (sqFixed !== s) {
    s = sqFixed;
    detail = detail ? detail + '; fixed single-quoted strings' : 'fixed single-quoted strings';
  }

  // 4. Missing closing brackets/braces — balance check
  const openBraces = (s.match(/\{/g) || []).length;
  const closeBraces = (s.match(/\}/g) || []).length;
  const openBrackets = (s.match(/\[/g) || []).length;
  const closeBrackets = (s.match(/\]/g) || []).length;

  if (openBraces > closeBraces) {
    s += '}'.repeat(openBraces - closeBraces);
    detail = detail ? detail + '; added missing closing braces' : 'added missing closing braces';
  }
  if (openBrackets > closeBrackets) {
    s += ']'.repeat(openBrackets - closeBrackets);
    detail = detail ? detail + '; added missing closing brackets' : 'added missing closing brackets';
  }

  return { repaired: detail.length > 0, result: s, detail };
}

/**
 * Repair YAML double-quoted strings containing unescaped ASCII double quotes.
 *
 * The BUG-018 root cause: page titles containing literal " characters
 * (e.g. Chinese quotation marks 「"」 that map to U+0022) are written
 * into YAML double-quoted strings without escaping, producing:
 *   title: "点球｜亚洲球队遭遇"滑铁卢" — 新华报业网"
 * which is invalid YAML.
 *
 * Strategy: parse the YAML, catch the error, extract the failing line,
 * escape unescaped double quotes within double-quoted strings on that line,
 * retry parse.
 *
 * @param {string} raw — raw YAML string
 * @param {string} filePath — for diagnostic messages
 * @returns {{ repaired: boolean, result: string, detail: string, line?: number }}
 */
function repairYamlDoubleQuotes(raw, filePath) {
  // Detect pattern: inside a double-quoted YAML string, find unescaped " chars
  // YAML double-quoted strings: "..." where inner " must be escaped as \"
  // We look for lines matching: key: "value with " inside"
  const lines = raw.split('\n');
  let repaired = false;
  let repairDetail = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match YAML key: "value" pattern where value contains unescaped quotes
    const m = line.match(/^(\s*[\w-]+\s*:\s*)"(.+)"(\s*)$/);
    if (!m) continue;

    const prefix = m[1];
    const inner = m[2];
    const suffix = m[3];

    // Check if inner contains unescaped double quotes
    // An escaped quote is \", an unescaped one is a bare " not preceded by \
    let hasUnescaped = false;
    let fixed = '';
    for (let j = 0; j < inner.length; j++) {
      if (inner[j] === '"' && (j === 0 || inner[j - 1] !== '\\')) {
        hasUnescaped = true;
        fixed += '\\"';
      } else {
        fixed += inner[j];
      }
    }

    if (hasUnescaped) {
      lines[i] = `${prefix}"${fixed}"${suffix}`;
      repaired = true;
      repairDetail = `escaped unescaped double quotes in line ${i + 1}: "${inner.substring(0, 40)}..."`;
    }
  }

  return {
    repaired,
    result: repaired ? lines.join('\n') : raw,
    detail: repairDetail,
  };
}

/**
 * Read and parse a YAML file with actionable error diagnostics.
 *
 * On parse failure:
 *   1. Try YAML repair (unescaped double-quote pattern)
 *   2. If repair succeeds, log yaml_repaired diagnostic and return result
 *   3. If repair fails, return error with file path, line number, parser message
 *
 * NEVER returns a generic "Cannot read or parse YAML array" message.
 * Always distinguishes "file does not exist" from "parse failure".
 *
 * @param {string} filePath — absolute path to the YAML file
 * @param {string} [bundlePath] — optional bundle root for diagnostic logging
 * @returns {{ ok: true, data: any } | { ok: false, error: string, filePath: string, line?: number, parserError?: string }}
 *
 * @impl GSK-002
 */
export function readYamlArraySafe(filePath, bundlePath) {
  if (!existsSync(filePath)) {
    return {
      ok: false,
      error: `File does not exist: ${filePath}`,
      filePath,
    };
  }

  const raw = readFileSync(filePath, 'utf-8');

  // Primary parse attempt
  try {
    const parsed = parseYaml(raw);
    return { ok: true, data: Array.isArray(parsed) ? parsed : (parsed != null ? parsed : null) };
  } catch (primaryError) {
    // Extract line/position info from yaml parse error
    const errMsg = primaryError.message || String(primaryError);
    let line = null;
    const lineMatch = errMsg.match(/at line\s+(\d+)/i) || errMsg.match(/line\s+(\d+)/i);
    if (lineMatch) line = parseInt(lineMatch[1], 10);

    // Attempt YAML repair: unescaped double quotes
    const repair = repairYamlDoubleQuotes(raw, filePath);
    if (repair.repaired) {
      try {
        const parsed = parseYaml(repair.result);
        // Log yaml_repaired diagnostic
        if (bundlePath) {
          try {
            logToRun(bundlePath, 'warn', 'yaml_repaired', {
              file: relative(bundlePath, filePath),
              detail: repair.detail,
            });
          } catch { /* log failure silent */ }
        }
        return { ok: true, data: Array.isArray(parsed) ? parsed : (parsed != null ? parsed : null), repaired: true, repairDetail: repair.detail };
      } catch (repairError) {
        // Repair didn't help — fall through to error
      }
    }

    return {
      ok: false,
      error: `Parse failure in ${filePath}${line ? ` at line ${line}` : ''}: ${errMsg}`,
      filePath,
      line,
      parserError: errMsg,
      repairAttempted: repair.repaired,
    };
  }
}

/**
 * Read and parse a JSON file with actionable error diagnostics and repair.
 *
 * On parse failure:
 *   1. Try deterministic JSON repair
 *   2. If repair succeeds, log json_repaired diagnostic and return result
 *   3. If repair fails, return error with file path + parser message
 *
 * @param {string} filePath — absolute path to the JSON file
 * @param {string} [bundlePath] — optional bundle root for diagnostic logging
 * @returns {{ ok: true, data: any } | { ok: false, error: string, filePath: string, parserError?: string, repairAttempted?: boolean }}
 *
 * @impl GSK-002
 */
export function readJsonFileSafe(filePath, bundlePath) {
  if (!existsSync(filePath)) {
    return {
      ok: false,
      error: `File does not exist: ${filePath}`,
      filePath,
    };
  }

  const raw = readFileSync(filePath, 'utf-8');

  // Primary parse attempt
  try {
    const data = JSON.parse(raw);
    return { ok: true, data };
  } catch (primaryError) {
    const errMsg = primaryError.message || String(primaryError);

    // Attempt JSON repair
    const repair = repairJson(raw);
    if (repair.repaired) {
      try {
        const data = JSON.parse(repair.result);
        // Log json_repaired diagnostic
        if (bundlePath) {
          try {
            logToRun(bundlePath, 'warn', 'json_repaired', {
              file: relative(bundlePath, filePath),
              detail: repair.detail,
            });
          } catch { /* log failure silent */ }
        }
        return { ok: true, data, repaired: true, repairDetail: repair.detail };
      } catch (repairError) {
        // Repair didn't help — fall through to error
      }
    }

    return {
      ok: false,
      error: `Parse failure in ${filePath}: ${errMsg}`,
      filePath,
      parserError: errMsg,
      repairAttempted: repair.repaired,
      repairDetail: repair.repaired ? repair.detail : undefined,
    };
  }
}

/**
 * Pre-rule scan: detect unexpanded template variables (${...}) in source_url
 * fields across source.yaml and reference markdown frontmatter.
 *
 * Emits `template_not_expanded` diagnostic events to rb_trace.jsonl and
 * run.log. Does NOT fail the gate — this is a diagnostic-only sanity check.
 *
 * Covers Wave0, Wave1, and Wave2 source_url fields including:
 *   - source.yaml entries (all waves)
 *   - reference markdown frontmatter source_url fields
 *   - Wave2 search/gap-fill evidence source URLs
 *
 * @param {string} bundlePath — absolute path to the bundle root
 * @returns {{ findings: Array<{file: string, field: string, value: string}> }}
 *
 * @impl GSK-002
 */
export function scanTemplateNotExpanded(bundlePath) {
  const findings = [];

  /**
   * Check a single value for ${...} template patterns.
   */
  function checkValue(fileRel, field, value) {
    if (typeof value === 'string' && value.includes('${')) {
      findings.push({ file: fileRel, field, value: value.substring(0, 120) });
    }
  }

  // ── Scan source.yaml files under artifacts/ ──
  for (const wave of ['wave0', 'wave1', 'wave2']) {
    const waveDir = join(bundlePath, 'artifacts', wave);
    if (!existsSync(waveDir)) continue;

    const sourceYamlFiles = [];
    try {
      const walkDir = (dir, base) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const rel = join(base, entry.name);
          if (entry.isFile() && entry.name === 'source.yaml') sourceYamlFiles.push({ abs: join(dir, entry.name), rel });
          else if (entry.isDirectory()) walkDir(join(dir, entry.name), rel);
        }
      };
      walkDir(waveDir, join('artifacts', wave));
    } catch { /* ignore */ }

    for (const { abs, rel } of sourceYamlFiles) {
      const result = readYamlArraySafe(abs);
      if (result.ok && Array.isArray(result.data)) {
        for (let i = 0; i < result.data.length; i++) {
          const entry = result.data[i];
          if (entry && entry.url) checkValue(rel, `entry[${i}].url`, entry.url);
          if (entry && entry.source_url) checkValue(rel, `entry[${i}].source_url`, entry.source_url);
        }
      }
    }
  }

  // ── Scan reference markdown frontmatter ──
  const refDir = join(bundlePath, 'reference');
  if (existsSync(refDir)) {
    try {
      for (const entry of readdirSync(refDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
        const abs = join(refDir, entry.name);
        const rel = join('reference', entry.name);
        try {
          const raw = readFileSync(abs, 'utf-8');
          const fm = parseMdFrontmatter(raw);
          if (fm && fm.source_url) checkValue(rel, 'source_url', fm.source_url);
          // Also check metadata-block style: - source_url: <value>
          const metaMatch = raw.match(/^- source_url:\s*(.+)$/m);
          if (metaMatch) checkValue(rel, 'source_url', metaMatch[1].trim());
        } catch { /* skip unparseable */ }
      }
    } catch { /* ignore */ }
  }

  // ── Emit diagnostics ──
  if (findings.length > 0) {
    try {
      const tracePath = join(bundlePath, 'rb_trace.jsonl');
      const bundle = (() => {
        try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
      })();
      const ts = new Date().toISOString();
      for (const f of findings) {
        const traceEntry = JSON.stringify({
          ts,
          bundle,
          event: 'diagnostic',
          kind: 'template_not_expanded',
          file: f.file,
          field: f.field,
          value: f.value,
        });
        appendFileSync(tracePath, traceEntry + '\n');
      }
    } catch { /* trace write failure silently ignored */ }

    try {
      logToRun(bundlePath, 'warn', 'template_not_expanded', {
        count: findings.length,
        files: findings.map(f => `${f.file}:${f.field}`).slice(0, 10),
      });
    } catch { /* log failure silent */ }
  }

  return { findings };
}
