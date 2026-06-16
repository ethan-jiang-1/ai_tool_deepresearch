// @impl SCO-001: Six domain enums
import { z } from 'zod';

export const CurrentGate = z.enum([
  'instantiation_complete',
  'setup_ready',
  'wave0_complete',
  'wave1_complete',
  'wave2_complete',
  'readiness_passed',
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
  'quick_factual',
  'exploratory_map',
  'claim_verification',
]);

export const GateResult = z.enum(['pass', 'fail']);
