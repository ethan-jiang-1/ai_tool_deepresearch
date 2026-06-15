import { GATE_IDS, GATE_REGISTRY } from "./gates.mjs";

export const REQUIRED_TEMPLATE_PATHS = [
  "AGENT-GUIDE.md",
  "AGENTS.md",
  "CLAUDE.md",
  "COMMANDS.md",
  "README.md",
  "VERSION-LOG.md",
  "command_playbooks/instantiate-from-original-topic-md.md",
  "command_playbooks/instantiate-run-bundle.md",
  "command_playbooks/copy-framework-snapshot.md",
  "command_playbooks/render-root-control-files.md",
  "command_playbooks/create-final.md",
  "command_playbooks/decompose-seed-topics.md",
  "command_playbooks/check.md",
  "command_playbooks/help.md",
  "command_playbooks/check-instantiation.md",
  "command_playbooks/check-seed-intake.md",
  "command_playbooks/repair-seed-topic-shape.md",
  "command_playbooks/check-surfaces.md",
  "command_playbooks/check-queue-receipts.md",
  "command_playbooks/repair-wave1-artifact-steering.md",
  "command_playbooks/repair-framework-snapshot.md",
  "command_playbooks/adjust-profile-parameters.md",
  "command_playbooks/formalize-topology-delta.md",
  "command_playbooks/check-runtime.md",
  "specs/CONSTANTS.md",
  "specs/CHARTER.md",
  "specs/WORK_DIRECTORY_LAYOUT.md",
  "specs/GATES.md",
  "specs/RESEARCH_PROFILES.md",
  "specs/METHODOLOGY.md",
  "specs/QUEUE_CONTRACT.md",
  ...GATE_REGISTRY.map((gate) => gate.specPath),
  "specs/gates/wave0-start.md",
  "specs/gates/wave1-start.md",
  "specs/gates/wave2-start.md",
  "flows/instantiation-flow.md",
  "flows/execution-flow.md",
  "flows/queue-agentic-flow.md",
  "flows/source-intake-flow.md",
  "flows/source-intake-profiles/exa-search.md",
  "flows/source-intake-profiles/native-search.md",
  "flows/source-intake-profiles/scripts/exa-source-intake.mjs",
  "flows/reference-artifact-backfill.md",
  "output_templates/PROFILE.md",
  "output_templates/PLAN.md",
  "output_templates/STATUS.md",
  "output_templates/QUEUE.md",
  "output_templates/TRACE.md",
  "output_templates/RUN_ROOT_AGENTS.md",
  "output_templates/RUN_ROOT_CLAUDE.md",
  "cli_tools/README.md",
  "cli_tools/check_framework.mjs",
  "cli_tools/check_framework/detect_gate.mjs",
  "cli_tools/check_framework/checks/index.mjs",
  "cli_tools/check_framework/checks/check-template.mjs",
  "cli_tools/check_framework/checks/check-instantiation.mjs",
  "cli_tools/check_framework/checks/check-seed-intake.mjs",
  "cli_tools/check_framework/checks/check-seed-topic-shape.mjs",
  "cli_tools/check_framework/checks/check-queue-receipts.mjs",
  "cli_tools/check_framework/checks/check-surfaces.mjs",
  "cli_tools/check_framework/checks/check-runtime.mjs",
  "cli_tools/check_framework/checks/gates/index.mjs",
  "cli_tools/check_framework/checks/gates/check_gate_common.mjs",
  ...GATE_REGISTRY.map((gate) => gate.checkerPath),
  "cli_tools/check_framework/checks/runtime-artifact.mjs",
  "cli_tools/check_framework/checks/seed-topic-shape.mjs",
  "cli_tools/check_framework/checks/runtime-inventory.mjs",
  "cli_tools/check_framework/checks/runtime-queue.mjs",
  "cli_tools/check_framework/checks/runtime-queue-receipts.mjs",
  "cli_tools/check_framework/checks/runtime-readiness.mjs",
  "cli_tools/check_framework/checks/runtime-shared.mjs",
  "cli_tools/check_framework/checks/runtime-stop-authorization.mjs",
  "cli_tools/check_framework/checks/runtime-topology.mjs",
  "cli_tools/stop_guard/claude-stop-guard.mjs",
  "cli_tools/stop_guard/claude-stop-hook-settings.example.json",
  "cli_tools/check_framework/contracts/gates.mjs",
  "cli_tools/check_framework/contracts/constants.mjs",
  "cli_tools/check_framework/tests/test-runtime-harness.mjs",
  "cli_tools/check_framework/tests/test-all-regression.mjs",
  "cli_tools/check_framework/tests/test-exa-source-intake.mjs",
  "cli_tools/check_framework/tests/test-template-regression.mjs",
  "cli_tools/check_framework/tests/test-stop-guard.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-fan-in.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-fan-in-promotion.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-fan-in-terminal.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-gates.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-gates-instantiation-fixtures.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-gates-instantiation.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-gates-wave-fixtures.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-gates-wave.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-inventory.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-profile.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-profile-fixtures.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-profile-instantiation.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-profile-runtime.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-queue-gates.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-stop-authorization.mjs",
  "cli_tools/check_framework/tests/test-runtime-regression-source-intake.mjs",
  "cli_tools/check_framework/lib/finding.mjs",
  "cli_tools/check_framework/lib/bundle.mjs",
  "cli_tools/check_framework/lib/fs.mjs",
  "cli_tools/check_framework/lib/markdown.mjs",
  "cli_tools/check_framework/lib/run_files.mjs",
];

