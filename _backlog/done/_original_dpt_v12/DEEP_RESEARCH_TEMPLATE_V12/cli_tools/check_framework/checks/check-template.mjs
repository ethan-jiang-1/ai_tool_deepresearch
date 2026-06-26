import { join } from "node:path";
import { Finding } from "../lib/finding.mjs";
import { exists, readText, relPosix, walkFiles } from "../lib/fs.mjs";
import {
  ACCEPTANCE_STATUS_VALUES,
  ACTIVE_QUEUE_TASK_SLOTS,
  ANSWERABILITY_CLASS_VALUES,
  COMMERCIAL_INTENT_VALUES,
  CONTENT_RETENTION_DECISION_VALUES,
  COUNTED_FOR_FLOOR_VALUES,
  CROSS_VERIFICATION_REQUIRED_VALUES,
  CROSS_VERIFICATION_STATUS_VALUES,
  CURRENT_MODE_VALUES,
  EVIDENCE_ROLE_VALUES,
  EXECUTION_MODE_VALUES,
  FINAL_REPORT_VIEW_VALUES,
  FORBIDDEN_TEMPLATE_PATHS,
  GATE_VALUES,
  HITL2_USER_DECISION_VALUES,
  HUMAN_CHECKPOINT_STATUS_VALUES,
  INTERRUPT_CONDITION_VALUES,
  LOCAL_REFERENCE_TEMPLATE_FIELDS,
  MARKETING_RISK_VALUES,
  MUST_ANSWER_ANSWER_PHASE_VALUES,
  MUST_ANSWER_INITIAL_PHASE_VALUES,
  MUST_ANSWER_STATUS_VALUES,
  OUTPUT_BOUNDARIES,
  NEXT_GATE_VALUES,
  QUEUE_HEALTH_VALUES,
  QUEUE_PRODUCER_RULE_VALUES,
  REFILL_PRIORITY_CLASSES,
  RECEIPT_CHECK_PHASE_VALUES,
  REQUIRED_TEMPLATE_PATHS,
  RESEARCH_PROFILES,
  ROOT_MUST_ANSWER_COLUMNS,
  SEED_BACKFILL_STATUS_VALUES,
  SEED_TOPIC_INTAKE_COLUMNS,
  SOURCE_INTAKE_RUNNER_MODE_VALUES,
  SOURCE_INTAKE_STATUS_VALUES,
  SOURCE_INTAKE_WAIT_STATE_VALUES,
  STATE_VALUES,
  STOP_AUTHORIZATION_STATES,
  SYNTHESIS_MATRIX_COLUMNS,
  TIER_VALUES,
  TOPOLOGY_DELTA_DECISION_VALUES,
  TOPOLOGY_DELTA_DISPOSITION_VALUES,
  TOPOLOGY_SYNC_STATE_VALUES,
  TOPIC_REGISTRY_COLUMNS,
  TOPIC_UNIQUE_STATUS_VALUES,
  TRUST_LEVEL_VALUES,
  WAVE0_EXCLUDED_COLUMNS,
  WAVE0_INVENTORY_COLUMNS,
  WAVE0_UNAVAILABLE_RECORD_COLUMNS,
  WAVE1_AUDIT_COLUMNS,
  WAVE1_EXCEPTION_RECORD_COLUMNS,
  WAVE1_EXCLUDED_COLUMNS,
  WAVE1_INVENTORY_COLUMNS,
  WAVE2_AUDIT_COLUMNS,
  WAVE_VALUES,
  WEB_SUBSTANCE_VALUES,
} from "../contracts/constants.mjs";
import { GATE_REGISTRY } from "../contracts/gates.mjs";
import { hierarchicalSectionText, markdownTables, requiredColumnsMissing } from "../lib/markdown.mjs";
import { GATE_CHECKS, GATE_RUNTIME_FINDINGS, gateRegistryIntegrityFindings } from "./gates/index.mjs";

const STALE_V11_PACKAGE_PATH = `DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_${"V11"}`;
const STALE_V11_LABEL = "v" + "11.7";
const STALE_V11_VERSION = new RegExp("\\bv" + "11\\.7\\b");
const BOUNDARY_HOOK_IDS = [
  "hook_setup_to_wave0_start",
  "hook_wave0_closeout_to_wave1_start",
  "hook_wave1_topic_fanin_steering",
  "hook_wave1_closeout_to_wave2_start",
  "hook_wave2_closeout_to_hitl2",
  "hook_readiness_closeout_to_final_delivery",
];
const BOUNDARY_HOOK_COMMAND_REQUIREMENTS = {
  hook_setup_to_wave0_start: [
    "command_playbooks/check-seed-intake.md",
    "command_playbooks/check-surfaces.md",
    "check-gate-setup-ready",
    "check-seed-intake",
    "check-surfaces",
  ],
  hook_wave0_closeout_to_wave1_start: [
    "command_playbooks/check-runtime.md",
    "command_playbooks/check-queue-receipts.md",
    "flows/reference-artifact-backfill.md",
    "check-gate-wave0-complete",
    "check-queue-receipts",
  ],
  hook_wave1_topic_fanin_steering: [
    "command_playbooks/check-queue-receipts.md",
    "command_playbooks/check-surfaces.md",
    "flows/source-intake-flow.md",
    "flows/reference-artifact-backfill.md",
    "check-queue-receipts",
  ],
  hook_wave1_closeout_to_wave2_start: [
    "command_playbooks/check-runtime.md",
    "command_playbooks/check-queue-receipts.md",
    "flows/reference-artifact-backfill.md",
    "topic target coverage",
    "check-gate-wave1-complete",
    "check-queue-receipts",
  ],
  hook_wave2_closeout_to_hitl2: [
    "command_playbooks/check-runtime.md",
    "command_playbooks/check-queue-receipts.md",
    "hitl2_pending_or_recorded_ready",
    "check-gate-wave2-complete",
    "check-queue-receipts",
  ],
  hook_readiness_closeout_to_final_delivery: [
    "command_playbooks/check-runtime.md",
    "command_playbooks/check-queue-receipts.md",
    "command_playbooks/create-final.md",
    "check-gate-readiness-passed",
    "check-queue-receipts",
  ],
};

function missingRequired(root) {
  const findings = [];
  for (const rel of REQUIRED_TEMPLATE_PATHS) {
    if (!exists(join(root, rel))) {
      findings.push(new Finding("E002", `missing required template path: ${rel}`));
    }
  }
  return findings;
}

function forbiddenTemplatePaths(root) {
  const findings = [];
  for (const rel of FORBIDDEN_TEMPLATE_PATHS) {
    if (exists(join(root, rel))) {
      findings.push(new Finding("E016", `path is invalid in the current template package: ${rel}`));
    }
  }
  return findings;
}

