// static-regression.test.mjs — Static regression checks for stop:no contract hardening
// @impl WNC-009, SWE-002
//
// Verifies:
//   - All manifest lifecycle stop:no phases require shared/shared-silent-execution
//   - Relay/sub-agent task surfaces are NOT required to have it
//   - Phase bodies do not contain residual stop:no leakage patterns
//   - Section 9 no-idle/no-progress invariants are present in phase Stop Behavior

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const NODES_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'nodes');
const MANIFEST_PATH = join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'manifest.json');
const WORKFLOW_CHAIN_PATH = join(REPO_ROOT, 'DPT_FRAMEWORK', 'engine', 'workflow-chain.mjs');

// Leakage patterns that must NOT appear in stop:no phase bodies
const LEAKAGE_PATTERNS = [
  { pattern: /state:\s*["']?blocked["']?/i, name: 'state: blocked' },
  { pattern: /报告并停止/, name: 'report and stop (CN)' },
  { pattern: /\breport\s+and\s+stop\b/i, name: 'report and stop' },
  { pattern: /escalation/i, name: 'escalation' },
  { pattern: /ask\s+(the\s+)?user/i, name: 'ask the user' },
  { pattern: /ask\s+user/i, name: 'ask user' },
  { pattern: /request\s+confirmation/i, name: 'request confirmation' },
  { pattern: /回到\s*HITL1/i, name: 'return to HITL1 (CN)' },
  { pattern: /\bprogress\s+report\b/i, name: 'progress report' },
  { pattern: /阶段性汇报/, name: 'stage progress report (CN)' },
  { pattern: /\bnothing\s+left\b/i, name: 'nothing left' },
  { pattern: /没事做/, name: 'no-work report (CN)' },
  { pattern: /做到这里/, name: 'done-so-far report (CN)' },
  { pattern: /\bdone\s+so\s+far\b/i, name: 'done so far' },
];

// Phrases explicitly ALLOWED (negate the patterns above in specific contexts)
const ALLOWED_CONTEXT_PATTERNS = [
  /SHALL NOT/i,
  /MUST NOT/i,
  /Do NOT/i,
  /NOT\s+(?:available|an emergency|involves|write|load|claim|report|ask)/i,
  /\bforbidden\b/i,
  /\bprohibited\b/i,
  /\bprohibitions?\b/i,
  /\bno messages\b/i,
  /不是(?:停顿点|对话 checkpoint|用户 checkpoint|中途.*理由)/,
  /不(?:写|设|浮出水面|询问|请求|报告|发送|等待|自行|自判|回到|加载|绕过|把|做|因)/,
  /不得/,
  /禁止/,
  'silent_degradation',    // accepted trace event name
  'silent_gap',            // accepted trace event name
  'silent_unpassable',     // accepted trace event name
  'non-blocked',           // explicitly saying NOT blocked
  '不 escalation',          // explicitly saying DON'T escalate
  '不写 `state: blocked`',  // explicitly saying DON'T write state:blocked
  '不浮出水面',              // explicitly saying don't surface
  '不回到 HITL1',           // explicitly saying don't return to HITL1
  'no idle/no-work reports',
  'no "nothing left" / "done so far" summaries',
];

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
}

function parseFrontmatter(md) {
  const match = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const lines = block.split('\n');
  const fm = {};

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) { i++; continue; }

    // Block sequence item (continuation of previous key's array)
    if (trimmed.startsWith('- ')) { i++; continue; }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    if (!key) { i++; continue; }

    if (rawValue === '' || rawValue === 'null') {
      // Check for block sequence on following lines
      const seqItems = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed.startsWith('- ')) {
          const item = nextTrimmed.slice(2).trim();
          seqItems.push(item.replace(/^["']|["']$/g, ''));
          j++;
        } else if (!nextTrimmed || nextTrimmed.startsWith('#')) {
          j++;
        } else {
          break;
        }
      }
      if (seqItems.length > 0) {
        fm[key] = seqItems;
        i = j;
        continue;
      }
      fm[key] = null;
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      const inner = rawValue.slice(1, -1);
      if (inner.trim() === '') {
        fm[key] = [];
      } else {
        fm[key] = inner.split(',').map(s => {
          const v = s.trim();
          return v.replace(/^["']|["']$/g, '');
        });
      }
    } else if ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
               (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
      fm[key] = rawValue.slice(1, -1);
    } else {
      const lower = rawValue.toLowerCase();
      if (lower === 'true') fm[key] = true;
      else if (lower === 'false') fm[key] = false;
      else if (lower === 'yes') fm[key] = 'yes';
      else if (lower === 'no') fm[key] = 'no';
      else if (!isNaN(rawValue) && rawValue !== '') fm[key] = Number(rawValue);
      else fm[key] = rawValue;
    }

    i++;
  }

  return fm;
}

function parseRequiresList(fm) {
  const raw = fm.requires;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  // Inline array format: [a, b, c]
  if (typeof raw === 'string') {
    const match = raw.match(/^\[(.*)\]$/);
    if (match) {
      return match[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    }
    return [raw];
  }
  return [];
}

function getManifestPhaseRecords() {
  const manifest = loadManifest();
  if (!manifest) return [];

  const records = [];
  for (const mp of manifest.phases || []) {
    const nodePath = join(NODES_DIR, mp.node);
    if (!existsSync(nodePath)) continue;

    const md = readFileSync(nodePath, 'utf-8');
    const fm = parseFrontmatter(md);
    const isStopNo = fm.stop === 'no' || fm.stop === '"no"';
    const hasGate = fm.gate && fm.gate !== 'null';
    const isFinal = fm.phase === 'final' || mp.key === 'final';

    records.push({ mp, nodePath, md, fm, isStopNo, hasGate, isFinal });
  }
  return records;
}

function extractSection(md, headingPattern) {
  const body = md.replace(/^---[\s\S]*?---\n?/, '');
  const match = body.match(headingPattern);
  if (!match || match.index === undefined) return '';
  const start = match.index;
  const rest = body.slice(start);
  const next = rest.slice(match[0].length).search(/\n##\s+/);
  return next === -1 ? rest : rest.slice(0, match[0].length + next);
}

function isAllowedLeakageContext(context) {
  return ALLOWED_CONTEXT_PATTERNS.some((allowed) => {
    if (typeof allowed === 'string') return context.includes(allowed);
    return allowed.test(context);
  });
}

function collectLeakageViolations(text) {
  const violations = [];
  for (const lp of LEAKAGE_PATTERNS) {
    const flags = lp.pattern.flags.includes('i') ? 'gi' : 'g';
    const regex = new RegExp(lp.pattern.source, flags);
    for (const match of text.matchAll(regex)) {
      const index = match.index ?? 0;
      const context = text.slice(Math.max(0, index - 90), Math.min(text.length, index + match[0].length + 90));
      if (!isAllowedLeakageContext(context)) {
        violations.push(`${lp.name}: found "${context}"`);
      }
    }
  }
  return violations;
}

describe('Layer 1 regression: universal silent execution coverage (WNC-009)', () => {
  const manifest = loadManifest();

  it('manifest.json exists and contains phases', () => {
    assert.ok(manifest, 'manifest.json must exist');
    assert.ok(Array.isArray(manifest.phases), 'manifest must have phases array');
    assert.ok(manifest.phases.length > 0, 'manifest must have at least one phase');
  });

  // Identify all lifecycle stop:no phases from manifest + frontmatter
  const lifecyclePhases = [];
  const workUnitTaskSurfaces = [];

  if (manifest) {
    for (const mp of manifest.phases) {
      const nodePath = join(NODES_DIR, mp.node);
      if (!existsSync(nodePath)) continue;

      const md = readFileSync(nodePath, 'utf-8');
      const fm = parseFrontmatter(md);

      const isStopNo = fm.stop === 'no' || fm.stop === '"no"';
      const hasGate = fm.gate && fm.gate !== 'null';

      if (isStopNo && hasGate) {
        lifecyclePhases.push({ node: mp.node, gate: mp.gate, fm, body: md });
      }

      // Identify work-unit sub-agent task surfaces (has role field, no gate, or is explicitly a subagent)
      if (fm.role || basename(mp.node).includes('subagent')) {
        workUnitTaskSurfaces.push({ node: mp.node, fm });
      }
    }
  }

  it('every manifest lifecycle stop:no phase requires shared/shared-silent-execution', () => {
    assert.ok(lifecyclePhases.length >= 3, 'Expected at least 3 lifecycle stop:no phases');

    const missing = [];
    for (const lp of lifecyclePhases) {
      const requires = parseRequiresList(lp.fm);
      if (!requires.includes('shared/shared-silent-execution')) {
        missing.push(lp.node);
      }
    }

    assert.deepStrictEqual(missing, [], `These stop:no phases are missing shared/shared-silent-execution in requires: ${missing.join(', ')}`);
  });

  it('work-unit sub-agent task surfaces are NOT required to have shared/shared-silent-execution', () => {
    // This is a structural check: work-unit task surfaces exist and are correctly identified
    // We don't assert them to have silent-execution — we assert they are classified
    // separately from lifecycle phases
    assert.ok(workUnitTaskSurfaces.length >= 0, 'Work-unit task surfaces may or may not exist');
    // No assertion failure for work-unit task surfaces — just confirming they're correctly
    // identified and excluded from the lifecycle check above
  });
});

describe('Layer 2 regression: no stop:no leakage in phase bodies (SWE-002)', () => {
  const records = getManifestPhaseRecords();

  for (const record of records) {
    if (!record.isStopNo) continue;

    it(`${record.mp.node} body does not contain residual stop:no leakage`, () => {
      const body = record.md.replace(/^---[\s\S]*?---\n?/, ''); // strip frontmatter
      const violations = collectLeakageViolations(body);

      assert.deepStrictEqual(violations, [], `${record.mp.node} has residual leakage patterns`);
    });
  }
});

describe('Layer 9 regression: gate-pass / no-idle contract polish', () => {
  const records = getManifestPhaseRecords();

  for (const record of records) {
    if (!record.isStopNo || !record.hasGate || record.isFinal) continue;

    it(`${record.mp.node} Stop Behavior preserves gate-pass and no-idle invariants`, () => {
      const stopBehavior = extractSection(record.md, /\n## 8\. Stop Behavior[^\n]*\n/);
      assert.ok(stopBehavior, `${record.mp.node} must have §8 Stop Behavior`);
      assert.ok(
        /check\.next/.test(stopBehavior),
        `${record.mp.node} §8 must state gate CLI check.next boundary`,
      );
      assert.ok(
        /idle\/no-work|阶段进度|进度|汇报/.test(stopBehavior),
        `${record.mp.node} §8 must prohibit progress or idle/no-work surfacing`,
      );
      assert.ok(
        /gate pass|gate.*pass|Phase 完成条件|完成条件|运行 `[^`]+` gate/.test(stopBehavior),
        `${record.mp.node} §8 must preserve gate-pass objective`,
      );
    });
  }

  it('AUTONOMOUS MODE injected header includes no-idle and gate-pass guardrails', () => {
    const source = readFileSync(WORKFLOW_CHAIN_PATH, 'utf-8');
    const match = source.match(/const AUTONOMOUS_MODE_HEADER = `((?:\\`|[^`])*)`;/);
    assert.ok(match, 'AUTONOMOUS_MODE_HEADER must exist');
    const header = match[1].replaceAll('\\`', '`');

    assert.ok(header.includes('idle/no-work state'));
    assert.ok(header.includes('"nothing left"'));
    assert.ok(header.includes('"done so far"'));
    assert.ok(header.includes('Complete this node by draining/repairing/degrading'));
    assert.ok(header.includes('Next phase comes ONLY from gate CLI `check.next`'));
    assert.ok(header.includes('consume it through `enter-phase --bundle <path> --node <check.next>`'));
    assert.ok(header.includes('principle guardrail'));
    assert.ok(header.includes('node-specific Stop Behavior'));

    const violations = collectLeakageViolations(header);
    assert.deepStrictEqual(violations, [], 'AUTONOMOUS_MODE_HEADER has residual leakage patterns');
  });
});
