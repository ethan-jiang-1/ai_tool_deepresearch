// @impl ARP-004, ARP-005, RRD-008, POF-001
// The primary Final series is derived only from safe direct-root inventory facts.
// It deliberately has no lifecycle, content, profile, mtime, or chat dependency.

import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

export const FINAL_REPORT_SERIES_SCHEMA_VERSION = 'final-report-series.v1';

export const FinalReportFeatureSchema = z.string().regex(
  /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
  'feature must be safe lowercase snake case',
);

export const FinalReportRootEntrySchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['file', 'directory', 'symlink', 'other']),
  readable: z.boolean(),
}).strict();

export const FinalReportRootEntriesSchema = z.array(FinalReportRootEntrySchema);

export const FinalReportSeriesBlockerSchema = z.object({
  code: z.enum([
    'duplicate_entry',
    'unsafe_entry_name',
    'unsafe_entry',
    'case_fold_collision',
    'reserved_name_malformed',
    'duplicate_revision',
    'orphan_revision',
    'orphan_auxiliary_directory',
    'non_contiguous_revisions',
    'ambiguous_legacy_base',
  ]),
  detail: z.string().min(1),
  entries: z.array(z.string().min(1)).min(1),
}).strict();

const PrimaryEntrySchema = z.object({
  target: z.string().regex(/^final\/[A-Za-z0-9_.-]+\.md$/),
  name: z.string().min(1),
  kind: z.enum(['modern_base', 'legacy_base', 'revision']),
  version: z.number().int().nonnegative(),
  feature: FinalReportFeatureSchema.nullable(),
}).strict();

const InventoryEntrySchema = FinalReportRootEntrySchema.extend({
  target: z.string().regex(/^final\/.+$/),
  classification: z.enum(['modern_base', 'legacy_candidate', 'revision', 'supplementary', 'auxiliary', 'invalid']),
  version: z.number().int().nonnegative().nullable(),
  feature: FinalReportFeatureSchema.nullable(),
}).strict();

export const FinalReportSeriesResultSchema = z.object({
  schema_version: z.literal(FINAL_REPORT_SERIES_SCHEMA_VERSION),
  valid: z.boolean(),
  classification: z.enum(['empty', 'modern', 'legacy', 'invalid']),
  entries: z.array(InventoryEntrySchema),
  primary_entries: z.array(PrimaryEntrySchema),
  base: PrimaryEntrySchema.nullable(),
  latest: PrimaryEntrySchema.nullable(),
  next_version: z.number().int().nonnegative().nullable(),
  blockers: z.array(FinalReportSeriesBlockerSchema),
}).strict().superRefine((value, context) => {
  if (value.valid !== (value.classification !== 'invalid')) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['valid'], message: 'valid must agree with classification' });
  }
  if (value.valid && value.blockers.length !== 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['blockers'], message: 'valid series cannot retain blockers' });
  }
  if (!value.valid && value.blockers.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['blockers'], message: 'invalid series requires blockers' });
  }
  if (value.classification === 'empty') {
    if (value.base !== null || value.latest !== null || value.primary_entries.length !== 0 || value.next_version !== 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['classification'], message: 'empty series must have no base or primary entries and allocate version zero' });
    }
  }
  if (value.classification === 'modern' || value.classification === 'legacy') {
    if (value.base === null || value.latest === null || value.next_version === null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['base'], message: 'valid non-empty series requires base, latest, and next version' });
    }
  }
  if (value.classification === 'invalid' && value.next_version !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['next_version'], message: 'invalid series cannot allocate a version' });
  }
});

export const FinalReportAllocationSchema = z.object({
  available: z.boolean(),
  classification: z.enum(['empty', 'modern', 'legacy', 'invalid']),
  target: z.string().regex(/^final\/[a-z0-9_]+(?:_v[1-9][0-9]*)?\.md$/).nullable(),
  version: z.number().int().nonnegative().nullable(),
  feature: FinalReportFeatureSchema.nullable(),
  previous_target: z.string().regex(/^final\/[A-Za-z0-9_.-]+\.md$/).nullable(),
  blockers: z.array(FinalReportSeriesBlockerSchema),
}).strict().superRefine((value, context) => {
  if (value.available && (value.target === null || value.version === null || value.blockers.length !== 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['target'], message: 'available allocation requires target/version and no blockers' });
  }
  if (!value.available && (value.target !== null || value.version !== null || value.blockers.length === 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['target'], message: 'unavailable allocation requires blockers and no target/version' });
  }
});

