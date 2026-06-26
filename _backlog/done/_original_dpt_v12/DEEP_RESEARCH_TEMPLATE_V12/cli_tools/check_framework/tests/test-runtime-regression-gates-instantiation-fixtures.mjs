import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  join,
  mkdirSync,
  mkdtempSync,
  rmSync,
  tmpdir,
  writeFileSync,
} from "./test-runtime-harness.mjs";
import { REQUIRED_TEMPLATE_PATHS } from "../contracts/constants.mjs";

const TEMPLATE_ROOT = new URL("../../..", import.meta.url);

export function withRunFiles({ profile = "", plan = "", status = "", queue = "", trace = "" }, fn) {
  const runRoot = mkdtempSync(join(tmpdir(), "v12-gate-regression-"));
  try {
    writeFileSync(join(runRoot, "case.profile.md"), profile);
    writeFileSync(join(runRoot, "case.plan.md"), plan);
    writeFileSync(join(runRoot, "case.status.md"), status);
    writeFileSync(join(runRoot, "case.queue.md"), queue);
    writeFileSync(join(runRoot, "case.trace.md"), trace);
    fn(runRoot);
  } finally {
    rmSync(runRoot, { recursive: true, force: true });
  }
}

function controlBacklinks() {
  return "case.profile.md case.plan.md case.status.md case.queue.md case.trace.md";
}

function currentTemplateVersion() {
  const text = readFileSync(new URL("../../../specs/CONSTANTS.md", import.meta.url), "utf8");
  return text.match(/^- current_version: `([^`]+)`$/m)?.[1] ?? "";
}

export function instantiationPlan(runRoot, overrides = {}) {
  const paths = {
    template_version: currentTemplateVersion(),
    run_dir: runRoot,
    framework_dir: join(runRoot, "_framework"),
    profile_path: join(runRoot, "case.profile.md"),
    plan_path: join(runRoot, "case.plan.md"),
    status_path: join(runRoot, "case.status.md"),
    queue_path: join(runRoot, "case.queue.md"),
    trace_path: join(runRoot, "case.trace.md"),
    original_topic_dir: "not_applicable",
    topic_root: join(runRoot, "seed_topics"),
    reference_dir: join(runRoot, "seed_topics", "_reference"),
    artifact_dir: join(runRoot, "seed_topics", "_artifacts"),
    framework_command_index: join(runRoot, "_framework", "COMMANDS.md"),
    framework_cli_check: join(runRoot, "_framework", "cli_tools", "check_framework.mjs"),
    runtime_profile: join(runRoot, "case.profile.md"),
    runtime_plan: join(runRoot, "case.plan.md"),
    runtime_status: join(runRoot, "case.status.md"),
    runtime_queue: join(runRoot, "case.queue.md"),
    runtime_trace: join(runRoot, "case.trace.md"),
    research_profile: "quick_factual",
    research_profile_user_choice: "explicit_user_choice",
    wave0_shared_doc_floor: "5",
    wave1_doc_floor_per_topic: "5",
    primary_source_floor: "2",
    secondary_source_floor: "1",
    recent_source_floor: "1",
    limitation_source_floor: "1",
    topic_complexity_factor: "0",
    cross_topic_dependency_factor: "0",
    ...overrides,
  };
  const rows = Object.entries(paths)
    .map(([field, value]) => `| \`${field}\` | \`${value}\` |`)
    .join("\n");
  return `
${controlBacklinks()}

## File Role Snapshot

- role: \`design-time blueprint\`

## Instance Config

| field | value |
| --- | --- |
${rows}

## Runtime Command Entrypoint

- framework_command_index: \`${paths.framework_command_index}\`
- framework_cli_check: \`${paths.framework_cli_check}\`
- runtime_profile: \`${paths.runtime_profile}\`
- runtime_plan: \`${paths.runtime_plan}\`
- runtime_status: \`${paths.runtime_status}\`
- runtime_queue: \`${paths.runtime_queue}\`
- runtime_trace: \`${paths.runtime_trace}\`
- Snapshot vs Instantiated Control Files: \`runtime files are root control files, not _framework/output_templates skeletons\`

## Research Profile Projection

- research_profile: \`${paths.research_profile}\`
- search_preference_projection: \`not_specified_use_profile_defaults\`

## Local Execution Authorities

- reference_authority: \`${join(runRoot, "_framework", "specs", "CONSTANTS.md")}\`

## Control Map

- plan is design-time only

## Topic Registry

| id | slug | title | seed_files | current_hypothesis | why_it_matters | must_answer |
| --- | --- | --- | --- | --- | --- | --- |

## Seed Topic Intake Matrix

| topic | must_answer | why_now | boundary | evidence_anchors | why_it_matters | intake_status | intake_gap | queue_consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Output Contract

- references land under seed_topics/_reference

## Wave Design

- gate definitions live in _framework/specs/gates

## Topic Goals

- no confirmed topics yet

## Topic Stop And Critical Claim Policy

- use configured critical claim checks

## Success State

- readiness_passed
`;
}

