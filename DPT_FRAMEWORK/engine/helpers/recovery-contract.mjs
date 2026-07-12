// Structured recovery summary and deterministic action reachability.
// @impl RRD-008, CHI-003

import { z } from 'zod';
import {
  checkPhaseHandoffPreflight,
  validateEnterPhaseTarget,
} from './handoff-helpers.mjs';

export const RecoveryActionSchema = z.object({
  kind: z.enum(['rerun_gate', 'enter_phase', 'repair_surface']),
  target_ref: z.string().min(1),
  command: z.string().min(1).optional(),
  node_ref: z.string().min(1).optional(),
  preconditions: z.array(z.string()).default([]),
  sanctioned: z.boolean().optional(),
});

export const CanonicalTopicFindingSchema = z.object({
  id: z.string().min(1),
  rule_id: z.string().min(1),
  classification: z.enum(['blocking', 'warning', 'info']),
  topic_identity: z.string().nullable(),
  primary_surface: z.string().min(1),
  supporting_details: z.array(z.object({
    kind: z.string().min(1),
    surface: z.string().min(1),
  })),
  repair_kind: z.string().min(1),
});

export const RecoveryRootFindingSchema = z.object({
  id: z.string().min(1),
  source_kind: z.enum(['canonical_topic', 'existing_blocker']),
  source_ref: z.string().min(1),
  sanctioned_path_status: z.enum(['reachable', 'missing_contract', 'not_applicable']),
  direct_blocker: z.string().min(1).nullable().default(null),
  recommended_action: RecoveryActionSchema.nullable().default(null),
}).superRefine((root, context) => {
  if (root.sanctioned_path_status === 'reachable' && !root.recommended_action) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['recommended_action'], message: 'reachable root requires one recommended action' });
  }
  if (root.sanctioned_path_status !== 'reachable' && root.recommended_action) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['recommended_action'], message: 'non-reachable root cannot carry a recommended action' });
  }
  if (root.sanctioned_path_status === 'missing_contract' && !root.direct_blocker) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['direct_blocker'], message: 'missing_contract root requires a direct blocker' });
  }
});

export const RecoverySummarySchema = z.object({
  canonical_topic_findings: z.array(CanonicalTopicFindingSchema),
  root_findings: z.array(RecoveryRootFindingSchema),
  supporting_finding_count: z.number().int().nonnegative(),
}).superRefine((summary, context) => {
  const rootRefs = new Set(summary.root_findings.map((root) => root.source_ref));
  for (const finding of summary.canonical_topic_findings.filter((item) => item.classification === 'blocking')) {
    if (!rootRefs.has(finding.id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['root_findings'], message: `blocking canonical finding ${finding.id} missing root projection` });
    }
  }
  const expectedSupportingCount = summary.canonical_topic_findings
    .reduce((count, finding) => count + finding.supporting_details.length, 0);
  if (summary.supporting_finding_count !== expectedSupportingCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['supporting_finding_count'], message: 'supporting finding count does not match grouped details' });
  }
});

export function assessStructuredRecoveryAction(bundlePath, action) {
  const parsed = RecoveryActionSchema.parse(action);
  if (parsed.kind === 'enter_phase') {
    const result = validateEnterPhaseTarget(bundlePath, parsed.node_ref || parsed.target_ref);
    return result.ok
      ? { sanctioned_path_status: 'reachable', recommended_action: parsed, direct_blocker: null }
      : { sanctioned_path_status: 'missing_contract', recommended_action: null, direct_blocker: result.reason };
  }
  if (parsed.kind === 'rerun_gate') {
    if (!parsed.node_ref) return { sanctioned_path_status: 'missing_contract', recommended_action: null, direct_blocker: 'rerun_gate action lacks a deterministic node_ref preflight target' };
    const result = checkPhaseHandoffPreflight(bundlePath, parsed.node_ref);
    return result.ok
      ? { sanctioned_path_status: 'reachable', recommended_action: parsed, direct_blocker: null }
      : { sanctioned_path_status: 'missing_contract', recommended_action: null, direct_blocker: result.inspect?.[0] || 'gate preflight rejected the action' };
  }
  if (parsed.sanctioned === true) {
    return { sanctioned_path_status: 'reachable', recommended_action: parsed, direct_blocker: null };
  }
  return { sanctioned_path_status: 'not_applicable', recommended_action: null, direct_blocker: 'No existing sanctioned deterministic repair contract applies to this surface.' };
}

export function buildRecoverySummary({ canonicalFindings = [], blockers = [], target = null, statusPosition = null } = {}) {
  const roots = [];
  for (const finding of canonicalFindings.filter((item) => item.classification === 'blocking')) {
    const terminalPositionMismatch = statusPosition?.current_node === 'phases/phase-final.md'
      && target?.phase_key !== 'final';
    roots.push({
      id: `recovery:${finding.id}`,
      source_kind: 'canonical_topic',
      source_ref: finding.id,
      sanctioned_path_status: terminalPositionMismatch ? 'missing_contract' : 'not_applicable',
      direct_blocker: terminalPositionMismatch
        ? `Current runtime position is ${statusPosition.current_node}; no accepted post-final reentry contract reaches ${target.node_ref}.`
        : `Canonical topic identity or surface requires semantic reconciliation at ${finding.primary_surface}.`,
      recommended_action: null,
    });
  }
  blockers.forEach((blocker, index) => {
    if (blocker.check === 'canonical_topic_footprint') return;
    roots.push({
      id: `recovery:blocker:${index + 1}`,
      source_kind: 'existing_blocker',
      source_ref: `${blocker.check}:${index + 1}`,
      sanctioned_path_status: 'not_applicable',
      direct_blocker: blocker.message,
      recommended_action: null,
    });
  });
  return RecoverySummarySchema.parse({
    canonical_topic_findings: canonicalFindings,
    root_findings: roots,
    supporting_finding_count: canonicalFindings.reduce((count, finding) => count + finding.supporting_details.length, 0),
  });
}
