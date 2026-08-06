#!/usr/bin/env node
// @impl RET-003, RET-006
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || process.cwd());
const specsRoot = join(root, 'openspec', 'specs');
const changesRoot = join(root, 'openspec', 'changes');
const catalogPath = join(specsRoot, 'README.md');
const allowedDomains = new Set([
  'agent',
  'engine',
  'bundle',
  'research',
  'workflow',
  'verification',
  'governance',
]);
const capabilityPathPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const catalogColumns = [
  'Capability path',
  'Purpose',
  'Keywords',
  'Boundaries / neighbors',
  'Related entries',
  'Agent/Markdown owns',
  'Engine/Node owns',
];

function walkSpecPaths(directory) {
  if (!existsSync(directory)) return [];
  const paths = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const target = join(current, entry.name);
      if (entry.isDirectory()) walk(target);
      if (entry.isFile() && entry.name === 'spec.md') paths.push(relative(directory, current));
    }
  };
  walk(directory);
  return paths.sort();
}

function validateCapabilityPath(kind, value, failures) {
  if (!capabilityPathPattern.test(value)) {
    failures.push(`${kind} ${value || '(root)'} must be exactly domain/capability in kebab-case`);
    return false;
  }
  const [domain] = value.split('/');
  if (!allowedDomains.has(domain)) {
    failures.push(`${kind} ${value} uses unapproved domain ${domain}`);
    return false;
  }
  return true;
}

function parsePipeRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map((value) => value.trim());
}

function parseCatalog(content, failures) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const rows = [];
  let foundHeader = false;
  for (let headerIndex = 0; headerIndex < lines.length; headerIndex += 1) {
    const header = parsePipeRow(lines[headerIndex]);
    if (!header || header.join('\u0000') !== catalogColumns.join('\u0000')) continue;
    foundHeader = true;
    const separator = parsePipeRow(lines[headerIndex + 1] ?? '');
    if (!separator || separator.length !== catalogColumns.length || separator.some((value) => !/^:?-{3,}:?$/.test(value))) {
      failures.push(`catalog table at line ${headerIndex + 1} is missing the required table separator`);
      continue;
    }
    let rowIndex = headerIndex + 2;
    for (; rowIndex < lines.length; rowIndex += 1) {
      const row = parsePipeRow(lines[rowIndex]);
      if (!row) break;
      if (row.length !== catalogColumns.length) {
        failures.push(`catalog row ${rowIndex + 1} has ${row.length} columns; expected ${catalogColumns.length}`);
        continue;
      }
      rows.push({ line: rowIndex + 1, values: row });
    }
    headerIndex = rowIndex - 1;
  }
  if (!foundHeader) {
    failures.push('catalog is missing its required seven-column table header');
    return [];
  }
  return rows;
}

function resolvesProjectLocalPath(value) {
  if (!value || isAbsolute(value)) return false;
  const target = resolve(root, value);
  const rel = relative(root, target);
  return rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && existsSync(target);
}

function validateRelations(row, mainPaths, failures) {
  const [path, , , , relationCell] = row.values;
  const relations = relationCell.split(';').map((value) => value.trim()).filter(Boolean);
  if (relations.length === 0) {
    failures.push(`catalog row ${row.line} (${path}) has no related-entry declaration`);
    return;
  }
  if (relations.includes('none') && relations.length > 1) {
    failures.push(`catalog row ${row.line} (${path}) mixes none with typed related entries`);
    return;
  }
  for (const relation of relations) {
    if (relation === 'none') continue;
    const separator = relation.indexOf(':');
    if (separator <= 0 || separator === relation.length - 1) {
      failures.push(`catalog row ${row.line} (${path}) has malformed related entry ${relation}`);
      continue;
    }
    const type = relation.slice(0, separator);
    const target = relation.slice(separator + 1);
    if (type === 'capability') {
      if (!mainPaths.has(target)) failures.push(`catalog row ${row.line} (${path}) references missing capability ${target}`);
      continue;
    }
    if (type === 'execution-surface' || type === 'workflow-entry') {
      if (!resolvesProjectLocalPath(target)) {
        failures.push(`catalog row ${row.line} (${path}) has unresolved ${type} ${target}`);
      }
      continue;
    }
    if (type === 'operation-skill') continue;
    failures.push(`catalog row ${row.line} (${path}) has unsupported related-entry type ${type}`);
  }
}

const failures = [];
const mainPaths = walkSpecPaths(specsRoot);
for (const path of mainPaths) validateCapabilityPath('main spec path', path, failures);

if (existsSync(changesRoot)) {
  for (const entry of readdirSync(changesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    for (const path of walkSpecPaths(join(changesRoot, entry.name, 'specs'))) {
      validateCapabilityPath(`active delta path ${entry.name}/`, path, failures);
    }
  }
}

if (!existsSync(catalogPath)) {
  failures.push('catalog is missing: openspec/specs/README.md');
} else {
  const rows = parseCatalog(readFileSync(catalogPath, 'utf8'), failures);
  const mainPathSet = new Set(mainPaths);
  const rowCounts = new Map();
  for (const row of rows) {
    const [path, purpose, keywords, boundaries, relations, agentOwnership, engineOwnership] = row.values;
    validateCapabilityPath(`catalog row ${row.line}`, path, failures);
    if (!purpose || !keywords || !boundaries || !relations) {
      failures.push(`catalog row ${row.line} (${path}) has an empty navigation field`);
    }
    if (!agentOwnership || !engineOwnership) {
      failures.push(`catalog row ${row.line} (${path}) must declare both Agent/Markdown and Engine/Node ownership`);
    }
    rowCounts.set(path, (rowCounts.get(path) ?? 0) + 1);
    validateRelations(row, mainPathSet, failures);
  }
  for (const path of mainPaths) {
    if (!rowCounts.has(path)) failures.push(`catalog is missing a row for main spec ${path}`);
  }
  for (const [path, count] of rowCounts) {
    if (!mainPathSet.has(path)) failures.push(`catalog has a row for missing main spec ${path}`);
    if (count > 1) failures.push(`catalog has ${count} rows for ${path}`);
  }
}

if (failures.length > 0) {
  console.error('Capability taxonomy check failed:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`Capability taxonomy valid: ${mainPaths.length} nested main specs.`);
