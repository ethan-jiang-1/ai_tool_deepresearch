#!/usr/bin/env node
// check-spec-section-references.mjs — 防复发 guard（2026-09-01-spec-section-reference-guard）。
// 规则1：main spec 中形如 `<file>.md §X.Y` 的章节坐标引用，其目标文件必须存在且含该编号标题。
// 规则2：main spec 禁止出现现在时退役句式 `SHALL be retired`（退役内容必须用 @deprecated 标注或过去时散文）。
// 只读；失败 exit 1 并输出 file:line 根因。Usage: node check-spec-section-references.mjs [projectRoot]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || process.cwd());
const specsRoot = join(root, 'openspec', 'specs');
const nodesRoot = join(root, 'DEEP_RESEARCH_HARNESS', 'workflows', 'nodes');
const failures = [];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

const nodeFiles = walk(nodesRoot);
const specFiles = walk(specsRoot);
const REF_RE = /([\w.-]+\.md)`?\s*§\s*(\d+(?:\.\d+)*)/g;

for (const specPath of specFiles) {
  const text = readFileSync(specPath, 'utf8');
  const rel = relative(root, specPath);
  const lines = text.split('\n');
  for (const [i, line] of lines.entries()) {
    for (const m of line.matchAll(REF_RE)) {
      const [, fileName, section] = m;
      const target = nodeFiles.find((f) => f.endsWith(`/${fileName}`));
      if (!target) { failures.push(`${rel}:${i + 1} referenced file not found: ${fileName}`); continue; }
      const targetText = readFileSync(target, 'utf8');
      const headingRe = new RegExp(`^#{2,4}\\s+${section.replace(/\./g, '\\.')}(?:\\.?\\s|\\.(?:[（\\w])|（|$)`, 'm');
      if (!headingRe.test(targetText)) {
        failures.push(`${rel}:${i + 1} section §${section} not found in ${fileName} (file: ${relative(root, target)})`);
      }
    }
    if (line.includes('SHALL be retired')) {
      failures.push(`${rel}:${i + 1} present-tense retirement prose 'SHALL be retired' must be reworded or @deprecated-annotated`);
    }
  }
}

// Rule 3 (2026-09-04 registry-hygiene-and-guard-extensions): inside the Harness
// workflow/command_playbook tree, a bare `§TOKEN` reference must resolve to a
// numbered heading in the SAME file; `<file>.md §TOKEN` must resolve in target.
const workflowRoot = join(root, 'DEEP_RESEARCH_HARNESS', 'workflows');
const playbookRoot = join(root, 'DEEP_RESEARCH_HARNESS', 'command_playbook');
const treeFiles = [...walk(workflowRoot), ...walk(playbookRoot)];
const CROSS_REF_RE = /\b([\w.-]+\.md)`?\s*§\s*(\d+(?:\.\d+)*[a-z]?)/g;
const BARE_REF_RE = /(?:^|[\s（(`])\u00a7\s*(\d+(?:\.\d+)*[a-z]?)(?=[\s.，。、：:)\u201d`]|$)/g;
function headingReFor(token) {
  const esc = token.replace(/\./g, '\\.');
  return new RegExp(`^#{2,4}\\s+${esc}(?:[\\s.：:])`, 'm');
}
for (const filePath of treeFiles) {
  const text = readFileSync(filePath, 'utf8');
  const rel = relative(root, filePath);
  const lines = text.split('\n');
  const base = filePath.split('/').pop();
  for (const [i, line] of lines.entries()) {
    for (const m of line.matchAll(CROSS_REF_RE)) {
      const [, fname, token] = m;
      if (fname === base) continue;
      const target = treeFiles.find((f) => f.endsWith(`/${fname}`));
      if (!target) {
        failures.push(`${rel}:${i + 1} workflows cross-ref target file not found: ${fname}`);
        continue;
      }
      if (!headingReFor(token).test(readFileSync(target, 'utf8'))) {
        failures.push(`${rel}:${i + 1} section §${token} not found in ${fname} (file: ${relative(root, target)})`);
      }
    }
    const sanitized = line.replace(CROSS_REF_RE, '');
    for (const m of sanitized.matchAll(BARE_REF_RE)) {
      const token = m[1];
      if (!headingReFor(token).test(text)) {
        failures.push(`${rel}:${i + 1} self section §${token} not found in ${base}`);
      }
    }
  }
}

if (failures.length) {
  for (const f of failures) console.error('FAIL check-spec-section-references —', f);
  process.exit(1);
}
console.log(`PASS check-spec-section-references — ${specFiles.length} main specs scanned, 0 violations.`);
