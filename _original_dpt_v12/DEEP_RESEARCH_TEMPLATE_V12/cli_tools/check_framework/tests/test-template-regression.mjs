import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  assertHasFinding,
  assertNoFindings,
  join,
  mkdirSync,
  mkdtempSync,
  rmSync,
  runIfMain,
  tmpdir,
  writeFileSync,
} from "./test-runtime-harness.mjs";
import { checkTemplate } from "../checks/check-template.mjs";
import { REQUIRED_TEMPLATE_PATHS } from "../contracts/constants.mjs";
import { frameworkSnapshotFindings } from "../lib/bundle.mjs";

function writeMinimalTemplatePath(root, relPath) {
  const path = join(root, relPath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, relPath.endsWith(".mjs") ? "export {};\n" : `fixture for ${relPath}\n`);
}

function writePlanSkeleton(root, text) {
  writeMinimalTemplatePath(root, "output_templates/PLAN.md");
  writeFileSync(join(root, "output_templates", "PLAN.md"), text);
}

function writeQueueSkeleton(root, text) {
  writeMinimalTemplatePath(root, "output_templates/QUEUE.md");
  writeFileSync(join(root, "output_templates", "QUEUE.md"), text);
}

function templateFile(relPath) {
  return readFileSync(join("DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12", relPath), "utf8");
}

function section(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "m"));
  return match ? match[1] : "";
}

const BOUNDARY_HOOK_IDS = [
  "hook_setup_to_wave0_start",
  "hook_wave0_closeout_to_wave1_start",
  "hook_wave1_topic_fanin_steering",
  "hook_wave1_closeout_to_wave2_start",
  "hook_wave2_closeout_to_hitl2",
  "hook_readiness_closeout_to_final_delivery",
];

export const tests = [
  [
    "check-template rejects invalid create-control-files entry",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "command_playbooks/create-control-files.md");
        const findings = checkTemplate(root);
        assertHasFinding(findings, /path is invalid in the current template package: command_playbooks\/create-control-files\.md/, "check-template rejects invalid create-control-files entry");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects invalid outputs directory",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "outputs/PLAN.md");
        const findings = checkTemplate(root);
        assertHasFinding(findings, /path is invalid in the current template package: outputs/, "check-template rejects invalid outputs directory");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "framework snapshot requires current required paths",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-framework-snapshot-"));
      try {
        const frameworkRoot = join(runRoot, "_framework");
        for (const relPath of REQUIRED_TEMPLATE_PATHS) {
          if (relPath !== "output_templates/PROFILE.md") {
            writeMinimalTemplatePath(frameworkRoot, relPath);
          }
        }
        writeFileSync(join(frameworkRoot, "specs", "CONSTANTS.md"), "- current_version: `v12.7`\n");
        assertHasFinding(frameworkSnapshotFindings(runRoot), /output_templates\/PROFILE\.md/, "framework snapshot requires current required paths");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects current enum projection drift",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "specs/CONSTANTS.md");
        writeFileSync(join(root, "specs", "CONSTANTS.md"), `
## Template Package Identity

- version_placeholder: \`<TEMPLATE_VERSION>\`

## Run State Enums

- final_report_view: \`profile_default / executive_brief / evidence_map / claim_judgment / technical_deep_dive / custom\`

## Research And Evidence Enums

## Topic And Topology Enums

## Local Reference File Fields

## Local Reference Section Names
`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /enum final_report_view diverges from CLI projection/, "check-template rejects current enum projection drift");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects invalid active contract terms",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        const invalidProfileField = ["research_", "rig", "or"].join("");
        const invalidFinalDir = ["final_", "<view>"].join("");
        const invalidCustomFinalDir = ["final_custom_", "<slug>"].join("");
        const invalidFourGeneratedControlFiles = ["four", "generated", "control files"].join(" ");
        const invalidFourValidControlFiles = ["four", "valid", "control files"].join(" ");
        writeMinimalTemplatePath(root, "README.md");
        writeMinimalTemplatePath(root, "COMMANDS.md");
        writeFileSync(join(root, "README.md"), `Active docs must not mention ${invalidProfileField}, ${invalidFinalDir}, ${invalidCustomFinalDir}, or ${invalidFourGeneratedControlFiles}.\n`);
        writeFileSync(join(root, "COMMANDS.md"), `Active docs must not mention ${invalidFourValidControlFiles}.\n`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /invalid current contract term: research_/, "check-template rejects invalid profile field term");
        assertHasFinding(findings, /invalid current contract term: final_/, "check-template rejects invalid final dir placeholder");
        assertHasFinding(findings, /invalid current contract term: final_custom_</, "check-template rejects invalid custom final dir placeholder");
        assertHasFinding(findings, /invalid current contract term: four generated control files/, "check-template rejects invalid generated control file wording");
        assertHasFinding(findings, /invalid current contract term: four valid control files/, "check-template rejects invalid valid-control-file wording");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects invalid output template paths in active docs",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "README.md");
        writeFileSync(join(root, "README.md"), "Do not point active docs at _framework/outputs/*.md or outputs/PLAN.md.\n");
        const findings = checkTemplate(root);
        assertHasFinding(findings, /invalid current template path/, "check-template rejects invalid output template paths in active docs");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects unbalanced active Markdown fences",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "README.md");
        writeFileSync(join(root, "README.md"), "```bash\nnode check.js\n");
        const findings = checkTemplate(root);
        assertHasFinding(findings, /README\.md has unbalanced Markdown code fence/, "check-template rejects unbalanced active Markdown fences");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template requires PROFILE output boundaries in instantiate-run-bundle",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "command_playbooks/instantiate-run-bundle.md");
        writeFileSync(join(root, "command_playbooks", "instantiate-run-bundle.md"), `
frontmatter and boundary comments are required.
BEGIN PLAN OUTPUT
END PLAN OUTPUT
BEGIN STATUS OUTPUT
END STATUS OUTPUT
BEGIN QUEUE OUTPUT
END QUEUE OUTPUT
BEGIN TRACE OUTPUT
END TRACE OUTPUT
`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /instantiate-run-bundle must require extracting bounded output content/, "check-template requires PROFILE output boundaries in instantiate-run-bundle");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template requires concrete gate authority pointers in PLAN",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writePlanSkeleton(root, [
          "framework pointers:",
          "specs/GATES.md",
          "specs/gates/",
          "specs/RESEARCH_PROFILES.md",
          "specs/CONSTANTS.md",
          "specs/METHODOLOGY.md",
        ].join("\n"));
        const findings = checkTemplate(root);
        assertHasFinding(findings, /missing gate authority pointer: specs\/gates\/instantiation-complete\.md/, "check-template requires concrete gate authority pointers in PLAN");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects copied long PLAN authority blocks",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writePlanSkeleton(root, [
          "specs/GATES.md",
          "specs/gates/instantiation-complete.md",
          "specs/gates/setup-ready.md",
          "specs/gates/wave0-complete.md",
          "specs/gates/wave1-complete.md",
          "specs/gates/wave2-complete.md",
          "specs/gates/readiness-passed.md",
          "specs/RESEARCH_PROFILES.md",
          "specs/CONSTANTS.md",
          "specs/METHODOLOGY.md",
          "### Profile Cost Control",
          "",
          "Use this scoring anchor for both factors:",
          "",
          "Hard count rules:",
          "- `web_substance=thin` cannot count toward source floors.",
        ].join("\n"));
        const findings = checkTemplate(root);
        assertHasFinding(findings, /must point to framework profile\/cost authority/, "check-template rejects copied Profile Cost Control block");
        assertHasFinding(findings, /must not duplicate factor scoring anchors/, "check-template rejects copied factor scoring anchors");
        assertHasFinding(findings, /must not duplicate the full Webpage Material Diagnostic Gate rule body/, "check-template rejects copied webpage diagnostic body");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template requires Refill Pool ordering rule",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeQueueSkeleton(root, `