export const FORBIDDEN_TEMPLATE_PATHS = [
  "outputs",
  `PRODUCTION-FLOW${".md"}`,
  `QUALIFICATION${".md"}`,
  `RUNTIME-QUALIFICATION${".md"}`,
  "command_playbooks/create-control-files.md",
];

export const OUTPUT_BOUNDARIES = {
  "output_templates/PROFILE.md": ["BEGIN PROFILE OUTPUT", "END PROFILE OUTPUT"],
  "output_templates/PLAN.md": ["BEGIN PLAN OUTPUT", "END PLAN OUTPUT"],
  "output_templates/STATUS.md": ["BEGIN STATUS OUTPUT", "END STATUS OUTPUT"],
  "output_templates/QUEUE.md": ["BEGIN QUEUE OUTPUT", "END QUEUE OUTPUT"],
  "output_templates/TRACE.md": ["BEGIN TRACE OUTPUT", "END TRACE OUTPUT"],
};

export const CORE_TEMPLATE_TERMS = [
  "Source of Record",
  "Webpage Material Diagnostic Gate",
  "Research Profile",
  "Profile Cost Control",
  "Topic Root",
  "Run Bundle",
  "Read-Only Framework",
  "Runtime Command Entrypoint",
  "Output Templates",
  "Instantiated Control Files",
  "original_topic",
  "seed_topics",
  "final_output_dir",
  "Readiness",
  "No-Empty-Queue",
  "Queue Work Unit Contract",
  "Critical Checkpoint Receipts",
  "Rolling Task Projection",
  "Pre-Response Gate",
  "User-Visible Stop Authorization",
  "Post-Gate Continuation",
  "Silent Autonomous Execution",
  "Topology Formalization Gate",
  "command_playbooks/check-instantiation.md",
  "command_playbooks/check-seed-intake.md",
  "command_playbooks/repair-seed-topic-shape.md",
  "command_playbooks/check-surfaces.md",
  "command_playbooks/repair-wave1-artifact-steering.md",
  "command_playbooks/instantiate-from-original-topic-md.md",
  "command_playbooks/adjust-profile-parameters.md",
  "command_playbooks/formalize-topology-delta.md",
  "command_playbooks/check-runtime.md",
];

export const INST_STATE_EXPECTED = {
  state: "not_started",
  current_mode: "instantiation_only",
  current_wave: "Instantiation",
  current_gate: "instantiation_complete",
};

