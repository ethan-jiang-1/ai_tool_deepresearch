// @impl DEW-014, DEW-015

import { WorkUnitCandidateProjectionSchema } from '../schema/contracts/work-unit.mjs';

const PHASE_ORDINAL = Object.freeze({
  work_unit_index: 0,
  work_unit_record: 1,
  work_unit_status: 2,
  manifest: 3,
  beacon: 4,
  queue_binding: 5,
  result: 6,
  runtime_receipt: 7,
  direct_outputs: 8,
  output_files: 9,
  cache_trails: 10,
  source_claims: 11,
  submit_validation: 12,
});

function classify(violation) {
  if (violation.root_class === 'contract_integrity') return 'contract_integrity';
  if (violation.root_class === 'semantic_content') return 'semantic_content';
  if (violation.scope_hint === 'mechanical') return 'mechanical';
  if (['work_unit_index', 'work_unit_record', 'work_unit_status', 'manifest', 'beacon', 'queue_binding'].includes(violation.phase)) {
    return 'contract_integrity';
  }
  if (violation.phase === 'result') {
    if (/mismatch|conflict|unsafe wrapper/i.test(violation.message)) return 'contract_integrity';
    const pointer = violation.json_pointer || '';
    if (/missing required (?:field|schema_version)/i.test(violation.message)
      && /^\/(?:schema_version|work_id|queue_item_id|kind|receipt_nonce|actor_contract_version|execution_actor_class)$/.test(pointer)) {
      return 'mechanical';
    }
    return 'semantic_content';
  }
  if (violation.phase === 'runtime_receipt') {
    return /mismatch.*(?:work_id|queue_item_id|kind|nonce|actor)|nonce mismatch|actor_contract/i.test(violation.message)
      ? 'contract_integrity'
      : 'semantic_content';
  }
  if (['output_files', 'cache_trails', 'source_claims'].includes(violation.phase)) return 'semantic_content';
  return 'contract_integrity';
}

function coordinateOf(violation) {
  return violation.coordinate || violation.json_pointer || violation.write_to || violation.missing_fact || violation.code;
}

function directOrder(violation, requiredOutputs) {
  if (violation.phase !== 'direct_outputs') return Number.MAX_SAFE_INTEGER;
  const index = requiredOutputs.findIndex((required) => required.path === violation.coordinate);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function deriveWorkUnitCandidateProjection({ violations = [], workDone = false, requiredOutputs = [] } = {}) {
  const decorated = violations.map((violation, localOrder) => ({
    ...violation,
    repair_scope: classify(violation),
    _phase_ordinal: PHASE_ORDINAL[violation.phase] ?? Number.MAX_SAFE_INTEGER,
    _direct_order: directOrder(violation, requiredOutputs),
    _coordinate: coordinateOf(violation),
    _local_order: localOrder,
  })).sort((left, right) => (
    left._phase_ordinal - right._phase_ordinal
    || left._direct_order - right._direct_order
    || left._coordinate.localeCompare(right._coordinate)
    || left._local_order - right._local_order
  ));

  const publicViolations = decorated.map(({ _phase_ordinal, _direct_order, _coordinate, _local_order, scope_hint, ...violation }) => violation);
  if (publicViolations.length === 0) {
    return {
      violations: publicViolations,
      projection: WorkUnitCandidateProjectionSchema.parse({ recommended_action: 'submit', primary_root_code: null }),
    };
  }
  const winningScope = ['contract_integrity', 'semantic_content', 'mechanical']
    .find((scope) => publicViolations.some((violation) => violation.repair_scope === scope));
  const primary = publicViolations.find((violation) => violation.repair_scope === winningScope);
  const recommendedAction = winningScope === 'contract_integrity'
    ? 'inspect_contract'
    : winningScope === 'semantic_content'
      ? workDone ? 'fail_and_replace' : 'return_to_actor'
      : 'repair_same_candidate';
  return {
    violations: publicViolations,
    projection: WorkUnitCandidateProjectionSchema.parse({
      recommended_action: recommendedAction,
      primary_root_code: primary.code,
    }),
  };
}

export function mapCandidateProjectionToTimeout(candidateProjection) {
  const projection = WorkUnitCandidateProjectionSchema.parse(candidateProjection);
  const action = projection.recommended_action;
  if (action === 'submit') return { recommended_action: 'submit', advice: [] };
  if (action === 'repair_same_candidate') return { recommended_action: 'repair', advice: [] };
  if (action === 'return_to_actor') return { recommended_action: 'repair', advice: ['Return actor-owned semantic facts to the selected actor before work_done.'] };
  if (action === 'fail_and_replace') {
    return {
      recommended_action: 'block',
      advice: [`Fail this attempt with semantic_contract:${projection.primary_root_code}, then explicitly enqueue the same assignment under a fresh queue ID.`],
    };
  }
  return { recommended_action: 'inspect', advice: [] };
}
