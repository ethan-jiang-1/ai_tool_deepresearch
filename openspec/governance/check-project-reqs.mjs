// @impl RET-001, RET-006
// Project-level Requirement ID registry consistency check.
// Usage: node check-project-reqs.mjs [projectRoot] [--mode plan|archive] [--change <active-change>]

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { parse as parseYaml } from 'yaml';
import {
  collectRequirementReservationClaims,
  evaluateRequirementReservations,
  parseRequirementReservation,
} from './requirement-reservation-contract.mjs';

const ID_RE = /^[A-Z]{3}-\d{3}$/;
const PREFIX_RE = /^[A-Z]{3}$/;
const CAPABILITY_PATH_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHANGE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQ_HEADER_RE = /^\s*>\s*req:\s*(.+)$/;
const BUG_ID_RE = /^BUG-\d+$/;

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-project-reqs.mjs [projectRoot] [--mode plan|archive] [--change <active-change>]');
  process.exit(2);
}

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        mode: { type: 'string' },
        change: { type: 'string' },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    usage(error.message);
  }

  if (parsed.positionals.length > 1) usage('At most one projectRoot positional argument is allowed.');
  const mode = parsed.values.mode ?? 'plan';
  const change = parsed.values.change;
  if (!['plan', 'archive'].includes(mode)) usage(`Unsupported mode: ${mode}`);
  if (mode === 'plan' && change !== undefined) usage('--change is only valid in archive mode.');
  if (mode === 'archive' && (!change || !CHANGE_RE.test(change))) {
    usage('Archive mode requires a safe active --change value.');
  }
  return {
    root: parsed.positionals[0] ?? process.cwd(),
    mode,
    change: change ?? null,
  };
}

function changeIdKey(change, id) {
  return `${change}\u0000${id}`;
}

function prefixMetadata(content) {
  const metadata = new Map();
  let inPrefixes = false;

  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    if (!inPrefixes) {
      if (/^prefixes:\s*$/.test(line)) inPrefixes = true;
      continue;
    }
    if (/^\S/.test(line) && !line.startsWith('#')) break;
    const match = line.match(/^ {2}([A-Z]{3}):\s*([^#]+?)(?:\s+#\s*(.*))?\s*$/);
    if (!match) continue;
    metadata.set(match[1], {
      value: match[2].trim(),
      comment: (match[3] ?? '').trim(),
    });
  }

  return metadata;
}

function validatePrefixTargets(registryValue, metadata, mainSpecsRoot) {
  const failures = [];
  if (!registryValue || typeof registryValue !== 'object' || Array.isArray(registryValue)) {
    return ['prefixes: must be a mapping'];
  }

  const liveEntries = [];
  for (const [prefix, rawPath] of Object.entries(registryValue)) {
    if (!PREFIX_RE.test(prefix)) {
      failures.push(`${prefix}: key must be a three-letter prefix`);
      continue;
    }

    const path = String(rawPath).trim();
    const note = metadata.get(prefix)?.comment ?? '';
    const subPrefixMatch = note.match(/\bsub-prefix of ([A-Z]{3})\b/);
    if (note.includes('no spec directory')) continue;

    if (!CAPABILITY_PATH_RE.test(path)) {
      failures.push(`${prefix}: ${path || '(empty)'} is not a two-level canonical path`);
      continue;
    }

    const target = join(mainSpecsRoot, ...path.split('/'), 'spec.md');
    if (!existsSync(target)) {
      failures.push(`${prefix}: ${path} does not resolve to openspec/specs/${path}/spec.md`);
      continue;
    }

    if (subPrefixMatch) {
      const owner = subPrefixMatch[1];
      const ownerPath = registryValue[owner];
      if (!ownerPath) {
        failures.push(`${prefix}: documented sub-prefix owner ${owner} is missing`);
      } else if (String(ownerPath).trim() !== path) {
        failures.push(`${prefix}: documented sub-prefix owner ${owner} maps to ${ownerPath}, not ${path}`);
      }
    }
    liveEntries.push({ prefix, path, subPrefixMatch });
  }

  const ownersByPath = new Map();
  for (const entry of liveEntries) {
    if (!ownersByPath.has(entry.path)) ownersByPath.set(entry.path, []);
    ownersByPath.get(entry.path).push(entry);
  }
  for (const [path, entries] of ownersByPath) {
    if (entries.length < 2) continue;
    const primaryOwners = entries.filter(({ subPrefixMatch }) => !subPrefixMatch);
    if (primaryOwners.length !== 1 || entries.some(({ subPrefixMatch }) => !subPrefixMatch && primaryOwners.length !== 1)) {
      failures.push(`${path}: multiple live prefixes require one owner and documented sub-prefix aliases`);
    }
  }

  return failures;
}

function registryPrefixEntries(registryValue, metadata) {
  const entries = new Map();
  if (!registryValue || typeof registryValue !== 'object' || Array.isArray(registryValue)) return entries;
  for (const [prefix, rawPath] of Object.entries(registryValue)) {
    entries.set(prefix, {
      path: String(rawPath).trim(),
      retired: (metadata.get(prefix)?.comment ?? '').includes('no spec directory'),
    });
  }
  return entries;
}

function stripFencedCodeBlocks(content) {
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

function canonicalCapabilityPath(file, specsRoot) {
  const parts = relative(specsRoot, file).replace(/\\/g, '/').split('/');
  if (parts.length !== 3 || parts[2] !== 'spec.md') return null;
  const path = `${parts[0]}/${parts[1]}`;
  return CAPABILITY_PATH_RE.test(path) ? path : null;
}

function walkMarkdown(dir, onFile) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, onFile);
    else if (entry.name.endsWith('.md')) onFile(full, stripFencedCodeBlocks(readFileSync(full, 'utf-8')));
  }
}