export const CURRENT_MODE_VALUES = new Set(["instantiation_only", "execution"]);
export const STATE_VALUES = new Set(["not_started", "in_progress", "blocked", "completed"]);
export const WAVE_VALUES = new Set(["Instantiation", "Wave 0", "Wave 1", "Wave 2", "Readiness Check"]);
export const GATE_VALUES = new Set(GATE_IDS);
export const NEXT_GATE_VALUES = new Set([...GATE_IDS, "none"]);
export const QUEUE_HEALTH_VALUES = new Set(["ready", "thin", "blocked", "closed"]);
export const EXECUTION_MODE_VALUES = new Set(["sequential"]);
export const INTERRUPT_CONDITION_VALUES = new Set(["not_applicable", "mainline_blockage", "high_risk_action"]);
export const RUNTIME_EMPTY_FIELD_VALUES = new Set([
  "",
  "none",
  "not_applicable",
  "not applicable",
  "not_started",
  "not started",
  "not_assessed",
  "not assessed",
  "unknown",
  "n/a",
]);
export const PRE_RESPONSE_ALLOWED_STATES = [
  "final_delivery",
  "decision_blocker",
  "empty_queue_after_refill",
];
export const STOP_AUTHORIZATION_STATES = new Set([
  "unauthorized_continue_required",
  ...PRE_RESPONSE_ALLOWED_STATES,
]);
export const PRE_RESPONSE_FORBIDDEN_STATES = [
  "milestone_complete",
  "gate_passed",
  "artifact_refreshed",
  "status_synced",
  "batch_complete",
  "next_task_known",
];
export const TASK_PROJECTION_STATES = new Set([
  "active",
  "unavailable_queue_only",
  "needs_sync",
]);
export const PLATFORM_TASK_PROJECTION_VALUES = new Set([
  "available_required_else_queue_only",
  "unavailable_queue_only",
]);
export const ACTIVE_QUEUE_TASK_SLOTS = [
  "slot_1_current",
  "slot_2_next",
  "slot_3_pending",
  "slot_4_pending",
  "slot_5_tail",
];
export const QUEUE_PRODUCER_RULE_VALUES = new Set([
  "initial_window_render",
  "setup_repair",
  "slot_completion_refill",
  "queue_thin_refill",
  "urgent_preemption",
  "failed_gate_audit",
  "gate_reopen",
  "topology_delta",
  "reference_landed",
  "topic_ref_count_changed",
  "source_intake_fan_in",
  "hitl2_readiness_path",
  "blocker_path",
  "boundary_hook",
]);
export const RECEIPT_CHECK_PHASE_VALUES = new Set([
  "preflight",
  "closeout",
]);
export const CLOSED_TASK_VALUES = new Set([
  "none",
  "not_applicable",
  "not applicable",
  "not_applicable_after_readiness_passed",
]);
export const SOURCE_INTAKE_RUNNER_MODE_VALUES = new Set([
  "inline_main_agent",
  "foreground_subagent_runner",
  "not_applicable",
]);
export const SOURCE_INTAKE_WAIT_STATE_VALUES = new Set([
  "not_started",
  "running",
  "fan_in_ready",
  "integrated",
  "failed",
  "suspended",
]);
export const SOURCE_INTAKE_STATUS_VALUES = new Set([
  "not_started",
  "running",
  "fan_in_ready",
  "integrated",
  "failed",
  "suspended",
]);
export const HUMAN_CHECKPOINT_STATUS_VALUES = new Set([
  "not_started",
  "pending_user",
  "recorded",
  "blocked",
  "not_applicable",
]);
export const ANSWERABILITY_CLASS_VALUES = new Set([
  "not_assessed",
  "ready_substantive",
  "ready_insufficient_judgment",
  "blocked_repair_required",
]);
export const HITL2_USER_DECISION_VALUES = new Set([
  "not_started",
  "proceed_to_readiness",
  "request_view_revision",
  "repair_and_rerun",
  "stop_blocked",
]);
export const FINAL_REPORT_VIEW_VALUES = new Set([
  "not_started",
  "profile_default",
  "executive_brief",
  "evidence_map",
  "claim_judgment",
  "technical_deep_dive",
  "custom",
]);
export const GENERIC_REFILL_CANDIDATES = new Set([
  "run source-intake batch for next high-value reference need",
  "fan-in source-intake candidate cards and promote accepted material",
  "land already-known local/user-provided source without retrieval",
  "clarify seed topic intake gap",
  "triage topology delta candidate",
  "produce topic evidence summary and question list artifacts (initial)",
  "refresh topic evidence summary and question list artifacts (incremental)",
]);
export const REFILL_PRIORITY_CLASSES = [
  "P0_preempted_restore",
  "P1_state_or_gate_repair",
  "P2_close_open_loop",
  "P3_current_gate_gap",
  "P4_progressive_artifact_or_seed_backfill",
  "P5_new_reference_intake",
  "P6_topology_triage",
];
export const READINESS_ITEM_FIELDS = [
  "30_second_local_evidence_retrieval",
  "mechanism_trend_difficulty_limitation_check",
  "cross_topic_synthesis_check",
  "human_checkpoint_check",
  "topology_stability_check",
  "branch_disposition_check",
  "handoff_continuity_check",
  "post_readiness_stage_check",
];
export const REPORT_OR_WAIT_TASK_PATTERNS = [
  ["assistant recap marker", /(?:^|\n)\s*※\s*recap\b/i, false],
  ["report progress", /\breport\s+(?:routine\s+)?progress\b/i, false],
  ["progress report", /\b(?:routine\s+)?progress\s+(?:report|update)\b/i, false],
  ["summarize and wait", /\bsummari[sz]e\s+(?:progress\s+)?and\s+wait\b/i, false],
  ["ask user to continue", /\bask\s+(?:the\s+)?user\s+to\s+continue\b/i, false],
  ["continue or adjust direction", /\bcontinue\s+or\s+adjust\s+direction\b/i, false],
  ["await user review", /\bawait(?:ing)?\s+(?:only\s+)?(?:the\s+)?user\s+review\b/i, true],
  ["recap", /\brecap\b/i, false],
  ["recap then continue", /\brecap\s+(?:then|and)\s+continue\b/i, false],
  ["tell user next task", /\btell\s+(?:the\s+)?user\s+(?:what\s+)?(?:the\s+)?next\s+task\b/i, false],
  ["candidate cards waiting for review", /(?:candidate\s+cards?|候选卡片)[\s\S]{0,80}(?:await(?:ing)?|wait(?:ing)?|等待)[\s\S]{0,80}(?:review|审查|审核)/i, false],
  ["waiting for user review", /(?:等待|待)[\s\S]{0,40}(?:user|human|用户|人工)[\s\S]{0,40}(?:review|approval|审查|审核|确认)/i, false],
  ["slash command /goal", /\/goal\b/i, false],
];
export const TOPOLOGY_SYNC_STATE_VALUES = new Set(["synced", "status_pending", "plan_pending"]);
export const TOPOLOGY_DELTA_DECISION_VALUES = new Set([
  "not_applicable",
  "pending",
  "merge_existing",
  "formalize_new_topic",
  "suspend",
  "archive",
  "redirect",
]);
export const TOPOLOGY_DELTA_DISPOSITION_VALUES = new Set([
  "merge_existing",
  "formalize_new_topic",
  "suspend",
  "archive",
  "redirect",
]);

