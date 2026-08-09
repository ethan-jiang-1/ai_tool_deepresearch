// @impl RET-001
import { z } from 'zod';

export const REQUIREMENT_RESERVATION_SCHEMA_VERSION = 'requirement-reservation/v1';
export const RESERVATION_STATES = Object.freeze({
  pending: 'pending',
  transitioned: 'transitioned',
  invalid: 'invalid',
});

const CHANGE_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAPABILITY_PATH_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PREFIX_RE = /^[A-Z]{3}$/;
const REQUIREMENT_ID_RE = /^[A-Z]{3}-\d{3}$/;

export const ChangeNameSchema = z.string().regex(CHANGE_NAME_RE, 'must be safe kebab-case');
export const CapabilityPathSchema = z.string().regex(CAPABILITY_PATH_RE, 'must be a two-level canonical path');
export const PrefixSchema = z.string().regex(PREFIX_RE, 'must be a three-letter prefix');
export const RequirementIdSchema = z.string().regex(REQUIREMENT_ID_RE, 'must be a requirement ID');

export const RequirementReservationEntrySchema = z.object({
  capability_path: CapabilityPathSchema,
  prefix: PrefixSchema,
  requirements: z.array(RequirementIdSchema).min(1),
}).strict().superRefine((entry, ctx) => {
  const seen = new Set();
  for (const [index, id] of entry.requirements.entries()) {
    if (!id.startsWith(`${entry.prefix}-`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requirements', index],
        message: `must use prefix ${entry.prefix}`,
      });
    }
    if (seen.has(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requirements', index],
        message: 'must be unique within one reservation',
      });
    }
    seen.add(id);
  }
});

export const RequirementReservationDocumentSchema = z.object({
  schema_version: z.literal(REQUIREMENT_RESERVATION_SCHEMA_VERSION),
  change: ChangeNameSchema,
  reservations: z.array(RequirementReservationEntrySchema).min(1),
}).strict().superRefine((document, ctx) => {
  const paths = new Set();
  const prefixes = new Set();
  const ids = new Set();

  for (const [index, reservation] of document.reservations.entries()) {
    if (paths.has(reservation.capability_path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reservations', index, 'capability_path'],
        message: 'must be unique within one reservation document',
      });
    }
    if (prefixes.has(reservation.prefix)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reservations', index, 'prefix'],
        message: 'must be unique within one reservation document',
      });
    }
    paths.add(reservation.capability_path);
    prefixes.add(reservation.prefix);

    for (const [idIndex, id] of reservation.requirements.entries()) {
      if (ids.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reservations', index, 'requirements', idIndex],
          message: 'must be unique within one reservation document',
        });
      }
      ids.add(id);
    }
  }
});

function formatIssues(error) {
  return error.issues.map((issue) => ({
    code: 'reservation_schema_invalid',
    path: issue.path.join('.') || 'document',
    message: issue.message,
  }));
}

export function parseRequirementReservation(value, { expectedChange } = {}) {
  const parsed = RequirementReservationDocumentSchema.safeParse(value);
  if (!parsed.success) return { ok: false, issues: formatIssues(parsed.error) };
  if (expectedChange && parsed.data.change !== expectedChange) {
    return {
      ok: false,
      issues: [{
        code: 'reservation_change_mismatch',
        path: 'change',
        message: `must equal active change ${expectedChange}`,
      }],
    };
  }
  return { ok: true, record: parsed.data };
}

// Keeps malformed records from generating a second wave of generic ID noise.
export function collectRequirementReservationClaims(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  if (!Array.isArray(value.reservations)) return [];

  const claims = new Set();
  for (const reservation of value.reservations) {
    if (!reservation || typeof reservation !== 'object' || !Array.isArray(reservation.requirements)) continue;
    for (const id of reservation.requirements) {
      if (typeof id === 'string' && REQUIREMENT_ID_RE.test(id)) claims.add(id);
    }
  }
  return [...claims];
}

function key(...parts) {
  return parts.join('\u0000');
}

function addOwner(index, value, owner, collisions) {
  const prior = index.get(value);
  if (!prior) {
    index.set(value, owner);
    return;
  }
  collisions.add(key(prior.change, prior.index));
  collisions.add(key(owner.change, owner.index));
}

function mainDeclarationCount(mainSpec, id) {
  if (!mainSpec) return 0;
  if (mainSpec.declarationCounts instanceof Map) return mainSpec.declarationCounts.get(id) ?? 0;
  return mainSpec.declaredIds?.has(id) ? 1 : 0;
}

function deltaDeclarations(deltaOccurrences, change, id) {
  return deltaOccurrences.filter((occurrence) => (
    occurrence.change === change &&
    occurrence.declared &&
    occurrence.id === id
  ));
}

function invalidResult(code, message) {
  return { state: RESERVATION_STATES.invalid, code, message };
}