export const FinalReportInventoryEntrySchema = z.object({
  path: z.string().regex(/^final\/.+$/),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export const FinalReportInventorySchema = z.object({
  primary_series: FinalReportSeriesResultSchema,
  entries: z.array(FinalReportInventoryEntrySchema),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  primary_sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

// NOTE: digests `entries` exactly in the order given — this function does NOT
// sort. Callers own the canonical order: the legacy whole-tree digest relies on
// the plain byte order produced by readSafeRecursiveInventory (both the ReopenResearchPass
// binding and the append proof consume that same order), while the
// primary-series digest sorts via digestFinalReportPrimarySeriesEntries before
// delegating here. Never feed this helper a set whose order is not the same one
// the digest it is compared against was computed with.
export function digestFinalReportInventoryEntries(entries) {
  return canonicalDigest(z.array(FinalReportInventoryEntrySchema).parse(entries));
}

// Primary-series-scoped witness digest: the canonical Final lineage is the
// primary series (base + contiguous revisions), so the immutable-append proof
// binds this digest instead of the whole `final/` tree. Non-primary
// presentation files (for example `final/topics/*.md`) may change legally
// after final without touching the lineage witness.
export function digestFinalReportPrimarySeriesEntries(entries, primarySeries) {
  const primaryPaths = new Set(
    FinalReportSeriesResultSchema.parse(primarySeries).primary_entries.map((entry) => entry.target),
  );
  const primaryEntries = z.array(FinalReportInventoryEntrySchema)
    .parse(entries)
    .filter((entry) => primaryPaths.has(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path));
  return digestFinalReportInventoryEntries(primaryEntries);
}

export class FinalReportSeriesFilesystemError extends Error {
  constructor(message, code = 'final_inventory_invalid') {
    super(message);
    this.name = 'FinalReportSeriesFilesystemError';
    this.code = code;
  }
}

const MODERN_BASE_NAME = 'final.md';
const UNLABELLED_REVISION_RE = /^final_v([1-9][0-9]*)\.md$/;
const LABELLED_REVISION_RE = /^final_([a-z0-9]+(?:_[a-z0-9]+)*)_v([1-9][0-9]*)\.md$/;
const UNLABELLED_AUX_DIRECTORY_RE = /^final_v([1-9][0-9]*)$/;
const LABELLED_AUX_DIRECTORY_RE = /^final_([a-z0-9]+(?:_[a-z0-9]+)*)_v([1-9][0-9]*)$/;
const RESERVED_MARKDOWN_RE = /^final.*\.md$/i;
const DIRECT_NAME_RE = /[\\/\0]/;

function targetFor(name) {
  return `final/${name}`;
}

function compareNames(left, right) {
  return left.name.localeCompare(right.name) || left.kind.localeCompare(right.kind);
}

function blocker(code, detail, entries) {
  return { code, detail, entries: [...new Set(entries)].sort() };
}

function isUnsafeName(name) {
  return name === '.' || name === '..' || DIRECT_NAME_RE.test(name);
}

function markdownName(name) {
  return /\.md$/i.test(name);
}

function classifyName(name) {
  if (name === MODERN_BASE_NAME) return { classification: 'modern_base', version: 0, feature: null };
  const unlabelled = name.match(UNLABELLED_REVISION_RE);
  if (unlabelled) return { classification: 'revision', version: Number(unlabelled[1]), feature: null };
  const labelled = name.match(LABELLED_REVISION_RE);
  if (labelled) return { classification: 'revision', version: Number(labelled[2]), feature: labelled[1] };
  if (RESERVED_MARKDOWN_RE.test(name)) return { classification: 'invalid', version: null, feature: null };
  return { classification: markdownName(name) ? 'legacy_candidate' : 'supplementary', version: null, feature: null };
}

/**
 * Bind a directory name to a primary revision by exact name equality: the
 * directory name must equal a canonical revision filename with its `.md`
 * suffix removed. Returns null for version-decoupled directory names.
 */
function classifyAuxiliaryDirectoryName(name) {
  const unlabelled = name.match(UNLABELLED_AUX_DIRECTORY_RE);
  if (unlabelled) return { version: Number(unlabelled[1]), feature: null };
  const labelled = name.match(LABELLED_AUX_DIRECTORY_RE);
  if (labelled) return { version: Number(labelled[2]), feature: labelled[1] };
  return null;
}

function classifyEntry(entry, { modernBasePresent = false } = {}) {
  if (entry.kind === 'directory') {
    const auxiliary = classifyAuxiliaryDirectoryName(entry.name);
    return auxiliary
      ? { classification: 'auxiliary', ...auxiliary }
      : { classification: 'supplementary', version: null, feature: null };
  }
  if (entry.kind !== 'file' || !entry.readable || isUnsafeName(entry.name)) {
    return { classification: 'invalid', version: null, feature: null };
  }
  const named = classifyName(entry.name);
  if (modernBasePresent && named.classification === 'legacy_candidate') {
    return { classification: 'supplementary', version: null, feature: null };
  }
  return named;
}

function primaryEntry(entry, kind, version, feature = null) {
  return {
    target: targetFor(entry.name),
    name: entry.name,
    kind,
    version,
    feature,
  };
}

/**
 * Resolve the bundle-wide Final primary series from direct-root entry facts.
 * The argument must be an inventory snapshot, never a lifecycle or content view.
 */
export function resolveFinalReportSeries(entries) {
  const input = FinalReportRootEntriesSchema.parse(entries).slice().sort(compareNames);
  const blockers = [];
  const names = new Map();
  const caseFolded = new Map();
  const revisions = [];
  const modernBases = [];
  const legacyCandidates = [];

  for (const entry of input) {
    const bucket = names.get(entry.name) || [];
    bucket.push(entry);
    names.set(entry.name, bucket);

    const folded = entry.name.toLowerCase();
    const foldBucket = caseFolded.get(folded) || [];
    foldBucket.push(entry);
    caseFolded.set(folded, foldBucket);

    if (isUnsafeName(entry.name)) continue;
    if (entry.kind !== 'file' || !entry.readable) continue;
    const named = classifyName(entry.name);
    if (named.classification === 'modern_base') modernBases.push(entry);
    if (named.classification === 'revision') revisions.push({ entry, ...named });
    if (named.classification === 'legacy_candidate') legacyCandidates.push(entry);
  }

  for (const [name, candidates] of names) {
    if (candidates.length > 1) blockers.push(blocker('duplicate_entry', 'Final inventory contains duplicate direct-root entry names.', [name]));
  }
  for (const entry of input) {
    if (isUnsafeName(entry.name)) blockers.push(blocker('unsafe_entry_name', 'Final inventory entry is not a safe direct-root name.', [entry.name]));
    if (entry.kind !== 'directory' && (entry.kind !== 'file' || !entry.readable)) blockers.push(blocker('unsafe_entry', 'Final inventory entry must be a readable non-symlink regular file or a supplementary directory.', [entry.name]));
  }
  for (const candidates of caseFolded.values()) {
    if (candidates.length > 1) blockers.push(blocker('case_fold_collision', 'Final inventory has names that collide under case-folding.', candidates.map((entry) => entry.name)));
  }
  for (const entry of input) {
    if (!isUnsafeName(entry.name) && RESERVED_MARKDOWN_RE.test(entry.name) && classifyName(entry.name).classification === 'invalid') {
      blockers.push(blocker('reserved_name_malformed', 'Reserved Final Markdown names must use the exact canonical base or revision grammar.', [entry.name]));
    }
  }

  const revisionsByVersion = new Map();
  for (const revision of revisions) {
    const candidates = revisionsByVersion.get(revision.version) || [];
    candidates.push(revision);
    revisionsByVersion.set(revision.version, candidates);
  }
  for (const [version, candidates] of revisionsByVersion) {
    if (candidates.length > 1) blockers.push(blocker('duplicate_revision', `Final revision ${version} appears more than once.`, candidates.map(({ entry }) => entry.name)));
  }

  const hasLegacyBase = modernBases.length === 0 && legacyCandidates.length === 1;
  if (modernBases.length === 0 && revisions.length > 0 && !hasLegacyBase) {
    blockers.push(blocker('orphan_revision', 'Canonical revisions require one modern or legacy version-zero base.', revisions.map(({ entry }) => entry.name)));
  }
  if (modernBases.length > 0 || hasLegacyBase) {
    const versions = [...revisionsByVersion.keys()].sort((left, right) => left - right);
    for (let expected = 1; expected <= (versions.at(-1) || 0); expected += 1) {
      if (!revisionsByVersion.has(expected)) {
        blockers.push(blocker('non_contiguous_revisions', `Final revision ${expected} is missing from the global primary sequence.`, revisions.map(({ entry }) => entry.name)));
      }
    }
  }
  if (modernBases.length === 0 && revisions.length === 0 && legacyCandidates.length > 1) {
    blockers.push(blocker('ambiguous_legacy_base', 'More than one non-reserved root-level Markdown file could be legacy version zero.', legacyCandidates.map((entry) => entry.name)));
  }

  const revisionKeys = new Set(revisions.map(({ version, feature }) => `${version}\u0000${feature ?? ''}`));
  for (const entry of input) {
    if (entry.kind !== 'directory') continue;
    const auxiliary = classifyAuxiliaryDirectoryName(entry.name);
    if (!auxiliary) continue;
    const key = `${auxiliary.version}\u0000${auxiliary.feature ?? ''}`;
    if (!revisionKeys.has(key)) {
      blockers.push(blocker('orphan_auxiliary_directory', 'Auxiliary directory has no matching primary revision of the identical name.', [entry.name]));
    }
  }

  const entryFacts = input.map((entry) => {
    const named = classifyEntry(entry, { modernBasePresent: modernBases.length > 0 });
    return {
      ...entry,
      target: targetFor(entry.name),
      classification: named.classification,
      version: named.version,
      feature: named.feature,
    };
  });

  if (blockers.length > 0) {
    return FinalReportSeriesResultSchema.parse({
      schema_version: FINAL_REPORT_SERIES_SCHEMA_VERSION,
      valid: false,
      classification: 'invalid',
      entries: entryFacts,
      primary_entries: [],
      base: null,
      latest: null,
      next_version: null,
      blockers,
    });
  }

  if (modernBases.length === 0 && revisions.length === 0 && legacyCandidates.length === 0) {
    return FinalReportSeriesResultSchema.parse({
      schema_version: FINAL_REPORT_SERIES_SCHEMA_VERSION,
      valid: true,
      classification: 'empty',
      entries: entryFacts,
      primary_entries: [],
      base: null,
      latest: null,
      next_version: 0,
      blockers: [],
    });
  }

  if (modernBases.length === 0) {
    const base = primaryEntry(legacyCandidates[0], 'legacy_base', 0);
    const orderedRevisions = revisions.slice().sort((left, right) => left.version - right.version || left.entry.name.localeCompare(right.entry.name));
    const primaryEntries = [base, ...orderedRevisions.map(({ entry, version, feature }) => primaryEntry(entry, 'revision', version, feature))];
    const latest = primaryEntries.at(-1);
    return FinalReportSeriesResultSchema.parse({
      schema_version: FINAL_REPORT_SERIES_SCHEMA_VERSION,
      valid: true,
      classification: 'legacy',
      entries: entryFacts,
      primary_entries: primaryEntries,
      base,
      latest,
      next_version: latest.version + 1,
      blockers: [],
    });
  }

  const base = primaryEntry(modernBases[0], 'modern_base', 0);
  const orderedRevisions = revisions.slice().sort((left, right) => left.version - right.version || left.entry.name.localeCompare(right.entry.name));
  const primaryEntries = [base, ...orderedRevisions.map(({ entry, version, feature }) => primaryEntry(entry, 'revision', version, feature))];
  const latest = primaryEntries.at(-1);
  return FinalReportSeriesResultSchema.parse({
    schema_version: FINAL_REPORT_SERIES_SCHEMA_VERSION,
    valid: true,
    classification: 'modern',
    entries: entryFacts,
    primary_entries: primaryEntries,
    base,
    latest,
    next_version: latest.version + 1,
    blockers: [],
  });
}

/** Allocate the next immutable primary target without touching the filesystem. */
export function allocateFinalReportTarget(series, { feature = null } = {}) {
  const parsed = FinalReportSeriesResultSchema.parse(series);
  const parsedFeature = feature === null ? null : FinalReportFeatureSchema.parse(feature);
  if (!parsed.valid) {
    return FinalReportAllocationSchema.parse({
      available: false,
      classification: parsed.classification,
      target: null,
      version: null,
      feature: null,
      previous_target: null,
      blockers: parsed.blockers,
    });
  }

  const version = parsed.next_version;
  const target = version === 0
    ? 'final/final.md'
    : parsedFeature === null
      ? `final/final_v${version}.md`
      : `final/final_${parsedFeature}_v${version}.md`;
  return FinalReportAllocationSchema.parse({
    available: true,
    classification: parsed.classification,
    target,
    version,
    feature: version === 0 ? null : parsedFeature,
    previous_target: parsed.latest?.target || null,
    blockers: [],
  });
}

function rootEntryFromFilesystem(finalRoot, name) {
  const entryPath = path.join(finalRoot, name);
  const info = lstatSync(entryPath);
  let kind = 'other';
  if (info.isSymbolicLink()) kind = 'symlink';
  else if (info.isFile()) kind = 'file';
  else if (info.isDirectory()) kind = 'directory';

  let readable = false;
  if (kind === 'file') {
    try {
      const descriptor = openSync(entryPath, 'r');
      closeSync(descriptor);
      readable = true;
    } catch {
      readable = false;
    }
  }
  return { name, kind, readable };
}

function canonicalDigest(value) {
  return createHash('sha256').update(Buffer.from(JSON.stringify(value), 'utf8')).digest('hex');
}

function readFinalRoot(bundlePath) {
  const bundle = path.resolve(bundlePath || '');
  if (!existsSync(bundle)) throw new FinalReportSeriesFilesystemError(`bundle does not exist: ${bundlePath}`, 'bundle_missing');
  const bundleInfo = lstatSync(bundle);
  if (bundleInfo.isSymbolicLink() || !bundleInfo.isDirectory()) {
    throw new FinalReportSeriesFilesystemError(`bundle is not a real directory: ${bundlePath}`, 'bundle_invalid');
  }
  const finalRoot = path.join(bundle, 'final');
  if (!existsSync(finalRoot)) throw new FinalReportSeriesFilesystemError('final directory is missing', 'final_directory_missing');
  const finalInfo = lstatSync(finalRoot);
  if (finalInfo.isSymbolicLink() || !finalInfo.isDirectory()) {
    throw new FinalReportSeriesFilesystemError('final directory is not a real directory', 'final_directory_unsafe');
  }
  return { bundle, finalRoot };
}

function readSafeRecursiveInventory(bundle, finalRoot) {
  const entries = [];
  function walk(current) {
    for (const name of readdirSync(current).sort()) {
      const absolute = path.join(current, name);
      const relative = path.relative(bundle, absolute).replaceAll('\\', '/');
      const info = lstatSync(absolute);
      if (info.isSymbolicLink()) {
        throw new FinalReportSeriesFilesystemError(`final inventory contains symlink: ${relative}`, 'final_inventory_unsafe');
      }
      if (info.isDirectory()) {
        walk(absolute);
      } else if (info.isFile()) {
        entries.push({ path: relative, sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex') });
      } else {
        throw new FinalReportSeriesFilesystemError(`final inventory contains unsupported entry: ${relative}`, 'final_inventory_unsafe');
      }
    }
  }
  walk(finalRoot);
  return entries;
}

/** Filesystem adapter for callers that need an actual `final/` inventory. */
export function readFinalReportSeries(bundlePath) {
  const { finalRoot } = readFinalRoot(bundlePath);
  return resolveFinalReportSeries(readdirSync(finalRoot).map((name) => rootEntryFromFilesystem(finalRoot, name)));
}

/**
 * Read the canonical primary classification and the complete safe Final
 * inventory from one filesystem snapshot boundary. The digest deliberately
 * retains the historic `{ path, sha256 }` shape used by ReopenResearchPass event bindings.
 */
export function readFinalReportInventory(bundlePath) {
  const { bundle, finalRoot } = readFinalRoot(bundlePath);
  const primarySeries = resolveFinalReportSeries(
    readdirSync(finalRoot).map((name) => rootEntryFromFilesystem(finalRoot, name)),
  );
  const entries = readSafeRecursiveInventory(bundle, finalRoot);
  return FinalReportInventorySchema.parse({
    primary_series: primarySeries,
    entries,
    sha256: digestFinalReportInventoryEntries(entries),
    primary_sha256: digestFinalReportPrimarySeriesEntries(entries, primarySeries),
  });
}