function collectOccurrences(dir, sink, { change = null, specsRoot, onSpec } = {}) {
  walkMarkdown(dir, (file, content) => {
    const capabilityPath = canonicalCapabilityPath(file, specsRoot);
    onSpec?.(file, capabilityPath);
    for (const line of content.split('\n')) {
      const declared = REQ_HEADER_RE.test(line);
      for (const match of line.matchAll(/[A-Z]{3}-\d{3}/g)) {
        if (BUG_ID_RE.test(match[0])) continue;
        sink.push({ id: match[0], file, declared, change, capabilityPath });
      }
    }
  });
}

function collectMainSpecInventory(specsDir) {
  const occurrences = [];
  const mainSpecs = new Map();
  collectOccurrences(specsDir, occurrences, {
    specsRoot: specsDir,
    onSpec(_file, capabilityPath) {
      if (!capabilityPath) return;
      if (!mainSpecs.has(capabilityPath)) {
        mainSpecs.set(capabilityPath, { exists: true, declarationCounts: new Map() });
      }
    },
  });
  for (const occurrence of occurrences) {
    if (!occurrence.declared || !occurrence.capabilityPath) continue;
    const mainSpec = mainSpecs.get(occurrence.capabilityPath);
    mainSpec.declarationCounts.set(
      occurrence.id,
      (mainSpec.declarationCounts.get(occurrence.id) ?? 0) + 1,
    );
  }
  return { occurrences, mainSpecs };
}

function collectActiveChanges(changesDir) {
  if (!existsSync(changesDir)) return [];
  return readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => ({
      change: entry.name,
      root: join(changesDir, entry.name),
      specsRoot: join(changesDir, entry.name, 'specs'),
    }));
}

function collectDeltaOccurrences(activeChanges) {
  const occurrences = [];
  for (const activeChange of activeChanges) {
    collectOccurrences(activeChange.specsRoot, occurrences, {
      change: activeChange.change,
      specsRoot: activeChange.specsRoot,
    });
  }
  return occurrences;
}

function collectReservationRecords(activeChanges) {
  const records = [];
  const failures = [];
  const claimedOwnerKeys = new Set();
  for (const activeChange of activeChanges) {
    const file = join(activeChange.root, 'requirement-reservation.yaml');
    if (!existsSync(file)) continue;
    let raw;
    try {
      raw = parseYaml(readFileSync(file, 'utf-8'));
    } catch (error) {
      failures.push({
        code: 'reservation_yaml_invalid',
        change: activeChange.change,
        file,
        message: error.message,
      });
      continue;
    }
    for (const id of collectRequirementReservationClaims(raw)) {
      claimedOwnerKeys.add(changeIdKey(activeChange.change, id));
    }
    const parsed = parseRequirementReservation(raw, { expectedChange: activeChange.change });
    if (!parsed.ok) {
      for (const issue of parsed.issues) {
        failures.push({
          code: issue.code,
          change: activeChange.change,
          file,
          message: `${issue.path}: ${issue.message}`,
        });
      }
      continue;
    }
    records.push({ change: activeChange.change, file, record: parsed.record });
  }
  return { records, failures, claimedOwnerKeys };
}

function printReservationFailures(failures) {
  if (failures.length === 0) return false;
  console.error('Invalid change-local requirement reservations:');
  for (const failure of failures) {
    console.error(`  ${failure.change}: ${failure.file}: ${failure.message}`);
  }
  return true;
}

const { root, mode, change: selectedChange } = parseCli();
const registryPath = join(root, 'openspec', 'governance', 'req-registry.yaml');
const specsDir = join(root, 'openspec', 'specs');
const changesDir = join(root, 'openspec', 'changes');

if (!existsSync(registryPath)) {
  console.error('Registry not found:', registryPath);
  process.exit(1);
}

