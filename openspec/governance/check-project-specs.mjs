// check-project-specs.mjs — 项目级 OpenSpec main specs 结构 + req 追踪检查（只读，不修改）
// Usage: node check-project-specs.mjs [projectRoot]
//
// 对齐 @fission-ai/openspec 1.3.1:
//   - openspec/specs/<capability>/spec.md 是 main spec，必须有 ## Purpose 和 ## Requirements
//   - delta headers (## ADDED/MODIFIED/REMOVED/RENAMED Requirements) 只对
//     openspec/changes/<name>/specs/<capability>/spec.md 合法
//   - main spec 的 requirement blocks 只在 ## Requirements 内被 parse/list/show
//   - archive/apply-specs 更新既有 main spec 前会用 spec-structure.js 拒绝 delta header
//
// 本脚本不检查 openspec/changes/ 下的 delta spec；那部分交给 OpenSpec validate/archive。
//
// 四项检查:
//   1. deltaHeaderInMain   — main spec 出现 delta 头 (OpenSpec 结构错误)
//   2. missingPurpose      — 缺少 ## Purpose 节
//   3. missingRequirements — 缺少 ## Requirements 节
//   4. missingReqHeader    — 缺少 > req: 行 (本项目 openspec/governance/req-registry.yaml 追踪约定)

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || process.cwd();
const specsDir = join(root, 'openspec', 'specs');

if (!existsSync(specsDir)) {
  console.error('Specs directory not found:', specsDir);
  process.exit(1);
}

// Delta headers are only valid in openspec/changes/, not in openspec/specs/.
// Keep this aligned with OpenSpec spec-structure.js DELTA_HEADER.
const DELTA_HEADER_RE = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/im;
const PURPOSE_HEADER_RE = /^##\s+Purpose\s*$/im;
const REQUIREMENTS_HEADER_RE = /^##\s+Requirements\s*$/im;
const REQ_TRACE_RE = /^> req:\s*[A-Z]{3}-\d{3}/m;

function stripFencedCodeBlocksPreservingLines(content) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let activeFence = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (!activeFence) {
      if (fenceMatch) {
        activeFence = {
          marker: fenceMatch[1][0],
          length: fenceMatch[1].length,
        };
        output.push('');
      } else {
        output.push(line);
      }
      continue;
    }

    output.push('');
    const closingMatch = line.match(/^\s*(`{3,}|~{3,})\s*$/);
    if (
      closingMatch &&
      closingMatch[1][0] === activeFence.marker &&
      closingMatch[1].length >= activeFence.length
    ) {
      activeFence = null;
    }
  }

  return output.join('\n');
}

function hasReqTraceBeforeSecondHeading(content) {
  const lines = content.split('\n');
  let seenFirstHeading = false;

  for (const line of lines) {
    if (REQ_TRACE_RE.test(line)) return !seenFirstHeading;
    if (/^##\s+/.test(line)) seenFirstHeading = true;
  }

  return false;
}

// Collect all spec files
const specFiles = [];
function collectSpecFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSpecFiles(full);
    else if (entry.name === 'spec.md') specFiles.push(full);
  }
}
collectSpecFiles(specsDir);

if (specFiles.length === 0) {
  console.error('No spec.md files found in', specsDir);
  process.exit(1);
}

let failed = false;
const violations = []; // { file, check, detail, line? }

for (const file of specFiles) {
  const content = readFileSync(file, 'utf-8');
  const structuralContent = stripFencedCodeBlocksPreservingLines(content);
  const lines = content.split('\n');
  const shortPath = file.replace(root + '/', '');

  // 1. deltaHeaderInMain
  const deltaMatch = structuralContent.match(DELTA_HEADER_RE);
  if (deltaMatch) {
    const structuralLines = structuralContent.split('\n');
    const lineNum = structuralLines.findIndex((l) => DELTA_HEADER_RE.test(l)) + 1;
    violations.push({
      file: shortPath,
      check: 'deltaHeaderInMain',
      detail: `main spec 包含 delta 头 "${deltaMatch[0].trim()}"（delta 头只在 openspec/changes/ 下合法）`,
      line: lineNum,
    });
    failed = true;
  }

  // 2. missingPurpose — 对齐 openspec markdown-parser.js findSection (case-insensitive)
  if (!PURPOSE_HEADER_RE.test(structuralContent)) {
    violations.push({
      file: shortPath,
      check: 'missingPurpose',
      detail: '缺少 ## Purpose 节',
    });
    failed = true;
  }

  // 3. missingRequirements — 对齐 openspec requirement-blocks.js: /^##\s+Requirements\s*$/i
  if (!REQUIREMENTS_HEADER_RE.test(structuralContent)) {
    violations.push({
      file: shortPath,
      check: 'missingRequirements',
      detail: '缺少 ## Requirements 节',
    });
    failed = true;
  }

  // 4. missingReqHeader (project convention, not an OpenSpec-native field)
  if (!hasReqTraceBeforeSecondHeading(structuralContent)) {
    violations.push({
      file: shortPath,
      check: 'missingReqHeader',
      detail: '缺少位于首个二级标题之前的 > req: <ID> 行（本项目 openspec/governance/req-registry.yaml 追踪约定）',
    });
    failed = true;
  }
}

if (failed) {
  // Group by check type for cleaner output
  const byCheck = new Map();
  for (const v of violations) {
    if (!byCheck.has(v.check)) byCheck.set(v.check, []);
    byCheck.get(v.check).push(v);
  }

  const labels = {
    deltaHeaderInMain: 'Delta header in main spec',
    missingPurpose: 'Missing ## Purpose section',
    missingRequirements: 'Missing ## Requirements section',
    missingReqHeader: 'Missing > req: header',
  };

  for (const [check, items] of byCheck) {
    console.error(`${labels[check]} (${items.length}):`);
    for (const item of items) {
      const loc = item.line ? `:${item.line}` : '';
      console.error(`  ${item.file}${loc}`);
    }
  }
  console.error(`\n${violations.length} violation(s) in ${specFiles.length} spec files.`);
  process.exit(1);
}

console.log(
  `All project specs valid: ${specFiles.length} main spec files under openspec/specs, 0 violations.`,
);