function outputBoundaryFindings(root) {
  const findings = [];
  for (const [rel, [begin, end]] of Object.entries(OUTPUT_BOUNDARIES)) {
    const path = join(root, rel);
    if (!exists(path)) {
      continue;
    }
    const text = readText(path);
    if (!text.includes(begin) || !text.includes(end)) {
      findings.push(new Finding("E004", `${rel} missing output boundary ${begin} / ${end}`));
    }
  }
  return findings;
}

function textEntries(root) {
  return walkFiles(root, (filePath) => filePath.endsWith(".md") || filePath.endsWith(".mjs")).map((path) => {
    return { path, rel: relPosix(root, path), text: readText(path) };
  });
}

function invalidActiveTermFindings(entries) {
  const findings = [];
  const skippedFiles = new Set(["VERSION-LOG.md"]);
  const skippedPrefixes = ["cli_tools/check_framework/tests/"];
  const blockedProfileStrictness = ["rig", "or"].join("");
  const blockedProfileEnum = ["RIG", "OR_PROFILES"].join("");
  const blockedProfileField = ["research_", blockedProfileStrictness].join("");
  const blockedAdjustCommand = ["adjust-", blockedProfileStrictness].join("");
  const invalidFinalPlaceholder = ["final_", "<view"].join("");
  const invalidFinalSlugPlaceholder = ["final_", "<view-slug>"].join("");
  const invalidFinalBracePlaceholder = ["final_", "{view"].join("");
  const invalidFinalBraceSlugPlaceholder = ["final_", "{view-slug}"].join("");
  const invalidCustomFinalAnglePlaceholder = ["final_custom_", "<"].join("");
  const invalidCustomFinalBraceSlugPlaceholder = ["final_custom_", "{slug}"].join("");
  const blockedSupportPhrase = ["backward-", ["com", "patible"].join("")].join("");
  const blockedSupportPattern = ["com", "pat(?:ibility|ible)"].join("");
  const invalidProfileRequiredHelper = ["profile", "Required", "For", "Root"].join("");
  const invalidRootFileCountPattern = ["four", "\\s+root(?:\\s+control)?\\s+files"].join("");
  const invalidControlFileCountPattern = ["four", "\\s+(?:\\w+\\s+){0,4}?control\\s+files"].join("");
  const rules = [
    new RegExp(`\\b${blockedProfileEnum}\\b`),
    new RegExp(`\\b${blockedProfileField}\\b`, "i"),
    new RegExp(`\\b${blockedAdjustCommand}\\b`, "i"),
    new RegExp(`\\b${blockedProfileStrictness}\\b`, "i"),
    /\bH[12]\b/,
    /\bH[12]_[A-Za-z0-9_]+\b/,
    /\bh[12]_[a-z0-9_]+\b/,
    new RegExp(`\\b${invalidRootFileCountPattern}\\b`, "i"),
    new RegExp(`\\b${invalidControlFileCountPattern}\\b`, "i"),
    new RegExp(`${invalidFinalPlaceholder}|${invalidFinalSlugPlaceholder}|${invalidFinalBracePlaceholder}|${invalidFinalBraceSlugPlaceholder}`, "i"),
    new RegExp(`${invalidCustomFinalAnglePlaceholder}|${invalidCustomFinalBraceSlugPlaceholder}`, "i"),
    new RegExp(`\\b${blockedSupportPattern}\\b`, "i"),
    new RegExp(`\\b${blockedSupportPhrase}\\b`, "i"),
    /\bolder\s+framework\b/i,
    /\bpre[- ]v12\b/i,
    new RegExp(`\\b${invalidProfileRequiredHelper}\\b`),
  ];

  for (const { rel, text } of entries) {
    if (skippedFiles.has(rel) || skippedPrefixes.some((prefix) => rel.startsWith(prefix))) {
      continue;
    }
    for (const rule of rules) {
      const match = text.match(rule);
      if (match) {
        findings.push(new Finding("E008", `${rel} contains invalid current contract term: ${match[0]}`));
      }
    }
  }
  return findings;
}

function invalidOutputTemplatePathFindings(entries) {
  const findings = [];
  const skippedFiles = new Set(["VERSION-LOG.md"]);
  const skippedPrefixes = ["cli_tools/check_framework/tests/"];
  const invalidDir = ["out", "puts"].join("");
  const rules = [
    new RegExp(`_framework[\\\\/]+${invalidDir}(?:[\\\\/]|\\*)`, "i"),
    new RegExp(`(^|[^A-Za-z0-9_])${invalidDir}[\\\\/]`, "i"),
  ];

  for (const { rel, text } of entries) {
    if (skippedFiles.has(rel) || skippedPrefixes.some((prefix) => rel.startsWith(prefix))) {
      continue;
    }
    for (const rule of rules) {
      const match = text.match(rule);
      if (match) {
        findings.push(new Finding("E016", `${rel} contains invalid current template path: ${match[0].trim()}`));
      }
    }
  }
  return findings;
}

function activeMarkdownContract(rel) {
  return rel.endsWith(".md")
    && (
      !rel.includes("/")
      || rel.startsWith("command_playbooks/")
      || rel.startsWith("specs/")
      || rel.startsWith("flows/")
      || rel.startsWith("output_templates/")
    );
}

function markdownFenceBalanceFindings(entries) {
  const findings = [];
  for (const { rel, text } of entries) {
    if (!activeMarkdownContract(rel)) {
      continue;
    }
    let openLine = null;
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (/^ {0,3}```/.test(line)) {
        openLine = openLine === null ? idx + 1 : null;
      }
    });
    if (openLine !== null) {
      findings.push(new Finding("E008", `${rel} has unbalanced Markdown code fence opened near line ${openLine}`));
    }
  }
  return findings;
}

function currentVersion(root) {
  const constants = join(root, "specs/CONSTANTS.md");
  if (!exists(constants)) {
    return null;
  }
  const match = readText(constants).match(/^- current_version: `(v\d+\.\d+)`$/m);
  return match ? match[1] : null;
}

function setProjection(values) {
  return [...values].join(" / ");
}

function constantEnumValue(constants, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = constants.match(new RegExp(`^- ${escaped}: \`([^\`]+)\`$`, "m"));
  return match ? match[1] : null;
}

function sectionText(text, sectionName) {
  return hierarchicalSectionText(text, sectionName);
}