export const RESEARCH_PROFILES = new Set([
  "quick_factual",
  "exploratory_map",
  "claim_verification",
]);
export const MUST_ANSWER_INITIAL_PHASE_VALUES = new Set(["wave1_topic", "wave2_synthesis", "pending_decomposition"]);
export const MUST_ANSWER_ANSWER_PHASE_VALUES = new Set(["wave1_topic", "wave2_synthesis"]);
export const MUST_ANSWER_STATUS_VALUES = new Set([
  "candidate",
  "confirmed",
  "answered",
  "partial",
  "downgraded",
  "unknown_classified",
  "synthesis_pending",
  "queued",
  "blocked",
  "retired",
]);
export const ACCEPTANCE_STATUS_VALUES = new Set(["accepted", "reviewed_uncounted", "excluded", "background"]);
export const TIER_VALUES = new Set(["tier_1", "tier_2", "tier_3", "tier_4"]);
export const EVIDENCE_ROLE_VALUES = new Set([
  "foundation",
  "must_answer",
  "mechanism",
  "trend",
  "difficulty",
  "limitation",
  "comparison",
  "synthesis_backing",
  "discovery_only",
]);
export const TOPIC_UNIQUE_STATUS_VALUES = new Set(["topic_unique", "shared_foundation", "both", "not_applicable"]);
export const SEED_BACKFILL_STATUS_VALUES = new Set([
  "current",
  "deferred_queue_backed",
  "shared_foundation_only",
  "not_applicable",
]);
export const COUNTED_FOR_FLOOR_VALUES = new Set(["yes", "no"]);
export const TRUST_LEVEL_VALUES = new Set(["official", "academic", "practitioner", "community"]);
export const WEB_SUBSTANCE_VALUES = new Set(["substantive", "thin", "none", "not_webpage"]);
export const COMMERCIAL_INTENT_VALUES = new Set(["none", "mild", "strong", "unknown"]);
export const MARKETING_RISK_VALUES = new Set(["low", "medium", "high"]);
export const CROSS_VERIFICATION_REQUIRED_VALUES = new Set(["yes", "no"]);
export const CROSS_VERIFICATION_STATUS_VALUES = new Set([
  "verified",
  "pending",
  "unavailable_after_search",
  "not_required",
]);
export const CONTENT_RETENTION_DECISION_VALUES = new Set(["retain", "prune_partial", "exclude_source"]);