function writeFrameworkSnapshot(runRoot) {
  const frameworkRoot = join(runRoot, "_framework");
  for (const relPath of REQUIRED_TEMPLATE_PATHS) {
    const fullPath = join(frameworkRoot, relPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, readFileSync(new URL(relPath, `${TEMPLATE_ROOT}/`), "utf8"));
  }
}

export const ARTIFACT_SCAFFOLD_README = `# Artifact Scaffold

This directory is the canonical scaffold for derived artifacts:

- wave1_topics/
- wave2/
- shared/

This scaffold is not evidence, does not count toward source floors, and contains no produced topic or synthesis artifacts at instantiation time.

Wave 1 topic artifacts are produced by active QUEUE tasks after \`topic_unique_ref_count >= 1\`; producer_rule=\`topic_ref_count_changed\` owns initial production and refresh routing.
`;

export function writeArtifactScaffold(runRoot) {
  const artifactRoot = join(runRoot, "seed_topics", "_artifacts");
  mkdirSync(join(artifactRoot, "wave1_topics"), { recursive: true });
  mkdirSync(join(artifactRoot, "wave2"), { recursive: true });
  mkdirSync(join(artifactRoot, "shared"), { recursive: true });
  writeFileSync(join(artifactRoot, "README.md"), ARTIFACT_SCAFFOLD_README);
}

export function runRootAgentFixture({ claude = false } = {}) {
  return `# Active Deep Research Run

Before acting, locate and read these five root control files:

- \`*.profile.md\`
- \`*.plan.md\`
- \`*.status.md\`
- \`*.queue.md\`
- \`*.trace.md\`

\`_framework/\` is a read-only policy snapshot. Do not execute from \`_framework/output_templates/*.md\`; those files are skeletons only.

\`QUEUE_PATH -> Active Queue\` is the executable action ledger. If \`stop_authorization_state=unauthorized_continue_required\`, execute \`unauthorized_stop_next_action\`.

User-visible stopping is allowed only for \`final_delivery\`, \`decision_blocker\`, or \`empty_queue_after_refill\`.

HITL2 may stop only after \`human-decision-brief.md\` exists, PROFILE/STATUS/QUEUE are synced to \`pending_user\`, \`queue_health=blocked\`, \`stop_authorization_state=decision_blocker\`, and \`safe_to_interrupt=yes\`.
${claude ? "\nIf a Claude Stop hook blocks stopping and returns a `Continue: ...` reason, treat that as the next execution action.\n" : ""}
`;
}

export function stopHookSettingsFixture(runRoot) {
  return `${JSON.stringify({
    hooks: {
      Stop: [
        {
          matcher: "",
          hooks: [
            {
              type: "command",
              command: `DEEP_RESEARCH_RUN_ROOT="${runRoot}" node "${join(runRoot, "_framework", "cli_tools", "stop_guard", "claude-stop-guard.mjs")}"`,
            },
          ],
        },
      ],
    },
  }, null, 2)}\n`;
}

export function writeInstantiationRun(runRoot, { planOverrides = {}, plan = null, profile = null, status = null, queue = null, trace = null } = {}) {
  writeFrameworkSnapshot(runRoot);
  mkdirSync(join(runRoot, "seed_topics", "_reference"), { recursive: true });
  writeArtifactScaffold(runRoot);
  mkdirSync(join(runRoot, ".claude"), { recursive: true });
  writeFileSync(join(runRoot, "AGENTS.md"), runRootAgentFixture());
  writeFileSync(join(runRoot, "CLAUDE.md"), runRootAgentFixture({ claude: true }));
  writeFileSync(join(runRoot, ".claude", "settings.local.json"), stopHookSettingsFixture(runRoot));
  writeFileSync(join(runRoot, "case.profile.md"), profile ?? profileFixture(runRoot));
  writeFileSync(join(runRoot, "case.plan.md"), plan ?? instantiationPlan(runRoot, planOverrides));
  writeFileSync(join(runRoot, "case.status.md"), status ?? instantiationStatus());
  writeFileSync(join(runRoot, "case.queue.md"), queue ?? instantiationQueue());
  writeFileSync(join(runRoot, "case.trace.md"), trace ?? instantiationTrace());
}