function versionFindings(root, entries) {
  const findings = [];
  const current = currentVersion(root);
  const constants = join(root, "specs/CONSTANTS.md");
  if (exists(constants) && !current) {
    findings.push(new Finding("E003", "specs/CONSTANTS.md current_version is missing or malformed"));
  }

  if (current) {
    const versionLog = join(root, "VERSION-LOG.md");
    const currentHeading = `## ${current.toUpperCase()} `;
    if (exists(versionLog) && !readText(versionLog).includes(currentHeading)) {
      findings.push(new Finding("E003", `VERSION-LOG.md lacks current version history entry: ${current.toUpperCase()}`));
    }
  }

  for (const { rel, text } of entries) {
    if (text.includes(STALE_V11_PACKAGE_PATH)) {
      findings.push(new Finding("E016", `stale V11 template path reference: ${rel}`));
    }
    if (rel !== "VERSION-LOG.md" && STALE_V11_VERSION.test(text)) {
      findings.push(new Finding("E003", `stale ${STALE_V11_LABEL} literal outside version history: ${rel}`));
    }
    if (current && rel !== "specs/CONSTANTS.md" && rel !== "VERSION-LOG.md") {
      const upper = current.toUpperCase();
      if (text.includes(current) || text.includes(upper)) {
        findings.push(new Finding("E003", `hard-coded current template version outside specs/CONSTANTS.md: ${rel}`));
      }
    }
  }

  const plan = join(root, "output_templates/PLAN.md");
  if (exists(plan) && !readText(plan).includes("| `template_version` | `<TEMPLATE_VERSION>` |")) {
    findings.push(new Finding("E003", "output_templates/PLAN.md generated template_version must use <TEMPLATE_VERSION> placeholder"));
  }
  return findings;
}

function constantsProjectionFindings(root) {
  const findings = [];
  const constantsPath = join(root, "specs/CONSTANTS.md");
  if (!exists(constantsPath)) {
    return findings;
  }
  const constants = readText(constantsPath);
  const requiredSections = [
    "Template Package Identity",
    "Run State Enums",
    "Research And Evidence Enums",
    "Topic And Topology Enums",
    "Local Reference File Fields",
    "Local Reference Section Names",
  ];
  for (const section of requiredSections) {
    if (!constants.includes(`## ${section}`)) {
      findings.push(new Finding("E008", `specs/CONSTANTS.md missing section: ${section}`));
    }
  }
  if (!/^- version_placeholder: `<TEMPLATE_VERSION>`$/m.test(constants)) {
    findings.push(new Finding("E003", "specs/CONSTANTS.md version_placeholder must be <TEMPLATE_VERSION>"));
  }

  const requiredEnumProjections = {
    current_mode: setProjection(CURRENT_MODE_VALUES),
    state: setProjection(STATE_VALUES),
    current_wave: setProjection(WAVE_VALUES),
    current_gate: setProjection(GATE_VALUES),
    next_gate: setProjection(NEXT_GATE_VALUES),
    queue_health: setProjection(QUEUE_HEALTH_VALUES),
    execution_mode: setProjection(EXECUTION_MODE_VALUES),
    queue_producer_rule: setProjection(QUEUE_PRODUCER_RULE_VALUES),
    receipt_check_phase: setProjection(RECEIPT_CHECK_PHASE_VALUES),
    stop_authorization_state: setProjection(STOP_AUTHORIZATION_STATES),
    interrupt_condition_matched: setProjection(INTERRUPT_CONDITION_VALUES),
    source_intake_status: setProjection(SOURCE_INTAKE_STATUS_VALUES),
    source_intake_runner_mode: setProjection(SOURCE_INTAKE_RUNNER_MODE_VALUES),
    source_intake_wait_state: setProjection(SOURCE_INTAKE_WAIT_STATE_VALUES),
    human_checkpoint_status: setProjection(HUMAN_CHECKPOINT_STATUS_VALUES),
    answerability_class: setProjection(ANSWERABILITY_CLASS_VALUES),
    hitl2_user_decision: setProjection(HITL2_USER_DECISION_VALUES),
    final_report_view: setProjection(FINAL_REPORT_VIEW_VALUES),
    research_profile: setProjection(RESEARCH_PROFILES),
    must_answer_initial_phase: setProjection(MUST_ANSWER_INITIAL_PHASE_VALUES),
    must_answer_answer_phase: setProjection(MUST_ANSWER_ANSWER_PHASE_VALUES),
    must_answer_status: setProjection(MUST_ANSWER_STATUS_VALUES),
    trust_level: setProjection(TRUST_LEVEL_VALUES),
    web_substance: setProjection(WEB_SUBSTANCE_VALUES),
    commercial_intent: setProjection(COMMERCIAL_INTENT_VALUES),
    marketing_risk: setProjection(MARKETING_RISK_VALUES),
    cross_verification_required: setProjection(CROSS_VERIFICATION_REQUIRED_VALUES),
    cross_verification_status: setProjection(CROSS_VERIFICATION_STATUS_VALUES),
    content_retention_decision: setProjection(CONTENT_RETENTION_DECISION_VALUES),
    topology_sync_state: setProjection(TOPOLOGY_SYNC_STATE_VALUES),
    topology_delta_decision: setProjection(TOPOLOGY_DELTA_DECISION_VALUES),
    topology_delta_disposition: setProjection(TOPOLOGY_DELTA_DISPOSITION_VALUES),
    acceptance_status: setProjection(ACCEPTANCE_STATUS_VALUES),
    tier: setProjection(TIER_VALUES),
    evidence_role: setProjection(EVIDENCE_ROLE_VALUES),
    topic_unique_status: setProjection(TOPIC_UNIQUE_STATUS_VALUES),
    seed_backfill_status: setProjection(SEED_BACKFILL_STATUS_VALUES),
    counted_for_floor: setProjection(COUNTED_FOR_FLOOR_VALUES),
  };
  for (const [key, expected] of Object.entries(requiredEnumProjections)) {
    const actual = constantEnumValue(constants, key);
    if (!actual) {
      findings.push(new Finding("E008", `specs/CONSTANTS.md missing CLI-projected enum key: ${key}`));
    } else if (actual !== expected) {
      findings.push(new Finding("E008", `specs/CONSTANTS.md enum ${key} diverges from CLI projection: expected ${expected}; found ${actual}`));
    }
  }

  const localReferenceFields = sectionText(constants, "Local Reference File Fields");
  for (const field of LOCAL_REFERENCE_TEMPLATE_FIELDS) {
    if (!new RegExp(`^-\\s*\`${field}\`\\s*$`, "m").test(localReferenceFields)) {
      findings.push(new Finding("E008", `specs/CONSTANTS.md Local Reference File Fields missing: ${field}`));
    }
  }

  const charterPath = join(root, "specs/CHARTER.md");
  if (exists(charterPath)) {
    const canonicalEnums = sectionText(readText(charterPath), "Canonical Enums");
    if (/\|\s*enum\s*\|\s*values\s*\|/i.test(canonicalEnums)) {
      findings.push(new Finding("E008", "specs/CHARTER.md must not redefine canonical enum values; use specs/CONSTANTS.md"));
    }
  }
  return findings;
}