let registry;
try {
  registry = parseYaml(readFileSync(registryPath, 'utf-8'));
} catch (error) {
  console.error(`Registry cannot be parsed: ${error.message}`);
  process.exit(1);
}
if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
  console.error('Registry must be a YAML mapping.');
  process.exit(1);
}

const registryText = readFileSync(registryPath, 'utf-8');
const allEntries = Object.entries(registry).filter(([id]) => ID_RE.test(id));
const retired = new Set(
  allEntries.filter(([, value]) => String(value).toUpperCase().includes('DEPRECATED')).map(([id]) => id),
);
const registered = new Set(allEntries.map(([id]) => id));
const metadata = prefixMetadata(registryText);
const prefixFailures = validatePrefixTargets(registry.prefixes, metadata, specsDir);
const prefixEntries = registryPrefixEntries(registry.prefixes, metadata);
const activeChanges = collectActiveChanges(changesDir);
if (mode === 'archive' && !activeChanges.some(({ change }) => change === selectedChange)) {
  usage(`Selected change is not active: ${selectedChange}`);
}

const { occurrences: specOccurrences, mainSpecs } = collectMainSpecInventory(specsDir);
const deltaOccurrences = collectDeltaOccurrences(activeChanges);
const reservationInventory = collectReservationRecords(activeChanges);
const reservationEvaluation = evaluateRequirementReservations({
  records: reservationInventory.records,
  registryPrefixes: prefixEntries,
  registeredIds: registered,
  retiredIds: retired,
  mainSpecs,
  deltaOccurrences,
  mode,
  selectedChange,
});
const reservationFailures = [
  ...reservationInventory.failures,
  ...reservationEvaluation.failures,
];
const reservationClaimedOwnerKeys = new Set([
  ...reservationInventory.claimedOwnerKeys,
  ...reservationEvaluation.claimedOwnerKeys,
]);

const specIdSet = new Set(specOccurrences.map(({ id }) => id));
const deltaIdSet = new Set(deltaOccurrences.map(({ id }) => id));
const allSeen = new Set([...specIdSet, ...deltaIdSet]);
const deltaDeclaredSet = new Set(deltaOccurrences.filter(({ declared }) => declared).map(({ id }) => id));

const specIdFiles = new Map();
for (const { id, file, declared } of specOccurrences) {
  if (!declared) continue;
  if (!specIdFiles.has(id)) specIdFiles.set(id, new Set());
  specIdFiles.get(id).add(file);
}
const duplicates = [...specIdFiles.entries()].filter(([, files]) => files.size > 1).map(([id]) => id);

const unregistered = new Set();
for (const occurrence of [...specOccurrences, ...deltaOccurrences]) {
  if (registered.has(occurrence.id)) continue;
  if (occurrence.change) {
    const ownerKey = changeIdKey(occurrence.change, occurrence.id);
    if (reservationEvaluation.pendingOwnerKeys.has(ownerKey)) continue;
    if (reservationClaimedOwnerKeys.has(ownerKey)) continue;
  }
  unregistered.add(occurrence.id);
}

const orphans = [...registered].filter(
  (id) => !retired.has(id) && !specIdSet.has(id) && !deltaIdSet.has(id),
);
const reusedRetired = [...deltaDeclaredSet].filter((id) => retired.has(id));

let failed = false;
if (duplicates.length > 0) {
  console.error('Duplicate IDs (same id in >=2 spec files):');
  for (const id of duplicates) {
    const files = [...specIdFiles.get(id)].map((file) => file.replace(`${root}/`, ''));
    console.error(`  ${id}: ${files.join(', ')}`);
  }
  failed = true;
}
if (printReservationFailures(reservationFailures)) failed = true;
if (unregistered.size > 0) {
  console.error('Unregistered IDs (in specs/delta but not in registry):', [...unregistered].join(', '));
  failed = true;
}
if (orphans.length > 0) {
  console.error('Orphan IDs (in registry but not alive / pending / retired):');
  for (const id of orphans) console.error(`  ${id}: ${String(registry[id]).trim()}`);
  console.error('  Legitimate retirement -> mark the registry entry [DEPRECATED]; suspected loss -> recover or rebuild the main spec body.');
  failed = true;
}
if (reusedRetired.length > 0) {
  console.error('Reused retired IDs (active change re-adds a [DEPRECATED] id):', reusedRetired.join(', '));
  failed = true;
}
if (prefixFailures.length > 0) {
  console.error('Invalid live prefix targets:');
  for (const failure of prefixFailures) console.error(`  ${failure}`);
  failed = true;
}
if (failed) process.exit(1);

console.log(
  `All project requirement IDs consistent (${mode}): ${registered.size} registered` +
  ` (${retired.size} retired, ${orphans.length} orphan), ${specOccurrences.length + deltaOccurrences.length} occurrences in main specs/active deltas.`,
);