## Refill Pool

### Candidate Block

- priority_class: \`P5_new_reference_intake\`
- promotion_trigger: \`ready source intake\`
`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /Refill Pool ordering rule missing marker: refill_pool_ordering_rule/, "check-template requires Refill Pool ordering rule");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template requires priority_class on every Candidate Block",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeQueueSkeleton(root, `
## Refill Pool

- refill_pool_ordering_rule: \`ready/prerequisite satisfied first, then priority_class, then current wave/gate affinity, then restore_priority, then physical order\`
- refill_pool_priority_order: \`P0_preempted_restore -> P1_state_or_gate_repair -> P2_close_open_loop -> P3_current_gate_gap -> P4_progressive_artifact_or_seed_backfill -> P5_new_reference_intake -> P6_topology_triage\`

### Candidate Block

- promotion_trigger: \`ready source intake\`
`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /Candidate Block 1 missing priority_class/, "check-template requires priority_class on every Candidate Block");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template requires Refill Pool priority order line",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeQueueSkeleton(root, `
## Refill Pool

- refill_pool_ordering_rule: \`ready/prerequisite satisfied first, then priority_class, then current wave/gate affinity, then restore_priority, then physical order\`

### Candidate Block

- priority_class: \`P5_new_reference_intake\`
- promotion_trigger: \`ready source intake\`
`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /Refill Pool ordering rule missing marker: refill_pool_priority_order/, "check-template requires Refill Pool priority order line");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects unknown Refill Pool priority_class",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeQueueSkeleton(root, `
## Refill Pool

