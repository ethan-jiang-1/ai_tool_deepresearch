// @impl AGQ-013, DEW-004, DEW-009
// Work-unit assignment contract: the actor/assignment shape a claimed attempt
// must satisfy. Input: queue demand + assignment → Output: assignment contract
// facts → Consumers: claim/preflight and role-guidance surfaces.

import {
  WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
  WorkUnitOutputContractSchema,
} from '../schema/contracts/work-unit.mjs';

export const WORK_UNIT_ASSIGNMENT_RESERVED_SELECTOR_KEYS = Object.freeze([
  'required_outputs',
  'direct_contract',
  'direct_contract_id',
  'assignment_contract_version',
  'resolver_version',
  'contract_id',
]);

const RESERVED_SELECTOR_KEYS = new Set(WORK_UNIT_ASSIGNMENT_RESERVED_SELECTOR_KEYS);
const PAYLOAD_ASSIGNMENT_MODE_FEEDBACK = Object.freeze({
  kind: 'payload_assignment_mode',
  coordinate: 'payload.assignment_mode',
  json_pointer: '/payload/assignment_mode',
  allowed_values: Object.freeze(['primary', 'supplementary']),
  repair_kind: 'agent_action',
  repair_surface: 'retained_unqueued_task_card',
  rerun_operation: 'enqueue',
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findReservedSelector(value, coordinate, seen = new Set()) {
  if (!value || typeof value !== 'object') return null;
  if (seen.has(value)) return null;
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    const childCoordinate = `${coordinate}/${key}`;
    if (RESERVED_SELECTOR_KEYS.has(key)) return { key, coordinate: childCoordinate };
    const nested = findReservedSelector(child, childCoordinate, seen);
    if (nested) return nested;
  }
  return null;
}

function rejectReservedSelectors(queueItem, baseOutputContract) {
  const queueSelector = findReservedSelector(queueItem, 'queue_item');
  if (queueSelector) {
    throw new Error(`reserved assignment selector ${queueSelector.key} is forbidden at ${queueSelector.coordinate}`);
  }
  const contractSelector = findReservedSelector(baseOutputContract, 'base_output_contract');
  if (contractSelector) {
    throw new Error(`reserved assignment selector ${contractSelector.key} is forbidden at ${contractSelector.coordinate}`);
  }
}

function requireTopicBinding(queueItem, topicBinding) {
  const expectedUid = topicBinding?.topic_uid;
  const expectedSlug = topicBinding?.topic_slug;
  if (!expectedUid || !expectedSlug) throw new Error('assignment requires canonical topic binding with topic_uid and topic_slug');
  if (queueItem?.payload?.topic_uid !== expectedUid || queueItem?.payload?.topic_slug !== expectedSlug) {
    throw new Error('queue item topic binding does not match the canonical assignment topic');
  }
  return { topic_uid: expectedUid, topic_slug: expectedSlug };
}

function exactReceiptSet(actual, expected, label) {
  if (!Array.isArray(actual)) throw new Error(`${label} required_receipts must be an array`);
  if (actual.length !== expected.length || new Set(actual).size !== actual.length) {
    throw new Error(`${label} assignment receipt shape is invalid or duplicated`);
  }
  const expectedSet = new Set(expected);
  if (actual.some((receipt) => !expectedSet.has(receipt))) {
    throw new Error(`${label} assignment receipts do not match the canonical topic-bound set`);
  }
}

function validateReferenceFloorDeficit(kind, queueItem) {
  const payload = queueItem?.payload || {};
  if (!Object.hasOwn(payload, 'reference_floor_deficit')) return;
  const value = payload.reference_floor_deficit;
  if (kind !== 'wave1_topic_deepening' || payload.assignment_mode !== 'supplementary') {
    throw new Error('reference_floor_deficit is legal only on supplementary Wave1 assignments');
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('reference_floor_deficit must be a positive integer');
  }
}

function payloadAssignmentModeError() {
  const error = new Error('Wave1 assignment_mode must be primary or supplementary');
  error.assignment_contract_feedback = PAYLOAD_ASSIGNMENT_MODE_FEEDBACK;
  return error;
}

export function assignmentContractFeedbackFromError(error) {
  const feedback = error?.assignment_contract_feedback;
  if (feedback?.kind !== PAYLOAD_ASSIGNMENT_MODE_FEEDBACK.kind) return null;
  return { ...feedback, allowed_values: [...feedback.allowed_values] };
}

function requiredOutputsFor({ kind, queueItem, topicBinding }) {
  const receipts = queueItem?.required_receipts;

  if (kind === 'wave0_source_intake') {
    const { topic_slug: slug } = requireTopicBinding(queueItem, topicBinding);
    const target = `artifacts/wave0/${slug}/source.yaml`;
    exactReceiptSet(receipts, [`file:${target}`], 'Wave0 source intake');
    return [{
      path: target,
      role: 'source_yaml',
      direct_contract: 'wave0.source-metadata-array.v1',
    }];
  }

  if (kind === 'wave1_topic_deepening') {
    const { topic_slug: slug } = requireTopicBinding(queueItem, topicBinding);
    const mode = queueItem?.payload?.assignment_mode;
    if (mode !== 'primary' && mode !== 'supplementary') {
      throw payloadAssignmentModeError();
    }
    if (mode === 'supplementary') {
      exactReceiptSet(receipts, [], 'supplementary Wave1');
      return [];
    }

    const evidencePath = `artifacts/wave1/${slug}/evidence-summary.md`;
    const questionPath = `artifacts/wave1/${slug}/question-list.md`;
    exactReceiptSet(receipts, [`file:${evidencePath}`, `file:${questionPath}`], 'primary Wave1');
    return [
      {
        path: evidencePath,
        role: 'evidence_summary',
        direct_contract: 'wave1.evidence-summary.v1',
      },
      {
        path: questionPath,
        role: 'question_list',
        direct_contract: 'wave1.question-list.v1',
      },
    ];
  }

  if (kind === 'wave2_targeted_evidence') {
    exactReceiptSet(receipts, [], 'Wave2 targeted evidence');
    return [];
  }

  throw new Error(`unsupported work-unit assignment kind ${kind}`);
}

function baseOutputContractForVersion({ assignmentContractVersion, kind, queueItem, baseOutputContract }) {
  const outputContract = clone(baseOutputContract);
  if (kind === 'wave0_source_intake') {
    return {
      ...outputContract,
      output_files: {
        required: true,
        allowed_roles: ['source_yaml'],
      },
    };
  }

  if (assignmentContractVersion === WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION
    && kind === 'wave1_topic_deepening'
    && queueItem?.payload?.assignment_mode === 'supplementary') {
    return {
      ...outputContract,
      output_files: {
        ...outputContract.output_files,
        required: false,
      },
    };
  }

  return outputContract;
}

export function resolveWorkUnitAssignmentContract({
  assignmentContractVersion,
  kind,
  queueItem,
  topicBinding,
  baseOutputContract,
} = {}) {
  if (assignmentContractVersion !== WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION) {
    throw new Error(`unsupported assignment contract version ${assignmentContractVersion ?? '<missing>'}`);
  }
  if (!queueItem || typeof queueItem !== 'object') throw new Error('queueItem is required for assignment resolution');
  if (!baseOutputContract || typeof baseOutputContract !== 'object') throw new Error('baseOutputContract is required for assignment resolution');

  rejectReservedSelectors(queueItem, baseOutputContract);
  validateReferenceFloorDeficit(kind, queueItem);
  const requiredOutputs = requiredOutputsFor({ kind, queueItem, topicBinding });
  return WorkUnitOutputContractSchema.parse({
    ...baseOutputContractForVersion({ assignmentContractVersion, kind, queueItem, baseOutputContract }),
    required_outputs: requiredOutputs,
  });
}

