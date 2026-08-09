// @impl RET-001
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RequirementReservationDocumentSchema,
  collectRequirementReservationClaims,
  evaluateRequirementReservations,
  parseRequirementReservation,
} from '../../openspec/governance/requirement-reservation-contract.mjs';

const CHANGE = 'add-example-capability';
const PATH = 'governance/example-capability';
const IDS = ['EXM-001', 'EXM-002'];

function document(change = CHANGE, overrides = {}) {
  return {
    schema_version: 'requirement-reservation/v1',
    change,
    reservations: [{
      capability_path: PATH,
      prefix: 'EXM',
      requirements: IDS,
    }],
    ...overrides,
  };
}

function deltaOccurrences(change = CHANGE, path = PATH, ids = IDS) {
  return ids.map((id) => ({ change, capabilityPath: path, id, declared: true }));
}

function evaluate(record, overrides = {}) {
  return evaluateRequirementReservations({
    records: [{ change: record.change, file: `openspec/changes/${record.change}/requirement-reservation.yaml`, record }],
    registryPrefixes: new Map(),
    registeredIds: new Set(),
    retiredIds: new Set(),
    mainSpecs: new Map(),
    deltaOccurrences: deltaOccurrences(record.change),
    ...overrides,
  });
}

describe('requirement reservation contract', () => {
  it('accepts the exact closed document form and its expected active change', () => {
    const parsed = parseRequirementReservation(document(), { expectedChange: CHANGE });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.record.reservations[0].prefix, 'EXM');

    const mismatched = parseRequirementReservation(document(), { expectedChange: 'other-change' });
    assert.equal(mismatched.ok, false);
    assert.deepEqual(mismatched.issues, [{
      code: 'reservation_change_mismatch',
      path: 'change',
      message: 'must equal active change other-change',
    }]);
  });

  it('rejects extra fields, prefix mismatches, and duplicate reservation identity', () => {
    const extra = document(CHANGE, { extra: true });
    assert.equal(RequirementReservationDocumentSchema.safeParse(extra).success, false);

    const badPrefix = document(CHANGE, {
      reservations: [{ capability_path: PATH, prefix: 'EXM', requirements: ['BAD-001'] }],
    });
    assert.equal(RequirementReservationDocumentSchema.safeParse(badPrefix).success, false);

    const duplicate = document(CHANGE, {
      reservations: [
        { capability_path: PATH, prefix: 'EXM', requirements: IDS },
        { capability_path: PATH, prefix: 'EX2', requirements: ['EX2-001'] },
      ],
    });
    assert.equal(RequirementReservationDocumentSchema.safeParse(duplicate).success, false);
  });

  it('accepts a complete pending reservation and exposes same-change ownership', () => {
    const record = parseRequirementReservation(document(), { expectedChange: CHANGE }).record;
    const result = evaluate(record);

    assert.deepEqual(result.failures, []);
    assert.equal(result.states[0].state, 'pending');
    assert.equal(result.pendingOwnerKeys.has(`${CHANGE}\u0000EXM-001`), true);
    assert.equal(result.pendingOwnerKeys.has(`${CHANGE}\u0000EXM-002`), true);
  });

  it('accepts a complete transitioned reservation, including selected archive mode', () => {
    const record = parseRequirementReservation(document(), { expectedChange: CHANGE }).record;
    const result = evaluate(record, {
      registryPrefixes: new Map([['EXM', { path: PATH, retired: false }]]),
      registeredIds: new Set(IDS),
      mainSpecs: new Map([[PATH, {
        exists: true,
        declarationCounts: new Map(IDS.map((id) => [id, 1])),
      }]]),
      mode: 'archive',
      selectedChange: CHANGE,
    });

    assert.deepEqual(result.failures, []);
    assert.equal(result.states[0].state, 'transitioned');
  });

  it('rejects a pending selected reservation in archive mode', () => {
    const record = parseRequirementReservation(document(), { expectedChange: CHANGE }).record;
    const result = evaluate(record, { mode: 'archive', selectedChange: CHANGE });

    assert.equal(result.states[0].state, 'pending');
    assert.deepEqual(result.failures.map(({ code }) => code), ['reservation_archive_transition_missing']);
  });

  it('rejects cross-change path, prefix, and ID collisions before authorization', () => {
    const first = parseRequirementReservation(document('first-change'), { expectedChange: 'first-change' }).record;
    const second = parseRequirementReservation(document('second-change'), { expectedChange: 'second-change' }).record;
    const result = evaluateRequirementReservations({
      records: [
        { change: 'first-change', file: 'first.yaml', record: first },
        { change: 'second-change', file: 'second.yaml', record: second },
      ],
      registryPrefixes: new Map(),
      registeredIds: new Set(),
      retiredIds: new Set(),
      mainSpecs: new Map(),
      deltaOccurrences: [
        ...deltaOccurrences('first-change'),
        ...deltaOccurrences('second-change'),
      ],
    });

    assert.deepEqual(result.failures.map(({ code }) => code), ['reservation_collision', 'reservation_collision']);
    assert.equal(result.pendingOwnerKeys.size, 0);
  });

  it('rejects mismatched or duplicated delta declarations and preserves malformed-record claims', () => {
    const record = parseRequirementReservation(document(), { expectedChange: CHANGE }).record;
    const result = evaluate(record, {
      deltaOccurrences: deltaOccurrences(CHANGE, 'governance/other-capability'),
    });
    assert.deepEqual(result.failures.map(({ code }) => code), ['reservation_delta_declaration_invalid']);
    assert.equal(result.pendingOwnerKeys.size, 0);

    const duplicate = evaluate(record, {
      deltaOccurrences: [
        ...deltaOccurrences(CHANGE),
        { change: CHANGE, capabilityPath: 'governance/other-capability', id: 'EXM-001', declared: true },
      ],
    });
    assert.deepEqual(duplicate.failures.map(({ code }) => code), ['reservation_delta_declaration_invalid']);
    assert.equal(duplicate.pendingOwnerKeys.size, 0);

    assert.deepEqual(collectRequirementReservationClaims({
      reservations: [{ requirements: ['EXM-001', 'not-an-id', 'EXM-001'] }],
    }), ['EXM-001']);
  });

  it('rejects partial live facts as an invalid mixed lifecycle state', () => {
    const record = parseRequirementReservation(document(), { expectedChange: CHANGE }).record;
    const result = evaluate(record, {
      registryPrefixes: new Map([['EXM', { path: PATH, retired: false }]]),
      registeredIds: new Set(['EXM-001']),
      mainSpecs: new Map([[PATH, {
        exists: true,
        declarationCounts: new Map([['EXM-001', 1]]),
      }]]),
    });

    assert.deepEqual(result.failures.map(({ code }) => code), ['reservation_lifecycle_mixed']);
  });
});
