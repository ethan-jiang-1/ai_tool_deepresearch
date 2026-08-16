// @impl SEF-001, SEF-002, SEF-004
import { isAbsolute, posix } from 'node:path';
import { z } from 'zod';

export const SEMANTIC_FACT_FAMILIES_SCHEMA_VERSION = 'semantic-fact-families/v1';
export const SEMANTIC_CLOSURE_SCHEMA_VERSION = 'semantic-closure/v1';

const NonEmptyString = z.string().trim().min(1);
const CHANGE_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FAMILY_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export const ChangeNameSchema = z.string().regex(CHANGE_NAME_RE, 'must be safe kebab-case');
export const SemanticFactFamilyIdSchema = z.string().regex(FAMILY_ID_RE, 'must be a dotted semantic fact family ID');

export function splitRepositoryCoordinate(value) {
  const coordinate = String(value).trim();
  const fragmentIndex = coordinate.indexOf('#');
  if (fragmentIndex < 0) return { path: coordinate, fragment: null };
  return {
    path: coordinate.slice(0, fragmentIndex),
    fragment: coordinate.slice(fragmentIndex + 1),
  };
}

export function repositoryCoordinatePath(value) {
  return splitRepositoryCoordinate(value).path;
}

export function repositoryCoordinateIssue(value) {
  const { path, fragment } = splitRepositoryCoordinate(value);
  if (!path) return 'must name a repository-relative file path';
  if (fragment !== null && !fragment.trim()) return 'must not end with an empty fragment';
  if (path.includes('\\') || isAbsolute(path) || path.startsWith('/')) {
    return 'must be a POSIX repository-relative path';
  }
  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return 'must not contain empty, dot, or traversal segments';
  }
  if (posix.normalize(path) !== path || path.startsWith('../')) {
    return 'must remain inside the repository after normalization';
  }
  return null;
}

export const RepositoryCoordinateSchema = NonEmptyString.superRefine((value, context) => {
  const issue = repositoryCoordinateIssue(value);
  if (issue) context.addIssue({ code: z.ZodIssueCode.custom, message: issue });
});

function coordinateList(label) {
  return z.array(RepositoryCoordinateSchema).min(1).superRefine((coordinates, context) => {
    const seen = new Set();
    for (const [index, coordinate] of coordinates.entries()) {
      const key = repositoryCoordinatePath(coordinate);
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `${label} coordinates must be unique by file path`,
        });
      }
      seen.add(key);
    }
  });
}

export const SemanticFactFamilySchema = z.object({
  id: SemanticFactFamilyIdSchema,
  bounded_question: NonEmptyString,
}).strict();

export const SemanticFactFamiliesSchema = z.object({
  schema_version: z.literal(SEMANTIC_FACT_FAMILIES_SCHEMA_VERSION),
  families: z.array(SemanticFactFamilySchema).min(1),
}).strict().superRefine((catalog, context) => {
  const seen = new Set();
  for (const [index, family] of catalog.families.entries()) {
    if (seen.has(family.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['families', index, 'id'],
        message: 'family IDs must be unique',
      });
    }
    seen.add(family.id);
  }
});

const RealOverlapSchema = z.object({
  coordinate: RepositoryCoordinateSchema,
  relation: z.enum(['authoritative', 'derived', 'retired']),
  detail: NonEmptyString,
}).strict();

const NoOverlapSchema = z.object({
  relation: z.literal('none'),
  detail: NonEmptyString,
}).strict();

export const OverlapSchema = z.union([RealOverlapSchema, NoOverlapSchema]);

const OverlapListSchema = z.array(OverlapSchema).min(1).superRefine((overlap, context) => {
  const noneEntries = overlap.filter((entry) => entry.relation === 'none');
  if (noneEntries.length > 0 && overlap.length !== 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`relation: none` must be the sole overlap entry',
    });
  }

  const seen = new Set();
  for (const [index, entry] of overlap.entries()) {
    if (entry.relation === 'none') continue;
    const key = repositoryCoordinatePath(entry.coordinate);
    if (seen.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'coordinate'],
        message: 'real overlap coordinates must be unique by file path',
      });
    }
    seen.add(key);
  }
});