export const WAVE0_INVENTORY_COLUMNS = [
  "local_ref_path",
  "acceptance_status",
  "source_type",
  "source_family",
  "tier",
  "evidence_role",
  "trust_level",
  "source_date_scope",
  "supports_claims",
  "web_substance",
  "commercial_intent",
  "marketing_risk",
  "cross_verification_required",
  "cross_verification_status",
  "content_retention_decision",
  "seed_backfill_status",
  "counted_for_floor",
];

export const WAVE0_EXCLUDED_COLUMNS = [
  "local_ref_path_or_url",
  "source_type",
  "exclusion_reason",
  "useful_as_background",
  "attempted_search_route",
  "follow_up",
];

export const WAVE0_UNAVAILABLE_RECORD_COLUMNS = [
  "item",
  "attempted_search_route",
  "attempted_queries_or_sources",
  "excluded_inventory_refs",
  "queue_consequence",
  "confidence_effect",
];

export const WAVE1_INVENTORY_COLUMNS = [
  "topic",
  "local_ref_path",
  "acceptance_status",
  "source_type",
  "trust_level",
  "tier",
  "evidence_role",
  "source_date_scope",
  "supports_claims",
  "web_substance",
  "commercial_intent",
  "marketing_risk",
  "cross_verification_required",
  "cross_verification_status",
  "content_retention_decision",
  "supports_must_answer",
  "supports_mechanism",
  "supports_trend",
  "supports_difficulty",
  "supports_limitation",
  "source_family",
  "topic_unique_status",
  "seed_backfill_status",
  "counted_for_floor",
];

export const WAVE1_EXCLUDED_COLUMNS = [
  "topic",
  "local_ref_path_or_url",
  "source_type",
  "source_family",
  "exclusion_reason",
  "useful_as_background",
  "attempted_search_route",
  "follow_up",
];

export const WAVE1_EXCEPTION_RECORD_COLUMNS = [
  "topic",
  "exception_type",
  "reason",
  "attempted_routes",
  "unresolved_questions",
  "confidence_effect",
  "queue_consequence",
  "branch_record",
];

export const SEED_TOPIC_INTAKE_COLUMNS = [
  "topic",
  "must_answer",
  "why_now",
  "boundary",
  "evidence_anchors",
  "why_it_matters",
  "intake_status",
  "intake_gap",
  "queue_consequence",
];

export const TOPIC_REGISTRY_COLUMNS = [
  "id",
  "slug",
  "title",
  "seed_files",
  "current_hypothesis",
  "why_it_matters",
  "must_answer",
];

export const ROOT_MUST_ANSWER_COLUMNS = [
  "id",
  "final_must_answer",
  "intended_profile_handling",
  "initial_answer_phase",
  "mapped_topics",
  "intake_status",
  "queue_consequence",
];

export const WAVE1_AUDIT_COLUMNS = [
  "topic",
  "accepted_topic_refs",
  "topic_unique_refs",
  "primary",
  "secondary",
  "recent",
  "limitation",
  "must_answer_set_status",
  "wave1_topic_answers",
  "wave2_synthesis_pending",
  "seed_backfill",
  "webpage_diagnostic",
  "question_reconciliation",
  "emergent_question_protocol",
  "exploration_decision",
  "evidence_summary",
  "question_list",
  "duplicate_review",
  "counterexample_failure_search",
  "stop_exception",
  "result",
  "gap",
];

export const WAVE2_AUDIT_COLUMNS = [
  "topic",
  "cross_checked_conclusions",
  "synthesis_must_answer_status",
  "mechanism_reflected",
  "trend_reflected",
  "difficulty_reflected",
  "limitation_reflected",
  "local_backing_refs",
  "result",
  "gap",
];

export const LOCAL_REFERENCE_TEMPLATE_FIELDS = [
  "source_url",
  "source_file",
  "acceptance_status",
  "source_type",
  "source_family",
  "tier",
  "evidence_role",
  "topic_unique_status",
  "accessed_at",
  "source_date_scope",
  "related_topic",
  "trust_level",
  "why_it_matters",
  "related_entities",
  "seed_backfill_status",
  "captured_excerpt",
  "supports_claims",
  "web_substance",
  "commercial_intent",
  "marketing_risk",
  "cross_verification_required",
  "cross_verification_status",
  "content_retention_decision",
  "risks_or_limitations",
  "excluded_reason",
];

export const SYNTHESIS_MATRIX_COLUMNS = [
  "topic",
  "must_answer_ids",
  "conclusion",
  "compared_with",
  "claim_type",
  "severity",
  "confidence",
  "backing_refs",
  "independent_ref_count",
  "scarcity_exception",
  "conflict_status",
  "synthesis_artifact_anchor",
];
