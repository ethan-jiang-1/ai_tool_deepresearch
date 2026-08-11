// @impl SCO-001, SCO-005, SCO-006, SCO-007: 14 domain enums
import { z } from 'zod';

export const CurrentGate = z.enum([
  'instantiation_complete',
  'hitl1_recorded',
  'setup_ready',
  'seed_topics_ready',
  'wave0_complete',
  'wave1_complete',
  'wave2_complete',
  'hitl2_recorded',
  'rerun_ready',
  'readiness_passed',
  'none',
]);

export const StopAuthorizationState = z.enum([
  'unauthorized_continue_required',
  'final_delivery',
  'decision_blocker',
  'empty_queue_after_refill',
]);

export const QueueHealth = z.enum(['ready', 'thin', 'blocked', 'closed']);

export const RunState = z.enum(['not_started', 'in_progress', 'blocked', 'completed']);

export const ResearchProfile = z.enum([
  'not_selected',
  'quick_factual',
  'exploratory_map',
  'claim_verification',
  'debug',
]);

export const GateResult = z.enum(['pass', 'fail']);

// @impl SCO-005~007: HITL enums
export const HumanCheckpointStatus = z.enum([
  'not_started',
  'pending_user',
  'recorded',
  'blocked',
  'not_applicable',
]);

export const AnswerabilityClass = z.enum([
  'not_assessed',
  'ready_substantive',
  'ready_insufficient_judgment',
  'blocked_repair_required',
]);

export const HITL2UserDecision = z.enum([
  'not_started',
  'proceed_to_readiness',
  'request_view_revision',
  'repair',
  'rerun',
  'stop_blocked',
]);

export const FinalReportView = z.enum([
  'not_started',
  'profile_default',
  'executive_brief',
  'evidence_map',
  'claim_judgment',
  'technical_deep_dive',
  'custom',
]);

// @impl SCO-001: bounded HITL1 research-access envelope vocabulary
export const SourceClass = z.enum([
  'encyclopedia',
  'code_host',
  'general_web',
]);

export const SourceClassReachability = z.enum([
  'reachable',
  'unreachable',
  'not_attempted',
]);

export const ResearchAccessBoundaryLocation = z.enum([
  'host_surface',
  'host_policy',
  'network_path',
  'probe_relay',
]);

export const ResearchAccessBoundaryExtent = z.enum([
  'universal',
  'class_scoped',
]);
