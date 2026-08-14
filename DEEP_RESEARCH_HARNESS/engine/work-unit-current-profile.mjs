// @impl DEW-004, DEW-017, DEW-024
// One current-profile boundary for every Engine reader of an existing work unit.

import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  ActorExecutionSchema,
  WORK_UNIT_ACTOR_CONTRACT_VERSION,
  WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
  WORK_UNIT_SUBMISSION_CONTRACT_VERSION,
} from '../schema/contracts/work-unit.mjs';
import { isPlainObject, readJson } from './work-unit-utils.mjs';

export const UNSUPPORTED_CURRENT_CONTRACT = 'unsupported_current_contract';

function conclusion(record, unsupported_discriminator, observed, surface = 'index') {
  return {
    ok: false,
    reason_code: UNSUPPORTED_CURRENT_CONTRACT,
    work_id: record?.work_id || null,
    queue_item_id: record?.queue_item_id || null,
    unsupported_discriminator,
    observed,
    surface,
  };
}

function readableObject(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const value = readJson(filePath);
    return isPlainObject(value) ? value : null;
  } catch {
    // Full schema/integrity validation owns an unreadable surface.
    return null;
  }
}

function bindingMatches(record, surface, surfaceName) {
  for (const field of [
    'assignment_contract_version',
    'submission_contract_version',
    'actor_contract_version',
  ]) {
    if (surface[field] !== record[field]) {
      return conclusion(record, 'profile_binding', {
        field,
        expected: record[field],
        actual: surface[field],
      }, surfaceName);
    }
  }
  if (JSON.stringify(surface.actor_execution) !== JSON.stringify(record.actor_execution)) {
    return conclusion(record, 'profile_binding', {
      field: 'actor_execution',
      expected: record.actor_execution,
      actual: surface.actor_execution,
    }, surfaceName);
  }
  return null;
}

/**
 * Classifies only the current attempt profile. It intentionally does not parse
 * results, receipts, output contracts, hashes, or recovery/supersession facts.
 */
export function classifyCompleteCurrentWorkUnitProfile(bundleDir, record) {
  if (record?.assignment_contract_version !== WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION) {
    return conclusion(record, 'assignment_contract_version', record?.assignment_contract_version);
  }
  if (record?.submission_contract_version !== WORK_UNIT_SUBMISSION_CONTRACT_VERSION) {
    return conclusion(record, 'submission_contract_version', record?.submission_contract_version);
  }
  if (record?.actor_contract_version !== WORK_UNIT_ACTOR_CONTRACT_VERSION
    || !ActorExecutionSchema.safeParse(record?.actor_execution).success) {
    return conclusion(record, 'actor_contract_version', {
      actor_contract_version: record?.actor_contract_version,
      actor_execution: record?.actor_execution || null,
    });
  }

  for (const [surfaceName, ref] of [
    ['manifest', record.paths?.manifest_ref],
    ['beacon', record.paths?.beacon_ref],
  ]) {
    if (!ref) continue;
    const surface = readableObject(path.join(bundleDir, ref));
    if (!surface) continue;
    const mismatch = bindingMatches(record, surface, surfaceName);
    if (mismatch) return mismatch;
  }

  return {
    ok: true,
    reason_code: null,
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
  };
}

export function assertCompleteCurrentWorkUnitProfile(bundleDir, record) {
  const profile = classifyCompleteCurrentWorkUnitProfile(bundleDir, record);
  if (profile.ok) return profile;
  const error = new Error(`unsupported current work-unit contract for ${profile.work_id || '<unknown>'}: ${profile.unsupported_discriminator}`);
  error.reason_code = profile.reason_code;
  error.unsupported_discriminator = profile.unsupported_discriminator;
  error.profile = profile;
  throw error;
}