- refill_pool_ordering_rule: \`ready/prerequisite satisfied first, then priority_class, then current wave/gate affinity, then restore_priority, then physical order\`
- refill_pool_priority_order: \`P0_preempted_restore -> P1_state_or_gate_repair -> P2_close_open_loop -> P3_current_gate_gap -> P4_progressive_artifact_or_seed_backfill -> P5_new_reference_intake -> P6_topology_triage\`

### Candidate Block

- priority_class: \`urgent_now\`
- promotion_trigger: \`ready source intake\`
`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /Candidate Block 1 has unknown priority_class: urgent_now/, "check-template rejects unknown Refill Pool priority_class");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "template required paths include Exa source-intake regression",
    () => {
      assert.equal(REQUIRED_TEMPLATE_PATHS.includes("cli_tools/check_framework/tests/test-exa-source-intake.mjs"), true);
    },
  ],
  [
    "template preserves Wave 1 artifact steering repair command",
    () => {
      const commandPath = "command_playbooks/repair-wave1-artifact-steering.md";
      assert.equal(REQUIRED_TEMPLATE_PATHS.includes(commandPath), true);
      assert.match(templateFile(commandPath), /Repair Wave 1 Artifact Steering/);
      assert.match(templateFile(commandPath), /slot_1_current` or `slot_2_next/);
      assert.match(templateFile("COMMANDS.md"), /repair-wave1-artifact-steering/);
      assert.match(templateFile("README.md"), /repair-wave1-artifact-steering/);
      assert.match(templateFile("command_playbooks/help.md"), /repair-wave1-artifact-steering/);
      assert.match(templateFile("command_playbooks/check.md"), /repair-wave1-artifact-steering/);
      assert.match(templateFile("flows/queue-agentic-flow.md"), /repair-wave1-artifact-steering\.md/);
    },
  ],
  [
    "template preserves Exa as opt-in run-local runner",
    () => {
      const sourceIntake = templateFile("flows/source-intake-flow.md");
      const exa = templateFile("flows/source-intake-profiles/exa-search.md");
      assert.match(sourceIntake, /Default to `native_search`/);
      assert.match(sourceIntake, /Queue work unit records why native search is insufficient/);
      assert.match(sourceIntake, /Exa-specific capability/);
      assert.doesNotMatch(sourceIntake, /Default to `native_search` unless the request carries advanced-search intent/);
      assert.match(exa, /The signals below may justify that Queue work-unit decision, but they do not activate Exa by themselves/);
      assert.match(exa, /Do not select `exa_search` merely because/);
      assert.doesNotMatch(exa, /Select `exa_search` over default native search when[\s\S]*?at least one of these signals/);
      assert.match(exa, /node <RUN_DIR>\/_framework\/flows\/source-intake-profiles\/scripts\/exa-source-intake\.mjs/);
      assert.doesNotMatch(exa, /```text\nnode flows\/source-intake-profiles\/scripts\/exa-source-intake\.mjs/);
      for (const relPath of ["output_templates/RUN_ROOT_AGENTS.md", "output_templates/RUN_ROOT_CLAUDE.md"]) {
        const text = templateFile(relPath);
        assert.match(text, /Only when the selected source-intake `provider_profile` is `exa_search`/);
        assert.match(text, /_framework\/flows\/source-intake-profiles\/scripts\/exa-source-intake\.mjs/);
      }
    },
  ],
  [
    "template preserves Queue authority layering",
    () => {
      const charter = templateFile("specs/CHARTER.md");
      const plan = templateFile("output_templates/PLAN.md");
      const queueFlow = templateFile("flows/queue-agentic-flow.md");
      assert.match(charter, /Named flow policy authorities are correctness authorities only for the rule families that cite them in the Projection Map/);
      assert.doesNotMatch(charter, /Flows and skeletons are creation aids, not independent correctness authorities/);
      assert.match(plan, /specs\/QUEUE_CONTRACT\.md -> Queue Work Unit Contract/);
      assert.match(plan, /flows\/queue-agentic-flow\.md -> Queue Agentic Flow/);
      assert.match(plan, /producer_rule/);
      assert.match(plan, /required_receipts/);
      assert.match(plan, /completion_receipt/);
      assert.doesNotMatch(plan, /output_templates\/QUEUE\.md -> Active Queue/);
      assert.doesNotMatch(plan, /Every active queue task must name at least one source of work:[\s\S]*?done_condition`.*, `writes_to`.*, and `status_sync`/);
      assert.match(queueFlow, /-> write declared files\s*\n-> sync STATUS \/ QUEUE\s*\n-> verify result and completion receipt/);
      assert.doesNotMatch(queueFlow, /-> verify result\s*\n-> write declared files/);
    },
  ],
  [
    "template preserves Boundary Hook Mermaid call map",
    () => {
      const execution = templateFile("flows/execution-flow.md");
      const queueFlow = templateFile("flows/queue-agentic-flow.md");
      const queue = templateFile("output_templates/QUEUE.md");
      const gates = templateFile("specs/GATES.md");
      const plan = templateFile("output_templates/PLAN.md");
      const callMap = section(execution, "Boundary Hook Call Map");
      const internalLoop = section(execution, "Wave Internal Loop Pattern");
      const commandMatrix = section(queueFlow, "Boundary Hook Command Matrix");
      assert.match(callMap, /```mermaid/);
      assert.match(callMap, /Execution Flow/);
      assert.match(callMap, /Queue Agentic Flow/);
      assert.match(callMap, /Queue repair work/);
      assert.match(callMap, /foreground Queue-visible hook work/);
      assert.match(internalLoop, /```mermaid/);
      assert.match(internalLoop, /Queue slot work/);
      assert.match(internalLoop, /source intake \/ fan-in \/ reference promotion/);
      assert.match(internalLoop, /gate audit/);
      assert.match(internalLoop, /same-wave repair\/refill/);
      assert.match(internalLoop, /boundary hook/);
      assert.match(internalLoop, /Wave 0 loop/);
      assert.match(internalLoop, /Wave 1 loop/);
      assert.match(internalLoop, /Wave 2 loop/);
      assert.match(queueFlow, /## Boundary Hook Execution Protocol/);
      assert.match(queueFlow, /## Boundary Hook Catalog/);
      assert.match(queueFlow, /## Boundary Hook Command Matrix/);
      assert.match(queueFlow, /not a detached event handler/);
      assert.match(queueFlow, /must not execute the hook before it reaches `slot_1_current`/);
      assert.match(commandMatrix, /node <RUN_DIR>\/_framework\/cli_tools\/check_framework\.mjs --gate <gate> <RUN_DIR>/);
      assert.match(commandMatrix, /command\/playbook or flow to open/);
      assert.match(commandMatrix, /read-only CLI gates to run/);
      assert.match(commandMatrix, /failure route/);
      assert.match(commandMatrix, /hook_setup_to_wave0_start[\s\S]*check-gate-setup-ready/);
      assert.match(commandMatrix, /hook_wave0_closeout_to_wave1_start[\s\S]*check-gate-wave0-complete/);
      assert.match(commandMatrix, /hook_wave1_topic_fanin_steering[\s\S]*flows\/source-intake-flow\.md/);
      assert.match(commandMatrix, /hook_wave1_closeout_to_wave2_start[\s\S]*check-gate-wave1-complete/);
      assert.match(commandMatrix, /hook_wave1_closeout_to_wave2_start[\s\S]*topic target coverage/);
      assert.match(commandMatrix, /hook_wave2_closeout_to_hitl2[\s\S]*check-gate-wave2-complete/);
      assert.match(commandMatrix, /hook_wave2_closeout_to_hitl2[\s\S]*hitl2_pending_or_recorded_ready/);
      assert.match(commandMatrix, /hook_readiness_closeout_to_final_delivery[\s\S]*command_playbooks\/create-final\.md/);
      assert.match(commandMatrix, /hook_readiness_closeout_to_final_delivery[\s\S]*check-gate-readiness-passed/);
      assert.match(gates, /## Start Boundary Gate Registry/);
      assert.match(gates, /wave0_start[\s\S]*hook_setup_to_wave0_start/);
      assert.match(gates, /wave1_start[\s\S]*hook_wave0_closeout_to_wave1_start/);
      assert.match(gates, /wave2_start[\s\S]*hook_wave1_closeout_to_wave2_start/);
      assert.match(plan, /Start boundary gate specs/);
      assert.match(templateFile("specs/gates/wave1-start.md"), /not a `current_gate` enum value/);
      assert.match(templateFile("specs/gates/wave1-start.md"), /producer_rule=`topic_ref_count_changed`/);
      assert.doesNotMatch(templateFile("specs/QUEUE_CONTRACT.md"), /artifact freshness is current or refresh queued/);
      assert.doesNotMatch(templateFile("flows/queue-agentic-flow.md"), /artifacts are current or queue-deferred/);
      assert.match(templateFile("specs/QUEUE_CONTRACT.md"), /queued artifact refresh is only a repair state before Wave 2 work, not a Wave 2 entry receipt/);
      assert.match(queue, /Boundary Hook Execution Protocol/);
      assert.doesNotMatch(queue, /^##\s+Boundary Hook Catalog\s*$/m);
      assert.equal(existsSync(join("DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12", "flows", "boundary-hooks.md")), false);
      assert.equal(existsSync(join("DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12", "flows", "execution-queue-boundary-hooks.svg")), false);
      for (const hookId of BOUNDARY_HOOK_IDS) {
        assert.match(callMap, new RegExp(hookId));
        assert.match(queueFlow, new RegExp(hookId));
      }
    },
  ],
  [
    "check-template rejects Boundary Hook authority drift",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "flows/execution-flow.md");
        writeFileSync(join(root, "flows", "execution-flow.md"), `
## Boundary Hook Call Map

\`\`\`mermaid
flowchart TD
  EF["Execution Flow"] --> H0["hook_setup_to_wave0_start"]
  H0 --> QF["Queue Agentic Flow"]
\`\`\`
`);
        writeMinimalTemplatePath(root, "flows/queue-agentic-flow.md");
        writeFileSync(join(root, "flows", "queue-agentic-flow.md"), `
## Fixed Loop

No boundary hook execution protocol here.
`);
        writeMinimalTemplatePath(root, "flows/boundary-hooks.md");
        writeMinimalTemplatePath(root, "flows/execution-queue-boundary-hooks.svg");
        writeQueueSkeleton(root, `
## Active Queue

- queue_flow_authority: \`<RUN_DIR>/_framework/flows/queue-agentic-flow.md\`

## Boundary Hook Catalog

${BOUNDARY_HOOK_IDS.map((hookId) => `- ${hookId}`).join("\n")}
`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /execution-flow Boundary Hook Call Map missing marker: Queue repair work/, "check-template rejects thin Boundary Hook Mermaid");
        assertHasFinding(findings, /execution-flow Boundary Hook Call Map missing hook id: hook_wave0_closeout_to_wave1_start/, "check-template rejects missing execution hook id");
        assertHasFinding(findings, /execution-flow must contain Wave Internal Loop Pattern/, "check-template rejects missing Wave Internal Loop Pattern");
        assertHasFinding(findings, /queue-agentic-flow must contain Boundary Hook Execution Protocol/, "check-template rejects missing hook execution protocol");
        assertHasFinding(findings, /queue-agentic-flow must contain Boundary Hook Command Matrix/, "check-template rejects missing hook command matrix");
        assertHasFinding(findings, /flows\/boundary-hooks\.md must not be added/, "check-template rejects third Boundary Hook flow");
        assertHasFinding(findings, /not SVG source files: flows\/execution-queue-boundary-hooks\.svg/, "check-template rejects Boundary Hook SVG source");
        assertHasFinding(findings, /output_templates\/QUEUE\.md must not copy the full Boundary Hook catalog/, "check-template rejects Queue as hook SSOT");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects Boundary Hook command row missing CLI gate",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "flows/execution-flow.md");
        writeFileSync(join(root, "flows", "execution-flow.md"), templateFile("flows/execution-flow.md"));
        writeMinimalTemplatePath(root, "flows/queue-agentic-flow.md");
        writeFileSync(
          join(root, "flows", "queue-agentic-flow.md"),
          templateFile("flows/queue-agentic-flow.md").replace("`check-gate-wave1-complete`; ", ""),
        );
        const findings = checkTemplate(root);
        assertHasFinding(findings, /row hook_wave1_closeout_to_wave2_start missing command\/check marker: check-gate-wave1-complete/, "check-template rejects hook row missing its CLI gate");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-template rejects Queue authority and search boundary regressions",
    () => {
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "specs/CHARTER.md");
        writeFileSync(join(root, "specs", "CHARTER.md"), "Flows and skeletons are creation aids, not independent correctness authorities.\nflows/queue-agentic-flow.md\nplan defines configured floors and targets only\n");
        const invalidCurrentTruth = ["current", "truth"].join(" ");
        const invalidSourceTruth = ["source", "of", "truth"].join(" ");
        const invalidSourceExecutableWork = ["source", "of", "executable", "work"].join(" ");
        writePlanSkeleton(root, [
          "Every active queue task must name at least one source of work: `source_gap`, `status_gap`, `gate_gap`, `plan_target`, or `trigger`. It must also name concrete `done_condition`, `writes_to`, and `status_sync`.",
          "- queue_lineage_authority: `<RUN_DIR>/_framework/specs/CHARTER.md -> Queue Task Lineage and <RUN_DIR>/_framework/output_templates/QUEUE.md -> Active Queue`",
          "`PLAN_PATH` defines topic identity, configured floors, gate targets, source-intake preference projection, and local authority pointers.",
          "- wave0_floor_authority: `Research Profile.active_wave0_formula plus configured floors in Instance Config`",
        ].join("\n"));
        writeMinimalTemplatePath(root, "output_templates/PROFILE.md");
        writeFileSync(join(root, "output_templates", "PROFILE.md"), `- routine_navigation: \`use STATUS_PATH for ${invalidCurrentTruth}\`\n`);
        writeQueueSkeleton(root, `- projection_authority: \`QUEUE_PATH is ${invalidSourceTruth}; native todo/task/plan is a projection\`\n`);
        writeMinimalTemplatePath(root, "output_templates/RUN_ROOT_AGENTS.md");
        writeFileSync(join(root, "output_templates", "RUN_ROOT_AGENTS.md"), `\`QUEUE_PATH -> Active Queue\` is the ${invalidSourceExecutableWork}.\n`);
        writeMinimalTemplatePath(root, "output_templates/RUN_ROOT_CLAUDE.md");
        writeFileSync(join(root, "output_templates", "RUN_ROOT_CLAUDE.md"), `\`QUEUE_PATH -> Active Queue\` is the ${invalidSourceExecutableWork}.\n`);
        writeMinimalTemplatePath(root, "command_playbooks/help.md");
        writeFileSync(join(root, "command_playbooks", "help.md"), "This mutates generated `PLAN`, `STATUS`, `QUEUE`, and `TRACE`; it does not rerun the template creator.\n");
        writeMinimalTemplatePath(root, "flows/instantiation-flow.md");
        writeFileSync(join(root, "flows", "instantiation-flow.md"), "`QUEUE_PATH` refuses `wave0_complete` and Wave 1 entry.\n`QUEUE_PATH` can mark `wave1_complete` or start Wave 2.\n");
        writeMinimalTemplatePath(root, "flows/source-intake-flow.md");
        writeFileSync(join(root, "flows", "source-intake-flow.md"), "Default to `native_search` unless the request carries advanced-search intent or an explicit provider selection.\n");
        writeMinimalTemplatePath(root, "flows/source-intake-profiles/exa-search.md");
        writeFileSync(join(root, "flows", "source-intake-profiles", "exa-search.md"), "Select `exa_search` over default native search when the user's request includes at least one of these signals.\n");
        writeMinimalTemplatePath(root, "flows/queue-agentic-flow.md");
        writeFileSync(join(root, "flows", "queue-agentic-flow.md"), `Use \`STATUS_PATH\` for ${invalidCurrentTruth}.\n-> execute declared action\n-> verify result\n-> write declared files\n`);
        const findings = checkTemplate(root);
        assertHasFinding(findings, /CHARTER must distinguish named flow policy authorities/, "check-template rejects non-current flow authority wording");
        assertHasFinding(findings, /CHARTER must treat configured floors as PROFILE-backed PLAN projections/, "check-template rejects plan-owned configured floors");
        assertHasFinding(findings, /PLAN must not project the out-of-contract thin Queue task contract/, "check-template rejects invalid PLAN Queue contract");
        assertHasFinding(findings, /PLAN must not cite output_templates\/QUEUE\.md as Queue authority/, "check-template rejects QUEUE skeleton as authority");
        assertHasFinding(findings, /PLAN must project PROFILE-backed configured floors/, "check-template rejects PLAN as profile configuration authority");
        assertHasFinding(findings, /PROFILE routine navigation must use current run-state wording/, "check-template rejects PROFILE current-truth wording");
        assertHasFinding(findings, /QUEUE projection_authority must say QUEUE_PATH owns native projection state/, "check-template rejects source-of-truth projection wording");
        assertHasFinding(findings, /RUN_ROOT_AGENTS\.md must describe QUEUE_PATH as the executable action ledger/, "check-template rejects AGENTS source-of-executable-work wording");
        assertHasFinding(findings, /RUN_ROOT_CLAUDE\.md must describe QUEUE_PATH as the executable action ledger/, "check-template rejects CLAUDE source-of-executable-work wording");
        assertHasFinding(findings, /help\.md must route profile parameter changes through PROFILE first/, "check-template rejects direct PLAN profile mutation wording");
        assertHasFinding(findings, /instantiation-flow must not describe QUEUE_PATH as gate-state authority/, "check-template rejects Queue as gate authority wording");
        assertHasFinding(findings, /source-intake-flow must not auto-escalate advanced-search intent to Exa/, "check-template rejects broad Exa activation");
        assertHasFinding(findings, /exa-search profile must treat advanced-search signals as justification candidates/, "check-template rejects Exa signal activation wording");
        assertHasFinding(findings, /queue-agentic-flow reload guidance must use current run-state wording/, "check-template rejects queue flow current-truth wording");
        assertHasFinding(findings, /queue-agentic-flow must write declared files before verifying completion receipts/, "check-template rejects non-current queue loop order");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "template preserves Queue Work Unit Contract projection",
    () => {
      const queue = templateFile("output_templates/QUEUE.md");
      for (const marker of [
        "Queue contract authority",
        "queue_runtime_role",
        "work_id",
        "producer_rule",
        "why_this_matters",
        "impact_scope",
        "required_receipts",
        "verification",
        "completion_receipt",
        "failure_route",
        "artifact_steering_current",
        "direct_reference_exception",
        "active_window_contract_complete",
        "topology_delta_disposed",
        "hitl2_pending_or_recorded_ready",
        "default search route is native_search",
      ]) {
        assert.match(queue, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
      const queueContract = templateFile("specs/QUEUE_CONTRACT.md");
      for (const marker of [
        "direct_reference_exception",
        "active_window_contract_complete",
        "topology_delta_disposed",
        "hitl2_pending_or_recorded_ready",
        "whole-receipt alternatives",
        "A or B",
      ]) {
        assert.match(queueContract, new RegExp(marker));
      }
      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeQueueSkeleton(root, queue
          .replace(/(### slot_1_current[\s\S]*?)- producer_rule: `initial_window_render`\n/, "$1")
          .replace("direct_reference_exception", ""));
        const findings = checkTemplate(root);
        assertHasFinding(findings, /slot_1_current missing Queue Work Unit Contract field: producer_rule/, "check-template rejects missing active Queue producer_rule");
        assertHasFinding(findings, /missing Queue contract marker: direct_reference_exception/, "check-template rejects missing direct reference receipt marker");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "template preserves Queue receipt phase documentation",
    () => {
      assert.match(templateFile("COMMANDS.md"), /preflight `required_receipts`/);
      assert.match(templateFile("COMMANDS.md"), /closeout `completion_receipt`/);
      assert.match(templateFile("command_playbooks/check-queue-receipts.md"), /receipt_check_phase=preflight/);
      assert.match(templateFile("command_playbooks/check-queue-receipts.md"), /receipt_check_phase=closeout/);
      assert.match(templateFile("command_playbooks/check-queue-receipts.md"), /Whole-receipt alternatives/);
      assert.match(templateFile("command_playbooks/check-queue-receipts.md"), /_or_/);
      assert.match(templateFile("command_playbooks/check-runtime.md"), /required_receipts \/ completion_receipt/);
      assert.match(templateFile("command_playbooks/check.md"), /receipt_check_phase/);

      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "COMMANDS.md");
        writeFileSync(join(root, "COMMANDS.md"), "check-queue-receipts verifies work-unit fields and required receipts only.\n");
        const findings = checkTemplate(root);
        assertHasFinding(findings, /COMMANDS\.md must document Queue receipt preflight\/closeout marker: preflight `required_receipts`/, "check-template rejects stale COMMANDS receipt phase docs");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "template preserves direct-reference exception documentation",
    () => {
      assert.match(templateFile("flows/source-intake-flow.md"), /already-known local or user-provided/);
      assert.match(templateFile("flows/source-intake-flow.md"), /`no retrieval`, `no search`, and `no fetch`/);
      assert.match(templateFile("flows/reference-artifact-backfill.md"), /Direct-reference exception/);
      assert.match(templateFile("flows/reference-artifact-backfill.md"), /direct_reference_exception/);
      assert.match(templateFile("specs/WORK_DIRECTORY_LAYOUT.md"), /all three negatives: `no retrieval`, `no search`, and `no fetch`/);
      assert.match(templateFile("specs/METHODOLOGY.md"), /already-known local or user-provided/);

      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "flows/reference-artifact-backfill.md");
        writeFileSync(
          join(root, "flows", "reference-artifact-backfill.md"),
          "Source material should pass through the source intake adapter before reference creation.\n",
        );
        const findings = checkTemplate(root);
        assertHasFinding(findings, /flows\/reference-artifact-backfill\.md must preserve direct-reference exception marker: Direct-reference exception/, "check-template rejects missing direct-reference exception docs");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "template preserves instantiation scaffold boundary documentation",
    () => {
      assert.match(templateFile("command_playbooks/instantiate-run-bundle.md"), /Do not create topic README files, reference README files, `REFERENCE_DIR\/_INDEX\.md`/);
      assert.match(templateFile("command_playbooks/instantiate-from-original-topic-md.md"), /Create only the artifact scaffold at instantiation time/);
      assert.match(templateFile("command_playbooks/instantiate-from-original-topic-md.md"), /Do not create topic README files, reference README files, `REFERENCE_DIR\/_INDEX\.md`/);
      assert.match(templateFile("flows/instantiation-flow.md"), /Do not create topic README files, reference README files, `_INDEX\.md`/);
      assert.match(templateFile("specs/WORK_DIRECTORY_LAYOUT.md"), /Instantiation must not create execution topic README files, reference README files, `_INDEX\.md`/);

      const root = mkdtempSync(join(tmpdir(), "v12-template-regression-"));
      try {
        writeMinimalTemplatePath(root, "command_playbooks/instantiate-run-bundle.md");
        writeFileSync(
          join(root, "command_playbooks", "instantiate-run-bundle.md"),
          "Do not create references, `_INDEX.md`, produced artifacts, final outputs, Wave 0 evidence, or execution progress during run-bundle instantiation.\n",
        );
        const findings = checkTemplate(root);
        assertHasFinding(findings, /command_playbooks\/instantiate-run-bundle\.md must preserve instantiation scaffold boundary marker: topic README files/, "check-template rejects stale instantiation scaffold boundary docs");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  ],
  [
    "template required paths include canonical work directory layout spec",
    () => {
      assert.equal(REQUIRED_TEMPLATE_PATHS.includes("specs/WORK_DIRECTORY_LAYOUT.md"), true);
    },
  ],
  [
    "template preserves canonical work directory layout authority",
    () => {
      assert.match(templateFile("specs/CHARTER.md"), /specs\/WORK_DIRECTORY_LAYOUT\.md/);
      assert.match(templateFile("specs/WORK_DIRECTORY_LAYOUT.md"), /canonical authority/i);
      assert.match(templateFile("specs/WORK_DIRECTORY_LAYOUT.md"), /RUN_DIR\/seed_topics\/_artifacts/);
      assert.match(templateFile("specs/WORK_DIRECTORY_LAYOUT.md"), /wave1_topics\/<topic-id>-<topic-slug>\/evidence-summary\.md/);
      assert.match(templateFile("specs/WORK_DIRECTORY_LAYOUT.md"), /topic_ref_count_changed/);
      assert.equal(REQUIRED_TEMPLATE_PATHS.includes("command_playbooks/explain-work-directory-layout.md"), false);
      assert.equal(REQUIRED_TEMPLATE_PATHS.includes("command_playbooks/work-directory-layout.md"), false);
      assert.equal(existsSync(join("DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12", "command_playbooks", "explain-work-directory-layout.md")), false);
      assert.equal(existsSync(join("DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12", "command_playbooks", "work-directory-layout.md")), false);
      assert.doesNotMatch(templateFile("COMMANDS.md"), /explain-work-directory-layout/);
      assert.match(templateFile("COMMANDS.md"), /specs\/WORK_DIRECTORY_LAYOUT\.md/);
      assert.match(templateFile("COMMANDS.md"), /check-instantiation.*check-surfaces.*check-runtime/s);
      assert.match(templateFile("README.md"), /specs\/WORK_DIRECTORY_LAYOUT\.md/);
    },
  ],
  [
    "README separates spec authority from render skeletons",
    () => {
      const readme = templateFile("README.md");
      const authority = section(readme, "Spec Authority Map");
      const skeletons = section(readme, "Render Skeleton Map");
      assert.match(authority, /specs\/CHARTER\.md/);
      assert.match(authority, /specs\/WORK_DIRECTORY_LAYOUT\.md/);
      assert.doesNotMatch(authority, /output_templates\//);
      assert.match(skeletons, /output_templates\/PROFILE\.md/);
      assert.match(skeletons, /turn the spec set into generated root files/);
    },
  ],
  [
    "template preserves Chinese-first user-facing language policy",
    () => {
      assert.match(templateFile("AGENT-GUIDE.md"), /User-Facing Language/);
      assert.match(templateFile("AGENT-GUIDE.md"), /Chinese-first/);
      assert.match(templateFile("output_templates/RUN_ROOT_AGENTS.md"), /Chinese-first wording/);
      assert.match(templateFile("output_templates/RUN_ROOT_CLAUDE.md"), /Chinese-first wording/);
      assert.match(templateFile("command_playbooks/instantiate-from-original-topic-md.md"), /已完成实例化/);
    },
  ],
  [
    "template preserves run-local framework read-only boundary",
    () => {
      const files = [
        "output_templates/RUN_ROOT_AGENTS.md",
        "output_templates/RUN_ROOT_CLAUDE.md",
        "output_templates/PROFILE.md",
        "output_templates/PLAN.md",
        "output_templates/STATUS.md",
        "output_templates/QUEUE.md",
        "output_templates/TRACE.md",
      ];
      for (const relPath of files) {
        const text = templateFile(relPath);
        assert.match(text, /pre-work .*framework snapshot is read-only|read-only pre-work policy snapshot/, `${relPath} must preserve framework read-only wording`);
        assert.match(text, /repair-framework-snapshot/, `${relPath} must preserve explicit snapshot repair route`);
        assert.match(text, /<RUN_DIR>\/_framework\/command_playbooks\/repair-framework-snapshot\.md/, `${relPath} must point repair through run-local _framework`);
        assert.match(text, /do not edit|never hand-edit/, `${relPath} must forbid direct _framework edits`);
      }
    },
  ],
  [
    "instantiate original-topic command preserves framework completeness tail check",
    () => {
      const command = templateFile("command_playbooks/instantiate-from-original-topic-md.md");
      assert.match(command, /Framework Completeness Tail Check/);
      assert.match(command, /_framework\/command_playbooks\/check-instantiation\.md/);
      assert.match(command, /repair-framework-snapshot\.md/);
      assert.match(command, /--gate check-template/);
      assert.match(command, /--gate check-instantiation/);
      assert.match(command, /框架完整性尾检（Framework Completeness Tail Check）/);
    },
  ],
  [
    "instantiate original-topic command preserves clarity rewrite UX",
    () => {
      const command = templateFile("command_playbooks/instantiate-from-original-topic-md.md");
      assert.match(command, /Original Topic Clarity Check/);
      assert.match(command, /original_topic\/<english-slug>\.normalized\.md/);
      assert.match(command, /请确认：这个规整版本是否就是你想研究的问题/);
      assert.match(command, /题面已经足够具体|已经足够具体/);
      assert.match(command, /not a form/);
      assert.match(command, /do not create confirmed seed topics before confirmation/i);
    },
  ],
  [
    "template preserves seed-topic original context guardrails",
    () => {
      assert.match(templateFile("command_playbooks/decompose-seed-topics.md"), /Original Context Constraint Rule/);
      assert.match(templateFile("command_playbooks/decompose-seed-topics.md"), /single `original_topic\/\*\.normalized\.md` file as the canonical upstream topic surface/);
      assert.match(templateFile("command_playbooks/instantiate-from-original-topic-md.md"), /原始语境约束（Original Context Constraints）/);
      assert.match(templateFile("specs/METHODOLOGY.md"), /search guardrails/);
      assert.match(templateFile("output_templates/PLAN.md"), /stop generic search/);
      assert.match(templateFile("command_playbooks/check-seed-intake.md"), /prevent generic external search/);
      assert.match(templateFile("command_playbooks/check-surfaces.md"), /prevent generic external search/);
    },
  ],
  [
    "template preserves seed topic shape normalization route",
    () => {
      const repair = templateFile("command_playbooks/repair-seed-topic-shape.md");
      const router = templateFile("command_playbooks/check.md");
      const commands = templateFile("COMMANDS.md");
      assert.ok(REQUIRED_TEMPLATE_PATHS.includes("command_playbooks/repair-seed-topic-shape.md"));
      assert.ok(REQUIRED_TEMPLATE_PATHS.includes("cli_tools/check_framework/checks/check-seed-topic-shape.mjs"));
      assert.ok(REQUIRED_TEMPLATE_PATHS.includes("cli_tools/check_framework/checks/seed-topic-shape.mjs"));
      assert.match(repair, /write-capable/);
      assert.match(repair, /Do not invent research intent/);
      assert.match(repair, /Bare field names, `TBD`, `todo`, `pending clarification`, `placeholder`, `\{\.\.\.\}`/);
      assert.match(repair, /Mirror the same meaningful context into `PLAN_PATH -> Seed Topic Intake Matrix`/);
      assert.match(repair, /Queue-backed semantic gaps are setup repair state only/);
      assert.match(repair, /check-seed-topic-shape/);
      assert.match(router, /check-seed-topic-shape/);
      assert.match(router, /repair-seed-topic-shape/);
      assert.match(commands, /repair-seed-topic-shape/);
      assert.match(templateFile("specs/gates/setup-ready.md"), /refill\/backfill shape enforced by `check-seed-topic-shape`/);
    },
  ],
  [
    "template keeps original-topic and gap_queue_backed contracts aligned",
    () => {
      const seed = templateFile("command_playbooks/check-seed-intake.md");
      const surfaces = templateFile("command_playbooks/check-surfaces.md");
      const plan = templateFile("output_templates/PLAN.md");
      const setup = templateFile("specs/gates/setup-ready.md");
      const wave0 = templateFile("specs/gates/wave0-complete.md");
      const wave1 = templateFile("specs/gates/wave1-complete.md");

      assert.match(seed, /both the seed file and `PLAN_PATH -> Seed Topic Intake Matrix` must expose/);
      assert.match(seed, /meaningful original context fields/);
      assert.match(seed, /If the run has advanced past setup and still carries `gap_queue_backed`, return `FAIL_FIX`/);
      assert.match(surfaces, /seed file and the matching intake matrix row both expose/);
      assert.match(surfaces, /current_gate=setup_ready/);
      assert.match(surfaces, /lingering `seed_topic_intake_ready=gap_queue_backed`/);
      assert.match(plan, /PLAN-only or seed-only context markers are not search-ready/);
      assert.doesNotMatch(seed, /seed file or in `PLAN_PATH -> Seed Topic Intake Matrix`/);
      assert.doesNotMatch(surfaces, /seed file or matching intake matrix row/);

      assert.match(setup, /all five active queue slots must avoid source intake/);
      assert.match(setup, /Both surfaces must preserve meaningful `source_anchor`/);
      assert.match(setup, /setup-only repair state/);
      assert.match(setup, /default search provider remains `native_search`/);
      assert.match(wave0, /`seed_topic_intake_ready` is not `yes`/);
      assert.match(wave1, /per-topic `intake_status=gap \/ assumption`/);
      assert.match(wave1, /unresolved run-level `seed_topic_intake_ready=gap_queue_backed`/);
    },
  ],
];

runIfMain(import.meta.url, tests);