function evaluateReservationEntry({
  change,
  reservation,
  registryPrefixes,
  registeredIds,
  retiredIds,
  mainSpecs,
  deltaOccurrences,
}) {
  for (const id of reservation.requirements) {
    const declarations = deltaDeclarations(deltaOccurrences, change, id);
    const canonicalDeclarations = declarations.filter(
      (occurrence) => occurrence.capabilityPath === reservation.capability_path,
    );
    if (declarations.length !== 1 || canonicalDeclarations.length !== 1) {
      return invalidResult(
        'reservation_delta_declaration_invalid',
        `${id} must be declared exactly once in ${change}/specs/${reservation.capability_path}/spec.md; found ${declarations.length} declaration(s) across the active change`,
      );
    }
  }

  const prefix = registryPrefixes.get(reservation.prefix);
  const mainSpec = mainSpecs.get(reservation.capability_path);
  const mainExists = Boolean(mainSpec?.exists);
  const allUnregistered = reservation.requirements.every((id) => !registeredIds.has(id));
  const allTransitioned = reservation.requirements.every((id) => (
    registeredIds.has(id) &&
    !retiredIds.has(id) &&
    mainDeclarationCount(mainSpec, id) > 0
  ));
  const pending = !prefix && !mainExists && allUnregistered;
  if (pending) return { state: RESERVATION_STATES.pending };

  const transitioned = (
    prefix &&
    !prefix.retired &&
    prefix.path === reservation.capability_path &&
    mainExists &&
    allTransitioned
  );
  if (transitioned) return { state: RESERVATION_STATES.transitioned };

  if (prefix?.retired) {
    return invalidResult('reservation_prefix_retired', `${reservation.prefix} is retained as a retired prefix`);
  }
  if (prefix && prefix.path !== reservation.capability_path) {
    return invalidResult(
      'reservation_prefix_path_mismatch',
      `${reservation.prefix} maps to ${prefix.path}, not ${reservation.capability_path}`,
    );
  }
  if (prefix && !mainExists) {
    return invalidResult(
      'reservation_live_prefix_missing_main_spec',
      `${reservation.prefix} is live but ${reservation.capability_path} has no canonical main spec`,
    );
  }
  if (!prefix && mainExists) {
    return invalidResult(
      'reservation_main_spec_missing_live_prefix',
      `${reservation.capability_path} has a canonical main spec but ${reservation.prefix} is not live`,
    );
  }

  const missingTransition = reservation.requirements.filter((id) => (
    !registeredIds.has(id) || retiredIds.has(id) || mainDeclarationCount(mainSpec, id) === 0
  ));
  return invalidResult(
    'reservation_lifecycle_mixed',
    `reservation is neither pending nor transitioned; incomplete live facts for ${missingTransition.join(', ') || reservation.prefix}`,
  );
}

export function evaluateRequirementReservations({
  records,
  registryPrefixes,
  registeredIds,
  retiredIds,
  mainSpecs,
  deltaOccurrences,
  mode = 'plan',
  selectedChange = null,
}) {
  const failures = [];
  const claimedOwnerKeys = new Set();
  const pendingOwnerKeys = new Set();
  const states = [];
  const paths = new Map();
  const prefixes = new Map();
  const ids = new Map();
  const collisions = new Set();
  const entries = [];

  for (const recordEntry of records) {
    for (const [index, reservation] of recordEntry.record.reservations.entries()) {
      const owner = {
        change: recordEntry.change,
        file: recordEntry.file,
        index,
        reservation,
      };
      entries.push(owner);
      addOwner(paths, reservation.capability_path, owner, collisions);
      addOwner(prefixes, reservation.prefix, owner, collisions);
      for (const id of reservation.requirements) {
        claimedOwnerKeys.add(key(recordEntry.change, id));
        addOwner(ids, id, owner, collisions);
      }
    }
  }

  for (const owner of entries) {
    const ownerKey = key(owner.change, owner.index);
    if (collisions.has(ownerKey)) {
      failures.push({
        code: 'reservation_collision',
        change: owner.change,
        file: owner.file,
        message: `${owner.reservation.capability_path} / ${owner.reservation.prefix} collides with another active reservation`,
      });
      states.push({ ...owner, state: RESERVATION_STATES.invalid });
      continue;
    }

    const evaluated = evaluateReservationEntry({
      change: owner.change,
      reservation: owner.reservation,
      registryPrefixes,
      registeredIds,
      retiredIds,
      mainSpecs,
      deltaOccurrences,
    });
    states.push({ ...owner, state: evaluated.state });
    if (evaluated.state === RESERVATION_STATES.invalid) {
      failures.push({
        code: evaluated.code,
        change: owner.change,
        file: owner.file,
        message: evaluated.message,
      });
      continue;
    }
    if (evaluated.state === RESERVATION_STATES.pending) {
      for (const id of owner.reservation.requirements) pendingOwnerKeys.add(key(owner.change, id));
      if (mode === 'archive' && owner.change === selectedChange) {
        failures.push({
          code: 'reservation_archive_transition_missing',
          change: owner.change,
          file: owner.file,
          message: `${owner.reservation.prefix} remains pending; synchronize its live prefix, IDs, and canonical main-spec declarations before archive`,
        });
      }
    }
  }

  return { failures, claimedOwnerKeys, pendingOwnerKeys, states };
}
