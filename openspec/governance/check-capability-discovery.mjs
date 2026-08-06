#!/usr/bin/env node
// @impl RET-003, RET-006
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const changeIndex = args.indexOf('--change');
const change = changeIndex >= 0 ? args[changeIndex + 1] : null;
const root = resolve(process.cwd());
const changePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const capabilityPathPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dispositions = new Set(['Modify', 'Verify-only', 'Excluded', 'New']);
const columns = ['Candidate path', 'Evidence read', 'Decision', 'Reason'];

function usage() {
  console.error('Usage: node openspec/governance/check-capability-discovery.mjs --change <safe-kebab-case-change>');
  process.exit(2);
}

if (args.length !== 2 || changeIndex !== 0 || !change || !changePattern.test(change)) usage();

function parsePipeRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map((value) => value.trim());
}

function inlineCodeValue(value) {
  const match = value.match(/^`([^`]+)`$/);
  return match ? match[1] : value;
}

function skipSpecsReason(lines, failures) {
  const index = lines.findIndex((line) => /^\s*skip_specs:\s*true(?:\s|$)/i.test(line));
  if (index < 0) return false;
  const inline = lines[index].replace(/^\s*skip_specs:\s*true\s*/i, '').replace(/^[-:#—]+\s*/, '').trim();
  if (inline) return true;
  for (let next = index + 1; next < lines.length; next += 1) {
    const candidate = lines[next].trim();
    if (!candidate) continue;
    if (/^#{1,6}\s/.test(candidate) || candidate.startsWith('|')) break;
    if (!/^skip_specs:\s*true(?:\s|$)/i.test(candidate)) return true;
  }
  failures.push('skip_specs: true requires a non-empty delta-spec non-applicability reason');
  return true;
}

const proposalPath = join(root, 'openspec', 'changes', change, 'proposal.md');
if (!existsSync(proposalPath)) {
  console.error(`Capability discovery check failed:\n  proposal is missing: openspec/changes/${change}/proposal.md`);
  process.exit(1);
}

const lines = readFileSync(proposalPath, 'utf8').replace(/\r\n?/g, '\n').split('\n');
const failures = [];
const skipSpecs = skipSpecsReason(lines, failures);
const headingIndex = lines.findIndex((line) => /^##\s+Capability Discovery\s*$/.test(line));
if (headingIndex < 0) {
  failures.push('proposal is missing the ## Capability Discovery heading');
} else {
  const headerIndex = lines.findIndex((line, index) => index > headingIndex && parsePipeRow(line)?.join('\u0000') === columns.join('\u0000'));
  if (headerIndex < 0) {
    failures.push('Capability Discovery is missing the required four-column table header');
  } else {
    const separator = parsePipeRow(lines[headerIndex + 1] ?? '');
    if (!separator || separator.length !== columns.length || separator.some((value) => !/^:?-{3,}:?$/.test(value))) {
      failures.push('Capability Discovery is missing the required table separator');
    } else {
      let rowCount = 0;
      for (let index = headerIndex + 2; index < lines.length; index += 1) {
        const row = parsePipeRow(lines[index]);
        if (!row) break;
        rowCount += 1;
        if (row.length !== columns.length) {
          failures.push(`Capability Discovery row ${index + 1} has ${row.length} columns; expected ${columns.length}`);
          continue;
        }
        const [rawPath, evidence, decision, reason] = row;
        const path = inlineCodeValue(rawPath);
        if (!capabilityPathPattern.test(path)) {
          failures.push(`Capability Discovery row ${index + 1} has invalid candidate path ${path || '(empty)'}`);
        }
        if (!evidence) failures.push(`Capability Discovery row ${index + 1} has no Evidence read`);
        if (!dispositions.has(decision)) {
          failures.push(`Capability Discovery row ${index + 1} has unsupported Decision ${decision || '(empty)'}`);
        }
        if (!reason) failures.push(`Capability Discovery row ${index + 1} has no Reason`);
      }
      if (!skipSpecs && rowCount === 0) failures.push('Capability Discovery requires at least one candidate row');
    }
  }
}

if (failures.length > 0) {
  console.error('Capability discovery check failed:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`Capability discovery record valid: ${change}.`);