export function statusHeader({ gate, wave, state = "in_progress", nextGate = "none" }) {
  return `
## Current Execution Snapshot

- state: \`${state}\`
- current_mode: \`execution\`
- current_wave: \`${wave}\`
- current_gate: \`${gate}\`
- next_gate: \`${nextGate}\`
`;
}

export const INST_STATUS = `
## Current Execution Snapshot

- state: \`not_started\`
- current_mode: \`instantiation_only\`
- current_wave: \`Instantiation\`
- current_gate: \`instantiation_complete\`
- next_gate: \`setup_ready\`
`;

export function instantiationStatus() {
  return `
${controlBacklinks()}

## Operator View

- user_visible_output_authorized: \`no until final_delivery, decision_blocker, or empty_queue_after_refill\`

${INST_STATUS}

## Gate State

- current_gate: \`instantiation_complete\`

## Setup Ready Transition

- setup_ready_status: \`not_started\`

## Anti-Stall Budget

- budget_status: \`pass\`

## Topology Delta

- pending_topic_candidates: \`none\`

## Topology Drift Review

- readiness_review: \`not_started\`

## Wave 0 Foundation Gate Audit

- overall_result: \`fail\`

## Wave 0 Accepted Shared Reference Inventory

| local_ref_path | acceptance_status | source_type | source_family | tier | evidence_role | trust_level | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Wave 1 Source Floor Audit

- overall_result: \`fail\`

## Accepted Reference Inventory

| topic | local_ref_path | acceptance_status | source_type | trust_level | tier | evidence_role | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | supports_must_answer | supports_mechanism | supports_trend | supports_difficulty | supports_limitation | source_family | topic_unique_status | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Wave 2 Synthesis Gate Audit

- overall_result: \`fail\`

## Cross-Topic Conclusion Matrix

| topic | must_answer_ids | conclusion | compared_with | claim_type | severity | confidence | backing_refs | independent_ref_count | scarcity_exception | conflict_status | synthesis_artifact_anchor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Readiness Check

- overall_status: \`fail\`

## Resume Checkpoint

- safe_to_interrupt: \`yes\`
`;
}

function instantiationQueue() {
  return `
${controlBacklinks()}

## Operator View

- task_projection_state: \`needs_sync\`

## Active Queue

- execution_mode: \`sequential\`
- queue_health: \`ready\`

### slot_1_current

- action: \`initialize execution workspace\`

## Blocked State

- interrupt_condition_matched: \`not_applicable\`

## Refill Pool

- refill_pool_ordering_rule: \`ready/prerequisite satisfied first, then priority_class, then current wave/gate affinity, then restore_priority, then physical order\`

## Promotion Rules

- after_task_completed: \`sync status\`

## Wave Gate Audit Rule

- before_marking_wave0_complete: \`audit first\`

## No-Empty-Queue Rule

- rule: \`refill or block\`

## Rolling Task Projection Rule

- rule: \`one active task\`

## Topic Seed Backfill Rule

- rule: \`backfill on reference completion\`

## Anti-Stall Budget Rule

- rule: \`repair if exceeded\`

## Post-Readiness Maintenance Rule

- rule: \`bounded only\`
`;
}

function instantiationTrace() {
  return `
${controlBacklinks()}

## File Role Snapshot

- role: \`append-only diagnostic history\`

## Write Rules

- none_recorded_yet: \`yes\`

## Trace Entries

- none_recorded_yet: \`yes\`
`;
}

export const SETUP_READY = `
## Setup Ready Transition

- setup_ready_status: \`ready\`
- execution_workspace_ready: \`yes\`
- navigation_stubs_ready: \`yes\`
- topic_root_alignment_ready: \`yes\`
- seed_growth_sections_ready: \`yes\`
- seed_topic_intake_ready: \`yes\`
- status_queue_sync_ready: \`yes\`
`;