function tableProjectionFindings(root) {
  const findings = [];
  const checks = [
    ["output_templates/PROFILE.md", "Root Must-Answer Set", ROOT_MUST_ANSWER_COLUMNS],
    ["output_templates/PLAN.md", "Topic Registry", TOPIC_REGISTRY_COLUMNS],
    ["output_templates/PLAN.md", "Seed Topic Intake Matrix", SEED_TOPIC_INTAKE_COLUMNS],
    ["output_templates/STATUS.md", "Wave 0 Accepted Shared Reference Inventory", WAVE0_INVENTORY_COLUMNS],
    ["output_templates/STATUS.md", "Wave 0 Excluded Shared Reference Inventory", WAVE0_EXCLUDED_COLUMNS],
    ["output_templates/STATUS.md", "Unavailable-After-Search Records", WAVE0_UNAVAILABLE_RECORD_COLUMNS],
    ["output_templates/STATUS.md", "Wave 1 Source Floor Audit", WAVE1_AUDIT_COLUMNS],
    ["output_templates/STATUS.md", "Accepted Reference Inventory", WAVE1_INVENTORY_COLUMNS],
    ["output_templates/STATUS.md", "Excluded Reference Inventory", WAVE1_EXCLUDED_COLUMNS],
    ["output_templates/STATUS.md", "Scarcity / Stop Exception Records", WAVE1_EXCEPTION_RECORD_COLUMNS],
    ["output_templates/STATUS.md", "Wave 2 Synthesis Gate Audit", WAVE2_AUDIT_COLUMNS],
    ["output_templates/STATUS.md", "Cross-Topic Conclusion Matrix", SYNTHESIS_MATRIX_COLUMNS],
  ];
  for (const [rel, section, requiredColumns] of checks) {
    const path = join(root, rel);
    if (!exists(path)) {
      continue;
    }
    const tables = markdownTables(sectionText(readText(path), section));
    if (tables.length === 0) {
      findings.push(new Finding("E008", `${rel} missing projected table for ${section}`));
      continue;
    }
    const matchingTable = tables.find((table) => requiredColumnsMissing(table.headers, requiredColumns).length === 0);
    if (!matchingTable) {
      const missing = tables
        .map((table) => requiredColumnsMissing(table.headers, requiredColumns))
        .sort((a, b) => a.length - b.length)[0] ?? requiredColumns;
      findings.push(new Finding("E008", `${rel} ${section} missing projected columns: ${missing.join(", ")}`));
    }
  }
  return findings;
}

function gateRegistryFindings(root) {
  const findings = [...gateRegistryIntegrityFindings()];
  const indexPath = join(root, "specs/GATES.md");
  const indexText = exists(indexPath) ? readText(indexPath) : "";
  const cliNames = new Set(Object.keys(GATE_CHECKS));
  const runtimeIds = new Set(Object.keys(GATE_RUNTIME_FINDINGS));
  for (const gate of GATE_REGISTRY) {
    if (!GATE_VALUES.has(gate.id)) {
      findings.push(new Finding("E008", `gate registry id missing from current_gate enum: ${gate.id}`));
    }
    if (!cliNames.has(gate.cliName)) {
      findings.push(new Finding("E008", `gate registry cliName is not registered: ${gate.cliName}`));
    }
    if (!runtimeIds.has(gate.id)) {
      findings.push(new Finding("E008", `gate registry id is not registered for runtime findings: ${gate.id}`));
    }
    for (const rel of [gate.specPath, gate.checkerPath]) {
      if (!exists(join(root, rel))) {
        findings.push(new Finding("E002", `gate registry path does not exist: ${rel}`));
      }
    }
    for (const marker of [gate.id, gate.specPath, gate.checkerPath, gate.cliName]) {
      if (indexText && !indexText.includes(marker)) {
        findings.push(new Finding("E008", `specs/GATES.md missing gate registry marker: ${marker}`));
      }
    }
  }
  return findings;
}