export const AffectedSemanticFactSchema = z.object({
  family: SemanticFactFamilyIdSchema,
  fact: NonEmptyString,
  authority: z.object({
    resolver: RepositoryCoordinateSchema,
  }).strict(),
  established_by: coordinateList('established_by'),
  consumers: coordinateList('consumer'),
  overlap: OverlapListSchema,
  verification: z.object({
    truth_table: RepositoryCoordinateSchema,
    cross_surface: RepositoryCoordinateSchema,
  }).strict(),
}).strict().superRefine((entry, context) => {
  if (repositoryCoordinatePath(entry.verification.truth_table) === repositoryCoordinatePath(entry.verification.cross_surface)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['verification', 'cross_surface'],
      message: 'truth_table and cross_surface must name distinct verification assets',
    });
  }
});

const NotApplicableRecordSchema = z.object({
  schema_version: z.literal(SEMANTIC_CLOSURE_SCHEMA_VERSION),
  change: ChangeNameSchema,
  status: z.literal('not_applicable'),
  reason: NonEmptyString,
}).strict();

const AffectedRecordSchema = z.object({
  schema_version: z.literal(SEMANTIC_CLOSURE_SCHEMA_VERSION),
  change: ChangeNameSchema,
  status: z.literal('affected'),
  catalog_additions: z.array(SemanticFactFamilySchema),
  affected: z.array(AffectedSemanticFactSchema).min(1),
}).strict();

export const SemanticClosureRecordSchema = z.discriminatedUnion('status', [
  NotApplicableRecordSchema,
  AffectedRecordSchema,
]).superRefine((record, context) => {
  if (record.status !== 'affected') return;

  const affectedCounts = new Map();
  for (const [index, entry] of record.affected.entries()) {
    const prior = affectedCounts.get(entry.family) ?? [];
    prior.push(index);
    affectedCounts.set(entry.family, prior);
  }
  for (const [family, indexes] of affectedCounts) {
    if (indexes.length < 2) continue;
    for (const index of indexes.slice(1)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['affected', index, 'family'],
        message: `affected family ${family} must appear exactly once`,
      });
    }
  }

  const additionCounts = new Map();
  for (const [index, addition] of record.catalog_additions.entries()) {
    const prior = additionCounts.get(addition.id) ?? [];
    prior.push(index);
    additionCounts.set(addition.id, prior);
  }
  for (const [family, indexes] of additionCounts) {
    if (indexes.length > 1) {
      for (const index of indexes.slice(1)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['catalog_additions', index, 'id'],
          message: `catalog addition ${family} must be unique`,
        });
      }
    }
    const useCount = affectedCounts.get(family)?.length ?? 0;
    if (useCount !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['catalog_additions', indexes[0], 'id'],
        message: `catalog addition ${family} must be used by exactly one affected entry`,
      });
    }
  }
});

function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || 'document',
    message: issue.message,
  }));
}

export function parseSemanticFactFamilies(value) {
  const parsed = SemanticFactFamiliesSchema.safeParse(value);
  return parsed.success
    ? { ok: true, catalog: parsed.data }
    : { ok: false, issues: formatIssues(parsed.error) };
}

export function parseSemanticClosureRecord(value, { expectedChange } = {}) {
  const parsed = SemanticClosureRecordSchema.safeParse(value);
  if (!parsed.success) return { ok: false, issues: formatIssues(parsed.error) };
  if (expectedChange && parsed.data.change !== expectedChange) {
    return {
      ok: false,
      issues: [{ path: 'change', message: `must equal selected change ${expectedChange}` }],
    };
  }
  return { ok: true, record: parsed.data };
}
