// check-spec-format.mjs — 生产 spec 格式合规检查（只读，不修改）
// Usage: node check-spec-format.mjs [projectRoot]
//
// 对标 openspec 源码的格式要求。只检查 openspec/specs/ 下的生产 spec，
// 不检查 openspec/changes/ 下的 delta spec（delta 用 ADDED/MODIFIED/REMOVED 是合法的）。
//
// 四项检查:
//   1. deltaHeaderInProd   — 生产 spec 出现 delta 头 (## ADDED|MODIFIED|REMOVED|RENAMED Requirements)
//   2. missingPurpose      — 缺少 ## Purpose 节
//   3. missingRequirements — 缺少 ## Requirements 节
//   4. missingReqHeader    — 缺少 > req: frontmatter 行 (项目约定)

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || process.cwd();
const specsDir = join(root, 'openspec', 'specs');

if (!existsSync(specsDir)) {
  console.error('Specs directory not found:', specsDir);
  process.exit(1);
}

// Delta headers that are only valid in openspec/changes/, NOT in openspec/specs/
// 对齐 openspec spec-structure.js: /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i
const DELTA_HEADER_RE = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/im;

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
  const lines = content.split('\n');
  const shortPath = file.replace(root + '/', '');

  // 1. deltaHeaderInProd
  const deltaMatch = content.match(DELTA_HEADER_RE);
  if (deltaMatch) {
    const lineNum = lines.findIndex((l) => DELTA_HEADER_RE.test(l)) + 1;
    violations.push({
      file: shortPath,
      check: 'deltaHeaderInProd',
      detail: `生产 spec 包含 delta 头 "${deltaMatch[0].trim()}"（delta 头只在 openspec/changes/ 下合法）`,
      line: lineNum,
    });
    failed = true;
  }

  // 2. missingPurpose — 对齐 openspec markdown-parser.js findSection (case-insensitive)
  if (!/^##\s+Purpose\s*$/im.test(content)) {
    violations.push({
      file: shortPath,
      check: 'missingPurpose',
      detail: '缺少 ## Purpose 节',
    });
    failed = true;
  }

  // 3. missingRequirements — 对齐 openspec requirement-blocks.js: /^##\s+Requirements\s*$/i
  if (!/^##\s+Requirements\s*$/im.test(content)) {
    violations.push({
      file: shortPath,
      check: 'missingRequirements',
      detail: '缺少 ## Requirements 节',
    });
    failed = true;
  }

  // 4. missingReqHeader (project convention)
  if (!/^> req:\s*[A-Z]{3}-\d{3}/m.test(content)) {
    violations.push({
      file: shortPath,
      check: 'missingReqHeader',
      detail: '缺少 > req: <ID> frontmatter 行（项目约定）',
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
    deltaHeaderInProd: 'Delta header in production spec',
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
  `All spec formats valid: ${specFiles.length} spec files, 0 violations.`,
);