function planAuthorityPointerFindings(root) {
  const findings = [];
  const planPath = join(root, "output_templates/PLAN.md");
  if (!exists(planPath)) {
    return findings;
  }
  const plan = readText(planPath);
  const requiredPointers = [
    "specs/GATES.md",
    "specs/gates/",
    "specs/RESEARCH_PROFILES.md",
    "specs/CONSTANTS.md",
    "specs/METHODOLOGY.md",
  ];
  for (const pointer of requiredPointers) {
    if (!plan.includes(pointer)) {
      findings.push(new Finding("E008", `output_templates/PLAN.md missing framework authority pointer: ${pointer}`));
    }
  }
  for (const gate of GATE_REGISTRY) {
    if (!plan.includes(gate.specPath)) {
      findings.push(new Finding("E008", `output_templates/PLAN.md missing gate authority pointer: ${gate.specPath}`));
    }
  }
  if (/\|\s*profile\s*\|\s*when to use\s*\|/i.test(plan)) {
    findings.push(new Finding("E008", "output_templates/PLAN.md must not duplicate the full Research Profiles preset table"));
  }
  if (/\|\s*profile\s*\|\s*applicability boundary\s*\|/i.test(plan)) {
    findings.push(new Finding("E008", "output_templates/PLAN.md must not duplicate the full Research Profiles preset table"));
  }
  if (/```markdown\s*# <Title>[\s\S]*?source_url:/m.test(plan)) {
    findings.push(new Finding("E008", "output_templates/PLAN.md must not duplicate the full Local Reference Template body"));
  }
  const forbiddenPlanMarkers = [
    [/^### Profile Cost Control\s*$/m, "output_templates/PLAN.md must point to framework profile/cost authority instead of duplicating the Profile Cost Control block"],
    [/^### Seed Topic Intake Standard\s*$/m, "output_templates/PLAN.md must point to framework seed intake authority instead of duplicating the Seed Topic Intake Standard block"],
    [/^### Seed Growth Sections\s*$/m, "output_templates/PLAN.md must point to framework seed growth authority instead of duplicating the Seed Growth Sections block"],
    [/^### Minimum Artifact Set\s*$/m, "output_templates/PLAN.md must point to framework artifact authority instead of duplicating the Minimum Artifact Set block"],
    [/^## Topic Stop Conditions\s*$/m, "output_templates/PLAN.md must point to framework stop-condition authority instead of duplicating topic stop conditions"],
    [/Use this scoring anchor for both factors:/, "output_templates/PLAN.md must not duplicate factor scoring anchors from instantiation-flow"],
    [/Hard count rules:\s*\n\s*-\s*`web_substance=thin`/m, "output_templates/PLAN.md must not duplicate the full Webpage Material Diagnostic Gate rule body"],
    [/Marketing pages may be accepted as evidence of the publisher's own messaging/m, "output_templates/PLAN.md must not duplicate the full Webpage Material Diagnostic Gate rule body"],
  ];
  for (const [pattern, message] of forbiddenPlanMarkers) {
    if (pattern.test(plan)) {
      findings.push(new Finding("E008", message));
    }
  }
  return findings;
}

function commandEntrypointProjectionFindings(root) {
  const findings = [];
  const planPath = join(root, "output_templates/PLAN.md");
  if (!exists(planPath)) {
    return findings;
  }
  const plan = readText(planPath);
  const section = sectionText(plan, "Runtime Command Entrypoint");
  if (!section) {
    findings.push(new Finding("E008", "output_templates/PLAN.md missing Runtime Command Entrypoint section"));
    return findings;
  }
  const requiredMarkers = [
    "framework_command_index",
    "framework_cli_check",
    "runtime_profile",
    "runtime_plan",
    "runtime_status",
    "runtime_queue",
    "runtime_trace",
    "_framework/COMMANDS.md",
    "_framework/cli_tools/check_framework.mjs",
    "_framework/output_templates/*.md",
  ];
  for (const marker of requiredMarkers) {
    if (!plan.includes(marker)) {
      findings.push(new Finding("E008", `output_templates/PLAN.md Runtime Command Entrypoint missing marker: ${marker}`));
    }
  }
  return findings;
}

function queueRefillOrderingFindings(root) {
  const findings = [];
  const queuePath = join(root, "output_templates/QUEUE.md");
  if (!exists(queuePath)) {
    return findings;
  }
  const queue = readText(queuePath);
  const refill = sectionText(queue, "Refill Pool");
  if (!refill) {
    return findings;
  }
  const requiredMarkers = [
    "refill_pool_ordering_rule",
    "refill_pool_priority_order",
    "ready/prerequisite satisfied",
    "priority_class",
    "current wave/gate affinity",
    "restore_priority",
    "physical order",
  ];
  for (const marker of requiredMarkers) {
    if (!refill.includes(marker)) {
      findings.push(new Finding("E008", `output_templates/QUEUE.md Refill Pool ordering rule missing marker: ${marker}`));
    }
  }
  const validClasses = new Set(REFILL_PRIORITY_CLASSES);
  const blocks = refill.split(/^###\s+Candidate Block\s*$/m).slice(1);
  for (const [idx, block] of blocks.entries()) {
    const match = block.match(/^- priority_class:\s*`([^`]+)`\s*$/m);
    if (!match) {
      findings.push(new Finding("E008", `output_templates/QUEUE.md Refill Pool Candidate Block ${idx + 1} missing priority_class`));
      continue;
    }
    if (!validClasses.has(match[1])) {
      findings.push(new Finding("E008", `output_templates/QUEUE.md Refill Pool Candidate Block ${idx + 1} has unknown priority_class: ${match[1]}`));
    }
  }
  return findings;
}

const QUEUE_ACTIVE_CONTRACT_FIELDS = [
  "work_id",
  "action",
  "producer_rule",
  "why_this_matters",
  "impact_scope",
  "required_receipts",
  "done_condition",
  "verification",
  "writes_to",
  "status_sync",
  "completion_receipt",
  "failure_route",
];

const QUEUE_CANDIDATE_CONTRACT_FIELDS = [
  "work_id",
  "candidate",
  "priority_class",
  "producer_rule",
  "why_this_matters",
  "impact_scope",
  "required_receipts",
  "prerequisite",
  "promotion_trigger",
  "done_condition",
  "verification",
  "writes_to",
  "status_sync",
  "completion_receipt",
  "failure_route",
  "preempted_from_slot",
  "restore_priority",
];

function bulletFieldPresent(section, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^-\\s*${escaped}:`, "m").test(section);
}

function queueWorkUnitContractTemplateFindings(root) {
  const findings = [];
  const queuePath = join(root, "output_templates/QUEUE.md");
  if (!exists(queuePath)) {
    return findings;
  }
  const queue = readText(queuePath);
  const active = sectionText(queue, "Active Queue");
  const requiredMarkers = [
    "Queue contract authority",
    "queue_contract_authority",
    "queue_flow_authority",
    "queue_runtime_role",
    "runtime data",
    "not the mechanism SSOT",
    "receipt_check_phase",
    "default search route is native_search",
    "Exa",
    "native todo/task/plan is a projection",
    "artifact_steering_current",
    "direct_reference_exception",
    "active_window_contract_complete",
    "topology_delta_disposed",
    "hitl2_pending_or_recorded_ready",
    "Boundary Hook Execution Protocol",
  ];
  for (const marker of requiredMarkers) {
    if (!queue.includes(marker)) {
      findings.push(new Finding("E008", `output_templates/QUEUE.md missing Queue contract marker: ${marker}`));
    }
  }
  if (!active.includes("specs/QUEUE_CONTRACT.md") || !active.includes("flows/queue-agentic-flow.md")) {
    findings.push(new Finding("E008", "output_templates/QUEUE.md Active Queue must point to Queue Contract and Queue Agentic Flow authorities"));
  }
  const constantsPath = join(root, "specs/CONSTANTS.md");
  if (exists(constantsPath)) {
    const constants = readText(constantsPath);
    const receiptPhase = constantEnumValue(constants, "receipt_check_phase");
    if (!receiptPhase || receiptPhase !== setProjection(RECEIPT_CHECK_PHASE_VALUES)) {
      findings.push(new Finding("E008", "specs/CONSTANTS.md must project receipt_check_phase enum values"));
    }
  }
  const queueContract = exists(join(root, "specs/QUEUE_CONTRACT.md")) ? readText(join(root, "specs/QUEUE_CONTRACT.md")) : "";
  if (!queueContract.includes("`boundary_hook`")) {
    findings.push(new Finding("E008", "specs/QUEUE_CONTRACT.md Legal Producer Rules must include boundary_hook"));
  }
  const requiredReceiptVocabulary = [
    "queued_artifact_repair:<topic-id>/<topic-slug>",
    "direct_reference_exception",
    "active_window_contract_complete",
    "topology_delta_disposed",
    "hitl2_pending_or_recorded_ready",
    "whole-receipt alternatives",
    "A or B",
    "unknown receipt prefixes are invalid",
  ];
  for (const marker of requiredReceiptVocabulary) {
    if (!queueContract.includes(marker)) {
      findings.push(new Finding("E008", `specs/QUEUE_CONTRACT.md must define fail-closed receipt vocabulary marker: ${marker}`));
    }
  }
  for (const slot of ACTIVE_QUEUE_TASK_SLOTS) {
    const slotSection = sectionText(queue, slot);
    if (!slotSection) {
      findings.push(new Finding("E008", `output_templates/QUEUE.md missing active slot template: ${slot}`));
      continue;
    }
    for (const field of QUEUE_ACTIVE_CONTRACT_FIELDS) {
      if (!bulletFieldPresent(slotSection, field)) {
        findings.push(new Finding("E008", `output_templates/QUEUE.md ${slot} missing Queue Work Unit Contract field: ${field}`));
      }
    }
    if (!["source_gap", "status_gap", "gate_gap", "plan_target", "trigger"].some((field) => bulletFieldPresent(slotSection, field))) {
      findings.push(new Finding("E008", `output_templates/QUEUE.md ${slot} missing Queue Work Unit lineage field`));
    }
  }
  const refill = sectionText(queue, "Refill Pool");
  const blocks = refill.split(/^###\s+Candidate Block\s*$/m).slice(1);
  for (const [idx, block] of blocks.entries()) {
    for (const field of QUEUE_CANDIDATE_CONTRACT_FIELDS) {
      if (!bulletFieldPresent(block, field)) {
        findings.push(new Finding("E008", `output_templates/QUEUE.md Refill Pool Candidate Block ${idx + 1} missing Queue Work Unit Contract field: ${field}`));
      }
    }
    if (!["source_gap", "status_gap", "gate_gap", "plan_target", "trigger"].some((field) => bulletFieldPresent(block, field))) {
      findings.push(new Finding("E008", `output_templates/QUEUE.md Refill Pool Candidate Block ${idx + 1} missing Queue Work Unit lineage field`));
    }
  }
  return findings;
}

function boundaryHookTemplateFindings(root) {
  const findings = [];

  if (exists(join(root, "flows/boundary-hooks.md"))) {
    findings.push(new Finding("E016", "flows/boundary-hooks.md must not be added; Boundary Hook invocation lives in flows/execution-flow.md and execution lives in flows/queue-agentic-flow.md"));
  }

  for (const svgPath of walkFiles(join(root, "flows"), (filePath) => filePath.endsWith(".svg"))) {
    findings.push(new Finding("E016", `Boundary Hook diagrams must be Mermaid inside flows/execution-flow.md, not SVG source files: ${relPosix(root, svgPath)}`));
  }

  const executionFlow = join(root, "flows/execution-flow.md");
  if (exists(executionFlow)) {
    const text = readText(executionFlow);
    const callMap = sectionText(text, "Boundary Hook Call Map");
    if (!callMap) {
      findings.push(new Finding("E008", "execution-flow must contain Boundary Hook Call Map"));
    } else {
      const requiredMarkers = [
        "```mermaid",
        "Execution Flow",
        "Queue Agentic Flow",
        "Queue repair work",
        "foreground Queue-visible hook work",
        "pass only after hook receipt",
      ];
      for (const marker of requiredMarkers) {
        if (!callMap.includes(marker)) {
          findings.push(new Finding("E008", `execution-flow Boundary Hook Call Map missing marker: ${marker}`));
        }
      }
      for (const hookId of BOUNDARY_HOOK_IDS) {
        if (!callMap.includes(hookId)) {
          findings.push(new Finding("E008", `execution-flow Boundary Hook Call Map missing hook id: ${hookId}`));
        }
      }
    }
    const internalLoop = sectionText(text, "Wave Internal Loop Pattern");
    if (!internalLoop) {
      findings.push(new Finding("E008", "execution-flow must contain Wave Internal Loop Pattern"));
    } else {
      const requiredMarkers = [
        "```mermaid",
        "Queue slot work",
        "source intake / fan-in / reference promotion",
        "gate audit",
        "same-wave repair/refill",
        "boundary hook",
        "Wave 0 loop",
        "Wave 1 loop",
        "Wave 2 loop",
      ];
      for (const marker of requiredMarkers) {
        if (!internalLoop.includes(marker)) {
          findings.push(new Finding("E008", `execution-flow Wave Internal Loop Pattern missing marker: ${marker}`));
        }
      }
    }
  }

  const queueFlow = join(root, "flows/queue-agentic-flow.md");
  if (exists(queueFlow)) {
    const text = readText(queueFlow);
    const protocol = sectionText(text, "Boundary Hook Execution Protocol");
    const catalog = sectionText(text, "Boundary Hook Catalog");
    if (!protocol) {
      findings.push(new Finding("E008", "queue-agentic-flow must contain Boundary Hook Execution Protocol"));
    } else {
      const requiredMarkers = [
        "foreground Queue-visible work",
        "not a detached event handler",
        "Pending slots",
        "Refill Pool candidates",
        "must not execute the hook before it reaches `slot_1_current`",
      ];
      for (const marker of requiredMarkers) {
        if (!protocol.includes(marker)) {
          findings.push(new Finding("E008", `queue-agentic-flow Boundary Hook Execution Protocol missing marker: ${marker}`));
        }
      }
    }
    if (!catalog) {
      findings.push(new Finding("E008", "queue-agentic-flow must contain Boundary Hook Catalog"));
    }
    for (const hookId of BOUNDARY_HOOK_IDS) {
      if (!text.includes(hookId)) {
        findings.push(new Finding("E008", `queue-agentic-flow missing Boundary Hook id: ${hookId}`));
      }
    }
    const commandMatrix = sectionText(text, "Boundary Hook Command Matrix");
    if (!commandMatrix) {
      findings.push(new Finding("E008", "queue-agentic-flow must contain Boundary Hook Command Matrix"));
    } else {
      const requiredMarkers = [
        "node <RUN_DIR>/_framework/cli_tools/check_framework.mjs --gate <gate> <RUN_DIR>",
        "Read-only CLI gates diagnose and verify",
        "foreground Queue action",
        "command/playbook or flow to open",
        "read-only CLI gates to run",
        "failure route",
      ];
      for (const marker of requiredMarkers) {
        if (!commandMatrix.includes(marker)) {
          findings.push(new Finding("E008", `queue-agentic-flow Boundary Hook Command Matrix missing marker: ${marker}`));
        }
      }
      const matrixLines = commandMatrix.split(/\r?\n/);
      for (const hookId of BOUNDARY_HOOK_IDS) {
        const row = matrixLines.find((line) => line.includes(`| \`${hookId}\` |`)) ?? "";
        if (!row) {
          findings.push(new Finding("E008", `queue-agentic-flow Boundary Hook Command Matrix missing row: ${hookId}`));
          continue;
        }
        for (const marker of BOUNDARY_HOOK_COMMAND_REQUIREMENTS[hookId]) {
          if (!row.includes(marker)) {
            findings.push(new Finding("E008", `queue-agentic-flow Boundary Hook Command Matrix row ${hookId} missing command/check marker: ${marker}`));
          }
        }
      }
    }
  }

  const charter = join(root, "specs/CHARTER.md");
  if (exists(charter)) {
    const text = readText(charter);
    if (!text.includes("Boundary hook invocation is owned by `flows/execution-flow.md`") || !text.includes("Boundary hook execution")) {
      findings.push(new Finding("E008", "CHARTER must state Boundary Hook invocation and execution authority boundaries"));
    }
  }

  const queue = join(root, "output_templates/QUEUE.md");
  if (exists(queue)) {
    const text = readText(queue);
    if (!text.includes("Boundary Hook Execution Protocol")) {
      findings.push(new Finding("E008", "output_templates/QUEUE.md must point hook work units to Boundary Hook Execution Protocol"));
    }
    if (/^##\s+Boundary Hook Catalog\s*$/m.test(text) || BOUNDARY_HOOK_IDS.every((hookId) => text.includes(hookId))) {
      findings.push(new Finding("E008", "output_templates/QUEUE.md must not copy the full Boundary Hook catalog; it is runtime data, not hook mechanism SSOT"));
    }
  }

  return findings;
}