export const WAVE0_PASS_AUDIT = `
## Wave 0 Foundation Gate Audit

- overall_result: \`pass\`
- wave1_entry_allowed: \`yes\`
`;

export const WAVE0_INVENTORY_ROW = `
## Wave 0 Accepted Shared Reference Inventory

| local_ref_path | acceptance_status | source_type | source_family | tier | evidence_role | trust_level | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| seed_topics/_reference/00-shared-r1.md | accepted | webpage | benchmark | tier_1 | foundation;limitation;comparison | official | 2026 | shared foundation | substantive | none | low | no | not_required | retain | current | yes |
`;

export function planWithFloors() {
  return `
## Instance Config

| field | value |
| --- | --- |
| \`wave0_shared_doc_floor\` | \`1\` |
| \`wave1_doc_floor_per_topic\` | \`1\` |
`;
}

function profileFixture(runRoot) {
  return `
${controlBacklinks()}

## File Role Snapshot

- role: \`run-specific research profile, root must-answer set, and human decision record\`

## Profile Binding

| field | value |
| --- | --- |
| \`artifact_dir\` | \`${join(runRoot, "seed_topics", "_artifacts")}\` |
| \`research_profile\` | \`quick_factual\` |
| \`research_profile_user_choice\` | \`explicit_user_choice\` |

## Profile Contract

- selected_intent_contract: \`quick_factual handling\`

## Root Must-Answer Set

- final_must_answer_intake_status: \`ready\`
- final_must_answer_user_input: \`Final report must answer whether Demo claim holds and what the evidence boundary is.\`
- root_lens_for_wave2: \`Use local evidence to answer whether Demo claim is supported and where uncertainty remains.\`

| id | final_must_answer | intended_profile_handling | initial_answer_phase | mapped_topics | intake_status | queue_consequence |
| --- | --- | --- | --- | --- | --- | --- |
| FMA-1 | Demo claim supported? | quick_factual handling | wave2_synthesis | t1/demo | ready | not_applicable |

## Search Preference Intake

- search_preference_intake_status: \`not_specified_use_profile_defaults\`
- user_search_preference_input: \`not_specified_use_profile_defaults\`
- preferred_source_types: \`not_specified_use_profile_defaults\`
- preferred_source_families: \`not_specified_use_profile_defaults\`
- source_date_window: \`not_specified_use_profile_defaults\`
- geography_or_jurisdiction: \`not_specified_use_profile_defaults\`
- language_preferences: \`not_specified_use_profile_defaults\`
- must_include_sources: \`none\`
- exclusion_rules: \`none\`
- source_preference_application_rule: \`source-intake requests should use concrete preferences when present; not_specified_use_profile_defaults means use the selected research profile, topic evidence anchors, and normal trust/tier/evidence-quality rules; preferences cannot weaken evidence gates\`

## Configured Profile Parameters

- active_wave0_formula: \`max(5,min(12,4+ceil(topic_complexity_factor/2)+ceil(cross_topic_dependency_factor/2)))\`
- configured_floors: \`wave0=5; wave1_per_topic=5; primary=2; secondary=1; recent=1; limitation=1\`
- critical_claim_checks: \`profile default checks active\`
- must_answer_policy: \`answer or explicitly classify every root must-answer entry\`
- cost_expectation: \`quick still requires configured Wave 0 refs, per-topic Wave 1 refs, triggered topic artifacts, Wave 2 synthesis, HITL2 human decision, and Readiness\`
- manual_parameter_overrides: \`none\`

## Human Decision Checkpoints

| checkpoint | timing | status | user_input | consequence |
| --- | --- | --- | --- | --- |
| HITL1_profile_and_root_must_answer | before execution begins | recorded | User chose quick_factual; final report must answer whether Demo claim holds and what the evidence boundary is. | profile parameters configured; root lens created |
| HITL2_wave2_readiness_decision | after Wave 2 synthesis | not_started | not_applicable | not_started |

## HITL2 Wave 2 Readiness Decision

- hitl2_checkpoint_status: \`not_started\`
- answerability_class: \`not_assessed\`
- human_checkpoint_status: \`not_started\`
- final_report_view: \`not_started\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`not_started\`
- repair_recommendation: \`not_started\`
- user_decision: \`not_started\`
- hitl2_decision_brief_path: \`${join(runRoot, "seed_topics", "_artifacts", "wave2", "human-decision-brief.md")}\`
`;
}