function policyRegressionFindings(root) {
  const findings = [];
  const staleCurrentTruth = ["current", "truth"].join(" ");
  const staleSourceOfExecutableWork = ["source", "of", "executable", "work"].join(" ");
  const charter = join(root, "specs/CHARTER.md");
  if (exists(charter)) {
    const text = readText(charter);
    if (text.includes("Flows and skeletons are creation aids, not independent correctness authorities")) {
      findings.push(new Finding("E008", "CHARTER must distinguish named flow policy authorities from output skeleton projections"));
    }
    if (text.includes("flows/queue-agentic-flow.md") && !text.includes("Named flow policy authorities")) {
      findings.push(new Finding("E008", "CHARTER must state how named flow policy files can act as scoped authorities"));
    }
    if (text.includes("plan defines configured floors")) {
      findings.push(new Finding("E008", "CHARTER must treat configured floors as PROFILE-backed PLAN projections, not plan-owned profile configuration"));
    }
  }

  const plan = join(root, "output_templates/PLAN.md");
  if (exists(plan)) {
    const text = readText(plan);
    if (/Every active queue task must name at least one source of work:[\s\S]*?done_condition`.*, `writes_to`.*, and `status_sync`/.test(text)) {
      findings.push(new Finding("E008", "PLAN must not project the out-of-contract thin Queue task contract"));
    }
    if (text.includes("output_templates/QUEUE.md -> Active Queue")) {
      findings.push(new Finding("E008", "PLAN must not cite output_templates/QUEUE.md as Queue authority"));
    }
    if (text.includes("`PLAN_PATH` defines topic identity, configured floors") || text.includes("Research Profile.active_wave0_formula plus configured floors in Instance Config")) {
      findings.push(new Finding("E008", "PLAN must project PROFILE-backed configured floors instead of presenting PLAN as profile configuration authority"));
    }
    if (text.includes("STATUS records live run truth") || text.includes("QUEUE is the active execution source")) {
      findings.push(new Finding("E008", "PLAN file role text must use current state/action wording instead of non-current live-truth/source wording"));
    }
    const requiredQueueMarkers = [
      "specs/QUEUE_CONTRACT.md -> Queue Work Unit Contract",
      "flows/queue-agentic-flow.md -> Queue Agentic Flow",
      "producer_rule",
      "required_receipts",
      "completion_receipt",
      "failure_route",
    ];
    for (const marker of requiredQueueMarkers) {
      if (!text.includes(marker)) {
        findings.push(new Finding("E008", `PLAN Queue projection missing current Queue contract marker: ${marker}`));
      }
    }
  }

  const profile = join(root, "output_templates/PROFILE.md");
  if (exists(profile)) {
    const text = readText(profile);
    if (text.includes(staleCurrentTruth)) {
      findings.push(new Finding("E008", "PROFILE routine navigation must use current run-state wording, not non-current current-truth wording"));
    }
  }

  const queue = join(root, "output_templates/QUEUE.md");
  if (exists(queue)) {
    const text = readText(queue);
    const invalidProjectionAuthority = ["QUEUE_PATH is source", "of", "truth; native todo/task/plan is a projection"].join(" ");
    if (text.includes(invalidProjectionAuthority)) {
      findings.push(new Finding("E008", "QUEUE projection_authority must say QUEUE_PATH owns native projection state, not introduce a second source-of-truth phrase"));
    }
    if (text.includes("PLAN defines targets and floors")) {
      findings.push(new Finding("E008", "QUEUE plan/status/queue rule must treat floors as PROFILE-backed PLAN projections"));
    }
    if (text.includes("projection_source_of_record")) {
      findings.push(new Finding("E008", "QUEUE Rolling Task Projection must use projection_authority_rule, not non-current projection_source_of_record naming"));
    }
  }

  const statusTemplate = join(root, "output_templates/STATUS.md");
  if (exists(statusTemplate)) {
    const text = readText(statusTemplate);
    const invalidFieldNameWording = ["leg", "acy field name"].join("");
    if (text.includes("cross_topic_synthesis_check_note") || text.includes(invalidFieldNameWording)) {
      findings.push(new Finding("E008", "STATUS must not keep non-current field names for Wave 2 synthesis continuity"));
    }
  }

  for (const relPath of ["output_templates/RUN_ROOT_AGENTS.md", "output_templates/RUN_ROOT_CLAUDE.md"]) {
    const agentPath = join(root, relPath);
    if (!exists(agentPath)) {
      continue;
    }
    const text = readText(agentPath);
    if (text.includes("core startup file") || text.includes("orbit around it")) {
      findings.push(new Finding("E008", `${relPath} must not present PLAN as the center of all root control files`));
    }
    if (text.includes(staleSourceOfExecutableWork)) {
      findings.push(new Finding("E008", `${relPath} must describe QUEUE_PATH as the executable action ledger, not non-current source-of-executable-work wording`));
    }
  }

  const help = join(root, "command_playbooks/help.md");
  if (exists(help)) {
    const text = readText(help);
    if (text.includes("This mutates generated `PLAN`, `STATUS`, `QUEUE`, and `TRACE`")) {
      findings.push(new Finding("E008", "help.md must route profile parameter changes through PROFILE first, then generated projections"));
    }
  }

  const instantiationFlow = join(root, "flows/instantiation-flow.md");
  if (exists(instantiationFlow)) {
    const text = readText(instantiationFlow);
    if (/`QUEUE_PATH` refuses `wave[0-2]_complete`/.test(text)
      || /`QUEUE_PATH` can mark `wave[0-2]_complete`/.test(text)
      || text.includes("`QUEUE_PATH` can mark `wave1_complete` or start Wave 2")) {
      findings.push(new Finding("E008", "instantiation-flow must not describe QUEUE_PATH as gate-state authority; Queue may only schedule, block, or repair executable work"));
    }
  }

  const sourceIntake = join(root, "flows/source-intake-flow.md");
  if (exists(sourceIntake)) {
    const text = readText(sourceIntake);
    if (text.includes("Default to `native_search` unless the request carries advanced-search intent")) {
      findings.push(new Finding("E008", "source-intake-flow must not auto-escalate advanced-search intent to Exa"));
    }
    if (!text.includes("Queue work unit records why native search is insufficient") || !text.includes("Exa-specific capability")) {
      findings.push(new Finding("E008", "source-intake-flow must require explicit Queue work-unit justification before Exa activation"));
    }
  }

  const queueAgenticFlow = join(root, "flows/queue-agentic-flow.md");
  if (exists(queueAgenticFlow)) {
    const text = readText(queueAgenticFlow);
    if (text.includes(staleCurrentTruth)) {
      findings.push(new Finding("E008", "queue-agentic-flow reload guidance must use current run-state wording, not non-current current-truth wording"));
    }
  }

  const exaProfile = join(root, "flows/source-intake-profiles/exa-search.md");
  if (exists(exaProfile)) {
    const text = readText(exaProfile);
    if (/Select `exa_search` over default native search when[\s\S]*?at least one of these signals/.test(text)) {
      findings.push(new Finding("E008", "exa-search profile must treat advanced-search signals as justification candidates, not activation triggers"));
    }
    if (!text.includes("The signals below may justify that Queue work-unit decision, but they do not activate Exa by themselves")) {
      findings.push(new Finding("E008", "exa-search profile must state that capability signals do not activate Exa by themselves"));
    }
  }

  const queueFlow = join(root, "flows/queue-agentic-flow.md");
  if (exists(queueFlow)) {
    const text = readText(queueFlow);
    if (/-> verify result\s*\n-> write declared files/.test(text)) {
      findings.push(new Finding("E008", "queue-agentic-flow must write declared files before verifying completion receipts"));
    }
    if (!/-> write declared files\s*\n-> sync STATUS \/ QUEUE\s*\n-> verify result and completion receipt/.test(text)) {
      findings.push(new Finding("E008", "queue-agentic-flow fixed loop must verify only after declared writes and STATUS/QUEUE sync"));
    }
  }

  const queueReceiptPhaseDocs = [
    ["COMMANDS.md", ["preflight `required_receipts`", "closeout `completion_receipt`", "named branch receipts"]],
    ["command_playbooks/check-queue-receipts.md", ["receipt_check_phase=preflight", "receipt_check_phase=closeout", "Named branch receipts", "Whole-receipt alternatives", "_or_"]],
    ["command_playbooks/check-runtime.md", ["receipt_check_phase", "required_receipts / completion_receipt", "named branch receipts"]],
    ["command_playbooks/check.md", ["preflight/closeout", "receipt_check_phase", "`completion_receipt`"]],
  ];
  for (const [relPath, markers] of queueReceiptPhaseDocs) {
    const docPath = join(root, relPath);
    if (!exists(docPath)) {
      continue;
    }
    const text = readText(docPath);
    for (const marker of markers) {
      if (!text.includes(marker)) {
        findings.push(new Finding("E008", `${relPath} must document Queue receipt preflight/closeout marker: ${marker}`));
      }
    }
  }

  const directReferenceDocs = [
    ["flows/source-intake-flow.md", ["already-known local or user-provided", "no retrieval", "no search", "no fetch"]],
    ["flows/reference-artifact-backfill.md", ["Direct-reference exception", "already-known local/user-provided", "direct_reference_exception", "no retrieval", "no search", "no fetch"]],
    ["specs/WORK_DIRECTORY_LAYOUT.md", ["already-known local/user-provided", "all three negatives", "no retrieval", "no search", "no fetch"]],
    ["specs/METHODOLOGY.md", ["already-known local or user-provided", "no retrieval", "no search", "no fetch"]],
  ];
  for (const [relPath, markers] of directReferenceDocs) {
    const docPath = join(root, relPath);
    if (!exists(docPath)) {
      continue;
    }
    const text = readText(docPath);
    for (const marker of markers) {
      if (!text.includes(marker)) {
        findings.push(new Finding("E008", `${relPath} must preserve direct-reference exception marker: ${marker}`));
      }
    }
  }

  const instantiationScaffoldDocs = [
    ["command_playbooks/instantiate-run-bundle.md", ["topic README files", "reference README files", "REFERENCE_DIR/_INDEX.md", "minimal scaffold README"]],
    ["command_playbooks/instantiate-from-original-topic-md.md", ["Create only the artifact scaffold", "topic README files", "reference README files", "REFERENCE_DIR/_INDEX.md"]],
    ["flows/instantiation-flow.md", ["Do not create topic README files", "reference README files", "_INDEX.md"]],
    ["specs/WORK_DIRECTORY_LAYOUT.md", ["Instantiation must not create execution topic README files", "reference README files", "_INDEX.md"]],
  ];
  for (const [relPath, markers] of instantiationScaffoldDocs) {
    const docPath = join(root, relPath);
    if (!exists(docPath)) {
      continue;
    }
    const text = readText(docPath);
    for (const marker of markers) {
      if (!text.includes(marker)) {
        findings.push(new Finding("E008", `${relPath} must preserve instantiation scaffold boundary marker: ${marker}`));
      }
    }
  }

  const createFinal = join(root, "command_playbooks/create-final.md");
  if (exists(createFinal)) {
    const text = readText(createFinal);
    const hardReadiness = /\bonly after\b/i.test(text)
      && text.includes("current_gate=readiness_passed")
      && text.includes("overall_status=pass");
    if (!hardReadiness) {
      findings.push(new Finding("E008", "create-final precondition must require readiness_passed and Readiness overall_status=pass"));
    }
    if (/Prefer creating final output after `readiness_passed`/.test(text)) {
      findings.push(new Finding("E008", "create-final must not soften Readiness into a preference"));
    }
  }

  const decompose = join(root, "command_playbooks/decompose-seed-topics.md");
  if (exists(decompose)) {
    const text = readText(decompose);
    const runtimeWriteback = text.includes("formalize-topology-delta.md")
      && /writeback authority|write-back authority|write authority/i.test(text)
      && /must not independently mutate/i.test(text);
    if (!runtimeWriteback) {
      findings.push(new Finding("E008", "decompose-seed-topics must defer runtime topology writeback to formalize-topology-delta.md"));
    }
  }

  const instantiateRunBundle = join(root, "command_playbooks/instantiate-run-bundle.md");
  if (exists(instantiateRunBundle)) {
    const text = readText(instantiateRunBundle);
    const boundaryMarkers = [
      "BEGIN PROFILE OUTPUT",
      "END PROFILE OUTPUT",
      "BEGIN PLAN OUTPUT",
      "END PLAN OUTPUT",
      "BEGIN STATUS OUTPUT",
      "END STATUS OUTPUT",
      "BEGIN QUEUE OUTPUT",
      "END QUEUE OUTPUT",
      "BEGIN TRACE OUTPUT",
      "END TRACE OUTPUT",
    ];
    if (!boundaryMarkers.every((marker) => text.includes(marker)) || !/frontmatter/i.test(text) || !/boundary comments/i.test(text)) {
      findings.push(new Finding("E008", "instantiate-run-bundle must require extracting bounded output content without frontmatter or boundary comments"));
    }
  }

  const status = join(root, "output_templates/STATUS.md");
  if (exists(status) && /\blast_verified_result:\s*`[^`]*(instantiation qualified|qualification passed|check-instantiation pass)/i.test(readText(status))) {
    findings.push(new Finding("E008", "STATUS skeleton must not self-assert that instantiation qualification already passed"));
  }

  return findings;
}

export function checkTemplate(root) {
  const entries = textEntries(root);
  return [
    ...missingRequired(root),
    ...forbiddenTemplatePaths(root),
    ...outputBoundaryFindings(root),
    ...versionFindings(root, entries),
    ...invalidActiveTermFindings(entries),
    ...invalidOutputTemplatePathFindings(entries),
    ...markdownFenceBalanceFindings(entries),
    ...constantsProjectionFindings(root),
    ...gateRegistryFindings(root),
    ...tableProjectionFindings(root),
    ...planAuthorityPointerFindings(root),
    ...commandEntrypointProjectionFindings(root),
    ...queueRefillOrderingFindings(root),
    ...queueWorkUnitContractTemplateFindings(root),
    ...boundaryHookTemplateFindings(root),
    ...policyRegressionFindings(root),
  ];
}
