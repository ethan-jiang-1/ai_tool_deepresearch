import { readFileSync, unlinkSync } from "node:fs";
import {
  assertHasFinding,
  assertNoFindings,
  activeQueueHeader,
  closedQueue,
  join,
  mkdirSync,
  mkdtempSync,
  rmSync,
  runIfMain,
  sequentialQueue,
  sourceIntakeQueue,
  tmpdir,
  writeFileSync,
} from "./test-runtime-harness.mjs";
import { checkInstantiation } from "../checks/check-instantiation.mjs";
import { checkSeedIntake } from "../checks/check-seed-intake.mjs";
import { checkSeedTopicShape } from "../checks/check-seed-topic-shape.mjs";
import { checkSurfaces } from "../checks/check-surfaces.mjs";
import { checkGateInstantiationComplete } from "../checks/gates/check_gate_instantiation_complete.mjs";
import { checkGateSetupReady } from "../checks/gates/check_gate_setup_ready.mjs";
import { runtimeGateFindings } from "../checks/gates/index.mjs";
import {
  ARTIFACT_SCAFFOLD_README,
  INST_STATUS,
  SETUP_READY,
  WAVE0_INVENTORY_ROW,
  WAVE0_PASS_AUDIT,
  instantiationStatus,
  instantiationPlan,
  planWithFloors,
  statusHeader,
  withRunFiles,
  writeInstantiationRun,
} from "./test-runtime-regression-gates-instantiation-fixtures.mjs";

function setupStatus({ seedReady = "yes", pendingCandidates = "none", includeTopic = false, runRoot = "", gate = "setup_ready", wave = "Wave 0", nextGate = "wave0_complete" } = {}) {
  const setup = SETUP_READY.replace("seed_topic_intake_ready: `yes`", `seed_topic_intake_ready: \`${seedReady}\``);
  const topicBlock = includeTopic ? `
### Topic t1/demo

- topic_id: \`t1\`
- topic_slug: \`demo\`
- evidence_summary: \`not_started\`
- evidence_summary_path: \`${join(runRoot, "seed_topics", "_artifacts", "wave1_topics", "t1-demo", "evidence-summary.md")}\`
- question_list: \`not_started\`
- question_list_path: \`${join(runRoot, "seed_topics", "_artifacts", "wave1_topics", "t1-demo", "question-list.md")}\`
- accepted_topic_ref_count: \`0\`
` : "";
  const auditRows = includeTopic ? `
## Wave 1 Source Floor Audit

| topic | overall_result |
| --- | --- |
| t1/demo | blocked |

## Wave 2 Synthesis Gate Audit

| topic | overall_result |
| --- | --- |
| t1/demo | blocked |
` : "";
  return `${statusHeader({ gate, wave, nextGate })}
${setup}

## Topology Delta

- pending_topic_candidates: \`${pendingCandidates}\`

${topicBlock}
${auditRows}`;
}

function currentTemplateVersion() {
  const text = readFileSync(new URL("../../../specs/CONSTANTS.md", import.meta.url), "utf8");
  return text.match(/^- current_version: `([^`]+)`$/m)?.[1] ?? "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NORMALIZED_TOPIC_FILENAME = "demo-company.normalized.md";

function originalContextText({ normalizedAnchor = true } = {}) {
  const anchor = normalizedAnchor ? `original_topic/${NORMALIZED_TOPIC_FILENAME} plus original_topic/source.md#demo` : "original_topic/source.md#demo";
  return `source_anchor=${anchor}; in_scope=Demo claim for target users; out_of_scope=generic adjacent claims; search_guardrails=require Demo entity and forbid broadening; evidence_route=official and academic source route`;
}

function hollowOriginalContextText() {
  return "source_anchor=TBD; in_scope=pending clarification; out_of_scope=todo; search_guardrails=placeholder; evidence_route={route}";
}

function setupPlan(runRoot, { originalTopic = false, markers = true, gap = false, normalizedAnchor = true, hollowPlanContext = false } = {}) {
  const originalContext = hollowPlanContext ? hollowOriginalContextText() : originalContextText({ normalizedAnchor });
  const boundary = markers ? originalContext : "Concrete scope for the demo topic";
  const anchors = markers ? originalContext : "Official and academic sources";
  const base = instantiationPlan(runRoot, {
    original_topic_dir: originalTopic ? join(runRoot, "original_topic") : "not_applicable",
  });
  const topicSections = `
## Topic Registry

| id | slug | title | seed_files | current_hypothesis | why_it_matters | must_answer |
| --- | --- | --- | --- | --- | --- | --- |
| t1 | demo | Demo Topic | seed_topics/t1-demo.md | Demo gap | Demo matters | Demo must answer |

## Seed Topic Intake Matrix

| topic | must_answer | why_now | boundary | evidence_anchors | why_it_matters | intake_status | intake_gap | queue_consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | Demo must answer | 2026 trigger | ${boundary} | ${anchors} | Demo matters to final answer | ${gap ? "gap" : "ready"} | ${gap ? "missing original context guardrails" : "none"} | ${gap ? "clarify t1/demo original_topic context in slot_1_current" : "not_applicable"} |
`;
  return base.replace(/## Topic Registry[\s\S]*?(?=\n## Output Contract)/, topicSections);
}

function seedFile({
  markers = true,
  normalizedAnchor = true,
  missingHeading = false,
  missingUpper = false,
  proseOnly = false,
  fakeHeadingMention = false,
  curlyPlaceholder = false,
  nonMeaningfulUpper = false,
  fencedUpperOnly = false,
  hollowOriginalContext = false,
} = {}) {
  if (proseOnly) {
    return `# Demo Topic

This is a hand-written demo topic paragraph. It talks about Demo Company and some possible evidence, but it does not expose the canonical seed topic bullets or refill headings that later backfill expects.
`;
  }
  if (fencedUpperOnly) {
    return `# Demo Topic

\`\`\`markdown
- slug: \`demo\`
- must_answer: \`Demo must answer\`
- why_now: \`2026 trigger\`
- boundary: \`Concrete demo boundary\`
- evidence_anchors: \`Official and academic sources\`
- why_it_matters: \`Demo matters to final answer\`
\`\`\`

## 历史摘要（保留，不修改）

None yet.

## 本轮新增证据

None yet.

## 本轮新增机制理解

None yet.

## 本轮新增趋势与难点

None yet.

## 当前判断（本轮综合后）

Not started.

## 待验证问题

- Demo question.
`;
  }
  const sourceAnchor = normalizedAnchor ? `original_topic/${NORMALIZED_TOPIC_FILENAME} plus original_topic/source.md#demo` : "original_topic/source.md#demo";
  const originalContext = hollowOriginalContext ? `
## 原始语境约束（Original Context Constraints）

- source_anchor: \`TBD\`
- in_scope: \`pending clarification\`
- out_of_scope: \`todo\`
- search_guardrails: \`placeholder\`
- evidence_route: \`{route}\`
` : markers ? `
## 原始语境约束（Original Context Constraints）

- source_anchor: \`${sourceAnchor}\`
- in_scope: \`Demo claim for target users\`
- out_of_scope: \`generic adjacent claims\`
- search_guardrails: \`require Demo entity and forbid broadening\`
- evidence_route: \`official and academic source route\`
` : "";
  const upper = missingUpper ? `
- slug: \`demo\`
- must_answer: \`Demo must answer\`
` : nonMeaningfulUpper ? `
- slug: \`demo\`
- must_answer: \`Demo must answer\`
- why_now: \`TBD\`
- boundary: \`pending clarification\`
- evidence_anchors: \`Official and academic sources\`
- why_it_matters: \`Demo matters to final answer\`
` : curlyPlaceholder ? `
- slug: \`demo\`
- must_answer: \`Demo must answer\`
- why_now: \`2026 trigger\`
- boundary: \`Concrete demo boundary\`
- evidence_anchors: \`{source families}\`
- why_it_matters: \`Demo matters to final answer\`
` : `
- slug: \`demo\`
- must_answer: \`Demo must answer\`
- why_now: \`2026 trigger\`
- boundary: \`Concrete demo boundary\`
- evidence_anchors: \`Official and academic sources\`
- why_it_matters: \`Demo matters to final answer\`
`;
  const trendHeading = missingHeading ? (fakeHeadingMention ? `
This prose mentions 本轮新增趋势与难点 but does not expose it as a Markdown heading.
` : "") : `
## 本轮新增趋势与难点

None yet.
`;
  return `# Demo Topic

${upper}

${originalContext}

## 历史摘要（保留，不修改）

None yet.

## 本轮新增证据

None yet.

## 本轮新增机制理解

None yet.

${trendHeading}

## 当前判断（本轮综合后）

Not started.

## 待验证问题

- Demo question.
`;
}

function normalizedTopicBody({ placeholder = false, thin = false, metadataField = false, includeTitle = true, includeSource = true } = {}) {
  const body = placeholder
    ? "{normalized topic} should describe the selected entity, excluded alternatives, final question, and search guardrails."
    : metadataField
      ? "confirmation_state: confirmed\n\nThe normalized topic is the Demo Company benchmark claim for target users in the 2026 local benchmark context. The research must decide whether the claim is supported, limited, or contradicted, while excluding generic adjacent benchmark families and unrelated demo-named entities. Seed topics should preserve the selected object, final must-answer, out-of-scope alternatives, and the official or academic evidence route."
    : thin
      ? "Demo claim."
      : "The normalized topic is the Demo Company benchmark claim for target users in the 2026 local benchmark context. The research must decide whether the claim is supported, limited, or contradicted, while excluding generic adjacent benchmark families and unrelated demo-named entities. Seed topics should preserve the selected object, final must-answer, out-of-scope alternatives, and the official or academic evidence route.";
  return `${includeTitle ? "# Normalized Original Topic\n\n" : "# Draft Normalization\n\n"}${includeSource ? "Source: `original_topic/source.md`\n\n" : ""}
${body}
`;
}

function writeSetupNavigation(runRoot) {
  mkdirSync(join(runRoot, "seed_topics", "_reference"), { recursive: true });
  writeFileSync(join(runRoot, "seed_topics", "README.md"), "# Seed Topics\n");
  writeFileSync(join(runRoot, "seed_topics", "_reference", "README.md"), "# References\n");
  writeFileSync(join(runRoot, "seed_topics", "_reference", "_INDEX.md"), "# Reference Index\n");
}

function writeSetupSeed(runRoot, {
  markers = true,
  normalizedAnchor = true,
  missingHeading = false,
  missingUpper = false,
  proseOnly = false,
  fakeHeadingMention = false,
  curlyPlaceholder = false,
  nonMeaningfulUpper = false,
  fencedUpperOnly = false,
  hollowOriginalContext = false,
} = {}) {
  writeFileSync(join(runRoot, "seed_topics", "t1-demo.md"), seedFile({
    markers,
    normalizedAnchor,
    missingHeading,
    missingUpper,
    proseOnly,
    fakeHeadingMention,
    curlyPlaceholder,
    nonMeaningfulUpper,
    fencedUpperOnly,
    hollowOriginalContext,
  }));
}

function setupRepairQueue() {
  return `${activeQueueHeader()}

### slot_1_current

- action: \`clarify seed topic intake gap for pending topic demo-candidate and t1/demo original_topic context\`
- status_gap: \`seed_topic_intake_ready=gap_queue_backed requires concrete intake repair before source intake\`
- done_condition: \`pending topic or t1/demo context is clarified and PLAN/STATUS/QUEUE are synced\`
- writes_to: \`case.plan.md; case.status.md; case.queue.md; seed_topics/t1-demo.md\`
- status_sync: \`seed topic intake gap and queue consequence updated\`

### slot_2_next

- action: \`decompose pending topic demo-candidate into confirmed seed topics\`
- trigger: \`STATUS Topology Delta pending_topic_candidates includes demo-candidate\`
- done_condition: \`Topic Registry and Seed Topic Intake Matrix are updated or blocker recorded\`
- writes_to: \`case.plan.md; case.status.md; case.queue.md\`
- status_sync: \`pending_topic_candidates and seed_topic_intake_ready updated\`

### slot_3_pending

- action: \`repair seed topic intake matrix for t1/demo\`
- status_gap: \`original_topic context guardrails are incomplete\`
- done_condition: \`boundary and evidence_anchors preserve source_anchor, in_scope, out_of_scope, search_guardrails, and evidence_route\`
- writes_to: \`case.plan.md; seed_topics/t1-demo.md; case.status.md; case.queue.md\`
- status_sync: \`topic intake repair recorded\`

### slot_4_pending

- action: \`verify setup surfaces after seed intake repair\`
- gate_gap: \`setup_ready local surfaces need recheck\`
- done_condition: \`check-surfaces and check-seed-intake pass or blocker is recorded\`
- writes_to: \`case.status.md; case.queue.md\`
- status_sync: \`setup_ready_status and queue pointer updated\`

### slot_5_tail

- action: \`refill setup repair queue if intake remains incomplete\`
- gate_gap: \`setup_ready cannot advance to source intake with hidden seed gaps\`
- done_condition: \`next setup repair task is queued or blocker recorded\`
- writes_to: \`case.status.md; case.queue.md\`
- status_sync: \`queue_health and next repair target updated\`

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`;
}

function writeReadySetupRun(runRoot, {
  plan = setupPlan(runRoot),
  status = setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
  queue = sequentialQueue(),
  seedMarkers = true,
  normalizedAnchor = true,
  seedShape = {},
  originalTopic = false,
  normalizedTopic = normalizedTopicBody(),
  normalizedFilename = NORMALIZED_TOPIC_FILENAME,
} = {}) {
  if (originalTopic) {
    mkdirSync(join(runRoot, "original_topic"), { recursive: true });
    writeFileSync(join(runRoot, "original_topic", "source.md"), "# Source\n");
    if (normalizedTopic !== null) {
      writeFileSync(join(runRoot, "original_topic", normalizedFilename), normalizedTopic);
    }
  }
  writeInstantiationRun(runRoot, { plan, status, queue });
  writeSetupNavigation(runRoot);
  writeSetupSeed(runRoot, { markers: seedMarkers, normalizedAnchor, ...seedShape });
}

function writeOriginalTopicInstantiationRun(runRoot, { normalizedTopic = normalizedTopicBody(), normalizedFilename = NORMALIZED_TOPIC_FILENAME } = {}) {
  const originalTopicDir = join(runRoot, "original_topic");
  writeInstantiationRun(runRoot, {
    planOverrides: {
      original_topic_dir: originalTopicDir,
    },
  });
  mkdirSync(originalTopicDir, { recursive: true });
  writeFileSync(join(originalTopicDir, "source.md"), "# Source\n");
  if (normalizedTopic !== null) {
    writeFileSync(join(originalTopicDir, normalizedFilename), normalizedTopic);
  }
}

export const tests = [
  [
    "check-instantiation rejects missing artifact scaffold README",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        unlinkSync(join(runRoot, "seed_topics", "_artifacts", "README.md"));
        assertHasFinding(checkInstantiation(runRoot), /ARTIFACT_DIR missing README\.md scaffold file/, "check-instantiation rejects missing artifact scaffold README");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects missing artifact scaffold wave1_topics directory",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        rmSync(join(runRoot, "seed_topics", "_artifacts", "wave1_topics"), { recursive: true, force: true });
        assertHasFinding(checkInstantiation(runRoot), /ARTIFACT_DIR missing scaffold directory: wave1_topics/, "check-instantiation rejects missing artifact scaffold wave1_topics directory");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects missing artifact scaffold wave2 directory",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        rmSync(join(runRoot, "seed_topics", "_artifacts", "wave2"), { recursive: true, force: true });
        assertHasFinding(checkInstantiation(runRoot), /ARTIFACT_DIR missing scaffold directory: wave2/, "check-instantiation rejects missing artifact scaffold wave2 directory");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects missing artifact scaffold shared directory",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        rmSync(join(runRoot, "seed_topics", "_artifacts", "shared"), { recursive: true, force: true });
        assertHasFinding(checkInstantiation(runRoot), /ARTIFACT_DIR missing scaffold directory: shared/, "check-instantiation rejects missing artifact scaffold shared directory");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects artifact scaffold README without evidence disclaimer",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        writeFileSync(
          join(runRoot, "seed_topics", "_artifacts", "README.md"),
          ARTIFACT_SCAFFOLD_README.replace(/This scaffold is not evidence[\s\S]*?instantiation time\.\n/, ""),
        );
        assertHasFinding(checkInstantiation(runRoot), /ARTIFACT_DIR README must state scaffold is not evidence/, "check-instantiation rejects artifact scaffold README without evidence disclaimer");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects artifact scaffold README without lifecycle owner",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        writeFileSync(
          join(runRoot, "seed_topics", "_artifacts", "README.md"),
          ARTIFACT_SCAFFOLD_README.replace(/Wave 1 topic artifacts[\s\S]*?refresh routing\.\n/, ""),
        );
        assertHasFinding(checkInstantiation(runRoot), /ARTIFACT_DIR README missing artifact lifecycle marker: topic_unique_ref_count/, "check-instantiation rejects artifact scaffold README without lifecycle owner");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects missing run-root AGENTS",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        unlinkSync(join(runRoot, "AGENTS.md"));
        assertHasFinding(checkInstantiation(runRoot), /missing run-root agent instruction file: AGENTS\.md/, "check-instantiation rejects missing run-root AGENTS");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects run-root agent file missing stop token",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        writeFileSync(join(runRoot, "AGENTS.md"), "# Active Deep Research Run\n");
        assertHasFinding(checkInstantiation(runRoot), /AGENTS\.md missing run-root agent contract marker: QUEUE_PATH -> Active Queue/, "check-instantiation rejects run-root agent file missing stop token");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects CLAUDE without Stop hook guidance",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        const claude = readFileSync(join(runRoot, "CLAUDE.md"), "utf8").replace(/If a Claude Stop hook[\s\S]*?execution action\.\n/, "");
        writeFileSync(join(runRoot, "CLAUDE.md"), claude);
        assertHasFinding(checkInstantiation(runRoot), /CLAUDE\.md missing Claude Stop hook continuation guidance/, "check-instantiation rejects CLAUDE without Stop hook guidance");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects missing Claude Stop hook settings",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        unlinkSync(join(runRoot, ".claude", "settings.local.json"));
        assertHasFinding(checkInstantiation(runRoot), /missing run-root Claude Stop hook settings file/, "check-instantiation rejects missing Claude Stop hook settings");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects Claude Stop hook placeholder settings",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        writeFileSync(join(runRoot, ".claude", "settings.local.json"), JSON.stringify({
          hooks: {
            Stop: [
              {
                matcher: "",
                hooks: [
                  {
                    type: "command",
                    command: "DEEP_RESEARCH_RUN_ROOT=\"<RUN_DIR>\" node \"RUN_DIR/_framework/cli_tools/stop_guard/claude-stop-guard.mjs\"",
                  },
                ],
              },
            ],
          },
        }, null, 2));
        assertHasFinding(checkInstantiation(runRoot), /Claude Stop hook settings must not contain RUN_DIR placeholders/, "check-instantiation rejects Claude Stop hook placeholder settings");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects Claude Stop hook not bound to run root",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot);
        writeFileSync(join(runRoot, ".claude", "settings.local.json"), JSON.stringify({
          hooks: {
            Stop: [
              {
                matcher: "",
                hooks: [
                  {
                    type: "command",
                    command: "DEEP_RESEARCH_RUN_ROOT=\"/tmp/other-run\" node \"/tmp/other-run/_framework/cli_tools/stop_guard/claude-stop-guard.mjs\"",
                  },
                ],
              },
            ],
          },
        }, null, 2));
        assertHasFinding(checkInstantiation(runRoot), /Claude Stop hook settings must bind the absolute run root/, "check-instantiation rejects Claude Stop hook not bound to run root");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects relative root binding path",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot, { planOverrides: { profile_path: "case.profile.md" } });
        assertHasFinding(checkInstantiation(runRoot), /Instance Config profile_path must be an absolute path/, "check-instantiation rejects relative root binding path");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects root file angle placeholder residue",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-regression-"));
      try {
        writeInstantiationRun(runRoot, { profile: "# Profile\n\nleftover <placeholder>\n" });
        assertHasFinding(checkInstantiation(runRoot), /profile file contains unresolved <placeholder> residue/, "check-instantiation rejects root file angle placeholder residue");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects original-topic run without normalized topic",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-normalized-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: true }),
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedMarkers: true,
          originalTopic: true,
          normalizedTopic: null,
        });
        assertHasFinding(checkInstantiation(runRoot), /exactly one English-slug \*\.normalized\.md/, "check-instantiation rejects original-topic run without normalized topic");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects multiple normalized topic files",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-normalized-"));
      try {
        writeOriginalTopicInstantiationRun(runRoot);
        writeFileSync(join(runRoot, "original_topic", "second-topic.normalized.md"), normalizedTopicBody());
        assertHasFinding(checkInstantiation(runRoot), /exactly one English-slug \*\.normalized\.md.*found 2/, "check-instantiation rejects multiple normalized topic files");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects non-ASCII normalized topic filename",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-normalized-"));
      try {
        writeOriginalTopicInstantiationRun(runRoot, {
          normalizedFilename: "中文公司.normalized.md",
        });
        assertHasFinding(checkInstantiation(runRoot), /filename must be an English ASCII slug/, "check-instantiation rejects non-ASCII normalized topic filename");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects thin normalized topic shell",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-normalized-"));
      try {
        writeOriginalTopicInstantiationRun(runRoot, {
          normalizedTopic: normalizedTopicBody({ thin: true }),
        });
        assertHasFinding(checkInstantiation(runRoot), /too thin to be a useful normalized topic/, "check-instantiation rejects thin normalized topic shell");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects normalized topic missing Source line",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-normalized-"));
      try {
        writeOriginalTopicInstantiationRun(runRoot, {
          normalizedTopic: normalizedTopicBody({ includeSource: false }),
        });
        assertHasFinding(checkInstantiation(runRoot), /must include Source: original_topic\/<raw-file>\.md/, "check-instantiation rejects normalized topic missing Source line");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects normalized topic curly placeholder residue",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-normalized-"));
      try {
        writeOriginalTopicInstantiationRun(runRoot, {
          normalizedTopic: normalizedTopicBody({ placeholder: true }),
        });
        assertHasFinding(checkInstantiation(runRoot), /contains unresolved placeholder/, "check-instantiation rejects normalized topic curly placeholder residue");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects normalized topic metadata field residue",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-normalized-"));
      try {
        writeOriginalTopicInstantiationRun(runRoot, {
          normalizedTopic: normalizedTopicBody({ metadataField: true }),
        });
        assertHasFinding(checkInstantiation(runRoot), /not a metadata field contract/, "check-instantiation rejects normalized topic metadata field residue");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation accepts valid lightweight normalized original topic",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-normalized-"));
      try {
        writeOriginalTopicInstantiationRun(runRoot);
        assertNoFindings(checkInstantiation(runRoot), "check-instantiation accepts valid lightweight normalized original topic");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects missing PLAN template_version",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-version-"));
      try {
        writeInstantiationRun(runRoot, {
          plan: instantiationPlan(runRoot).replace(/\| `template_version` \| `[^`]+` \|\n/, ""),
        });
        assertHasFinding(checkInstantiation(runRoot), /PLAN Instance Config missing template_version/, "check-instantiation rejects missing PLAN template_version");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects framework current_version drift",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-version-"));
      try {
        const currentVersion = currentTemplateVersion();
        writeInstantiationRun(runRoot, {
          planOverrides: {
            template_version: currentVersion,
          },
        });
        writeFileSync(join(runRoot, "_framework", "specs", "CONSTANTS.md"), [
          "- template_family: `DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE`",
          "- current_version: `v12.9`",
          "",
        ].join("\n"));
        assertHasFinding(
          checkInstantiation(runRoot),
          new RegExp(`snapshot current_version=v12\\.9 differs from verifier current_version=${escapeRegExp(currentVersion)}|template_version=${escapeRegExp(currentVersion)} differs from _framework current_version=v12\\.9`),
          "check-instantiation rejects framework current_version drift",
        );
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-instantiation rejects same-version framework content drift",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-content-drift-"));
      try {
        writeInstantiationRun(runRoot);
        writeFileSync(join(runRoot, "_framework", "COMMANDS.md"), "# Drifted Commands\n");
        assertHasFinding(checkInstantiation(runRoot), /existing file content drift for COMMANDS\.md/, "check-instantiation rejects same-version framework content drift");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-instantiation-complete rejects incomplete bundle",
    () => {
      withRunFiles({ status: INST_STATUS }, (runRoot) => {
        assertHasFinding(checkGateInstantiationComplete(runRoot), /missing read-only _framework framework snapshot|missing required mutable seed_topics directory/, "check-gate-instantiation-complete rejects incomplete bundle");
      });
    },
  ],
  [
    "check-gate-instantiation-complete requires PROFILE root file",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-gate-"));
      try {
        writeFileSync(join(runRoot, "case.plan.md"), "# Plan\n");
        writeFileSync(join(runRoot, "case.status.md"), INST_STATUS);
        writeFileSync(join(runRoot, "case.queue.md"), sequentialQueue());
        writeFileSync(join(runRoot, "case.trace.md"), "# Trace\n");
        assertHasFinding(checkGateInstantiationComplete(runRoot), /missing required run file with suffix \.profile\.md/, "check-gate-instantiation-complete requires PROFILE root file");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-instantiation-complete passes structurally valid instantiation run",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-gate-"));
      try {
        writeInstantiationRun(runRoot);
        assertNoFindings(checkGateInstantiationComplete(runRoot), "check-gate-instantiation-complete passes structurally valid instantiation run");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-instantiation-complete rejects wrong next gate",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-instantiation-gate-"));
      try {
        writeInstantiationRun(runRoot, { status: instantiationStatus().replace("next_gate: `setup_ready`", "next_gate: `wave0_complete`") });
        assertHasFinding(checkGateInstantiationComplete(runRoot), /next_gate must be setup_ready/, "check-gate-instantiation-complete rejects wrong next gate");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready passes setup transition",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-ready-"));
      try {
        writeReadySetupRun(runRoot);
        assertNoFindings(checkGateSetupReady(runRoot), "check-gate-setup-ready passes setup transition");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready accepts gap_queue_backed with concrete setup repair queue",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-gap-"));
      try {
        writeInstantiationRun(runRoot, {
          plan: instantiationPlan(runRoot),
          status: setupStatus({ seedReady: "gap_queue_backed", pendingCandidates: "demo-candidate", runRoot }),
          queue: setupRepairQueue(),
        });
        writeSetupNavigation(runRoot);
        assertNoFindings(checkGateSetupReady(runRoot), "check-gate-setup-ready accepts gap_queue_backed with concrete setup repair queue");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects gap_queue_backed source intake",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-gap-source-"));
      try {
        writeInstantiationRun(runRoot, {
          plan: instantiationPlan(runRoot),
          status: setupStatus({ seedReady: "gap_queue_backed", pendingCandidates: "demo-candidate", runRoot }),
          queue: sourceIntakeQueue(),
        });
        writeSetupNavigation(runRoot);
        assertHasFinding(checkGateSetupReady(runRoot), /must not start source intake|before source intake/, "check-gate-setup-ready rejects gap_queue_backed source intake");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects gap_queue_backed source work in any active slot",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-gap-any-slot-"));
      try {
        const queue = setupRepairQueue().replace(
          "action: `verify setup surfaces after seed intake repair`",
          "action: `run Wave 0 evidence search before seed repair`",
        );
        writeInstantiationRun(runRoot, {
          plan: instantiationPlan(runRoot),
          status: setupStatus({ seedReady: "gap_queue_backed", pendingCandidates: "demo-candidate", runRoot }),
          queue,
        });
        writeSetupNavigation(runRoot);
        assertHasFinding(checkGateSetupReady(runRoot), /slot_4_pending\.action.*Wave 0 evidence/, "check-gate-setup-ready rejects gap_queue_backed source work in any active slot");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects intake gap without concrete queue consequence",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-gap-missing-consequence-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { gap: true }).replace("clarify t1/demo original_topic context in slot_1_current", "not_applicable"),
          status: setupStatus({ seedReady: "gap_queue_backed", includeTopic: true, runRoot }),
          queue: setupRepairQueue(),
        });
        assertHasFinding(checkGateSetupReady(runRoot), /lacks concrete queue_consequence|no concrete queue_consequence/, "check-gate-setup-ready rejects intake gap without concrete queue consequence");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-seed-topic-shape rejects missing growth heading",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedShape: { missingHeading: true },
        });
        assertHasFinding(checkSeedTopicShape(runRoot), /missing canonical growth heading line: 本轮新增趋势与难点.*repair-seed-topic-shape/, "check-seed-topic-shape rejects missing growth heading");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-seed-topic-shape rejects prose-only growth heading mentions",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedShape: { missingHeading: true, fakeHeadingMention: true },
        });
        assertHasFinding(checkSeedTopicShape(runRoot), /missing canonical growth heading line: 本轮新增趋势与难点/, "check-seed-topic-shape rejects prose-only growth heading mentions");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-seed-topic-shape rejects missing upper intake bullets",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedShape: { missingUpper: true },
        });
        assertHasFinding(checkSeedTopicShape(runRoot), /missing concrete upper intake substance: why_now.*repair-seed-topic-shape/, "check-seed-topic-shape rejects missing upper intake bullets");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-seed-topic-shape ignores upper intake bullets inside fenced examples",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedShape: { fencedUpperOnly: true },
        });
        assertHasFinding(checkSeedTopicShape(runRoot), /missing concrete upper intake substance: slug.*repair-seed-topic-shape/, "check-seed-topic-shape ignores fenced upper intake bullets");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-seed-topic-shape rejects non-meaningful upper intake values",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedShape: { nonMeaningfulUpper: true },
        });
        assertHasFinding(checkSeedTopicShape(runRoot), /missing concrete upper intake substance: why_now.*repair-seed-topic-shape/, "check-seed-topic-shape rejects non-meaningful upper intake values");
        assertHasFinding(checkSeedTopicShape(runRoot), /missing concrete upper intake substance: boundary.*repair-seed-topic-shape/, "check-seed-topic-shape rejects pending clarification upper intake values");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready accepts queue-backed semantic seed shape gaps",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-gap-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { gap: true }),
          status: setupStatus({ seedReady: "gap_queue_backed", includeTopic: true, runRoot }),
          queue: setupRepairQueue(),
          seedShape: { missingUpper: true },
        });
        assertHasFinding(checkSeedTopicShape(runRoot), /missing concrete upper intake substance: why_now/, "strict check-seed-topic-shape still rejects missing upper intake bullets");
        assertNoFindings(checkSeedIntake(runRoot), "check-seed-intake accepts queue-backed semantic seed shape gaps");
        assertNoFindings(checkGateSetupReady(runRoot), "setup_ready accepts queue-backed semantic seed shape gaps");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "queue-backed semantic seed shape gaps fail after setup",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-gap-late-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { gap: true }),
          status: setupStatus({
            seedReady: "gap_queue_backed",
            includeTopic: true,
            runRoot,
            gate: "wave0_complete",
            wave: "Wave 1",
            nextGate: "wave1_complete",
          }),
          queue: setupRepairQueue(),
          seedShape: { missingUpper: true },
        });
        assertHasFinding(checkSeedIntake(runRoot), /missing concrete upper intake substance: why_now/, "check-seed-intake rejects queue-backed shape gaps after setup");
        assertHasFinding(checkSurfaces(runRoot), /missing concrete upper intake substance: why_now/, "check-surfaces rejects queue-backed shape gaps after setup");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-seed-topic-shape rejects curly template residue in upper intake values",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedShape: { curlyPlaceholder: true },
        });
        assertHasFinding(checkSeedTopicShape(runRoot), /unresolved template placeholder residue.*repair-seed-topic-shape/, "check-seed-topic-shape rejects curly template residue");
        assertHasFinding(checkSeedTopicShape(runRoot), /missing concrete upper intake substance: evidence_anchors.*repair-seed-topic-shape/, "check-seed-topic-shape rejects curly placeholder upper field");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "freeform hand-written seed topic fails intake and setup before shape repair",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedShape: { proseOnly: true },
        });
        assertHasFinding(checkSeedTopicShape(runRoot), /missing concrete upper intake substance: slug/, "check-seed-topic-shape rejects freeform seed topic");
        assertHasFinding(checkSeedIntake(runRoot), /missing concrete upper intake substance: slug/, "check-seed-intake rejects freeform seed topic");
        assertHasFinding(checkGateSetupReady(runRoot), /missing concrete upper intake substance: slug/, "setup_ready rejects freeform seed topic");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-seed-topic-shape accepts valid repaired seed topic",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-seed-shape-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
        });
        assertNoFindings(checkSeedTopicShape(runRoot), "check-seed-topic-shape accepts valid repaired seed topic");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "original-topic context markers fail without queue-backed gap",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-context-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: false }),
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedMarkers: false,
          originalTopic: true,
        });
        assertHasFinding(checkSeedIntake(runRoot), /original_topic.*missing source_anchor/, "check-seed-intake rejects missing original-topic context markers");
        assertHasFinding(checkSurfaces(runRoot), /original_topic.*missing source_anchor/, "check-surfaces rejects missing original-topic context markers");
        assertHasFinding(checkGateSetupReady(runRoot), /original_topic.*missing source_anchor/, "setup_ready rejects missing original-topic context markers");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "original-topic hollow context fields fail until meaningful",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-hollow-context-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: true }),
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedMarkers: true,
          seedShape: { hollowOriginalContext: true },
          originalTopic: true,
        });
        assertHasFinding(checkSeedIntake(runRoot), /meaningful original context fields.*source_anchor/, "check-seed-intake rejects hollow original-topic context fields");
        assertHasFinding(checkSurfaces(runRoot), /meaningful original context fields.*source_anchor/, "check-surfaces rejects hollow original-topic context fields");
        assertHasFinding(checkGateSetupReady(runRoot), /meaningful original context fields.*source_anchor/, "setup_ready rejects hollow original-topic context fields");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "original-topic PLAN hollow context fields fail until meaningful",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-plan-hollow-context-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: true, hollowPlanContext: true }),
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedMarkers: true,
          originalTopic: true,
        });
        assertHasFinding(checkSeedIntake(runRoot), /Seed Topic Intake Matrix row t1\/demo derived from original_topic must preserve meaningful original context fields.*source_anchor/, "check-seed-intake rejects hollow original-topic context in PLAN");
        assertHasFinding(checkSurfaces(runRoot), /intake matrix derived from original_topic must preserve meaningful original context fields.*source_anchor/, "check-surfaces rejects hollow original-topic context in PLAN");
        assertHasFinding(checkGateSetupReady(runRoot), /derived from original_topic must preserve meaningful original context fields.*source_anchor/, "setup_ready rejects hollow original-topic context in PLAN");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "original-topic context marker gaps pass when queue backed",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-context-gap-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: false, gap: true }),
          status: setupStatus({ seedReady: "gap_queue_backed", includeTopic: true, runRoot }),
          queue: setupRepairQueue(),
          seedMarkers: false,
          originalTopic: true,
        });
        assertNoFindings(checkSeedIntake(runRoot), "check-seed-intake accepts queue-backed original-topic context gap");
        assertNoFindings(checkSurfaces(runRoot), "check-surfaces accepts queue-backed original-topic context gap");
        assertNoFindings(checkGateSetupReady(runRoot), "setup_ready accepts queue-backed original-topic context gap");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "original-topic seed-only markers fail until PLAN matrix is repaired",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-seed-only-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: false }),
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedMarkers: true,
          originalTopic: true,
        });
        assertHasFinding(checkSeedIntake(runRoot), /Seed Topic Intake Matrix row t1\/demo derived from original_topic.*missing source_anchor/, "check-seed-intake rejects seed-only original-topic markers");
        assertHasFinding(checkSurfaces(runRoot), /intake matrix derived from original_topic.*missing source_anchor/, "check-surfaces rejects seed-only original-topic markers");
        assertHasFinding(checkGateSetupReady(runRoot), /intake matrix derived from original_topic.*missing source_anchor/, "setup_ready rejects seed-only original-topic markers");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "original-topic PLAN-only markers fail until seed file is repaired",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-plan-only-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: true }),
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedMarkers: false,
          originalTopic: true,
        });
        assertHasFinding(checkSeedIntake(runRoot), /seed file derived from original_topic.*missing source_anchor/, "check-seed-intake rejects PLAN-only original-topic markers");
        assertHasFinding(checkSurfaces(runRoot), /seed file derived from original_topic.*missing source_anchor/, "check-surfaces rejects PLAN-only original-topic markers");
        assertHasFinding(checkGateSetupReady(runRoot), /seed file derived from original_topic.*missing source_anchor/, "setup_ready rejects PLAN-only original-topic markers");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "original-topic raw-only source anchors fail until normalized topic is cited",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-raw-only-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: true, normalizedAnchor: false }),
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedMarkers: true,
          normalizedAnchor: false,
          originalTopic: true,
        });
        assertHasFinding(checkSeedIntake(runRoot), /must cite original_topic\/<english-slug>\.normalized\.md/, "check-seed-intake rejects raw-only original-topic anchors");
        assertHasFinding(checkSurfaces(runRoot), /must cite original_topic\/<english-slug>\.normalized\.md/, "check-surfaces rejects raw-only original-topic anchors");
        assertHasFinding(checkGateSetupReady(runRoot), /must cite original_topic\/<english-slug>\.normalized\.md/, "setup_ready rejects raw-only original-topic anchors");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "original-topic markers pass when both seed file and PLAN matrix preserve context",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-original-both-surfaces-"));
      try {
        writeReadySetupRun(runRoot, {
          plan: setupPlan(runRoot, { originalTopic: true, markers: true }),
          status: setupStatus({ seedReady: "yes", includeTopic: true, runRoot }),
          seedMarkers: true,
          originalTopic: true,
        });
        assertNoFindings(checkSeedIntake(runRoot), "check-seed-intake accepts both original-topic context surfaces");
        assertNoFindings(checkSurfaces(runRoot), "check-surfaces accepts both original-topic context surfaces");
        assertNoFindings(checkGateSetupReady(runRoot), "setup_ready accepts both original-topic context surfaces");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects incomplete setup transition",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-incomplete-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "no", includeTopic: true, runRoot }),
        });
        assertHasFinding(checkGateSetupReady(runRoot), /seed_topic_intake_ready must be yes or gap_queue_backed/, "check-gate-setup-ready rejects incomplete setup transition");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects missing active queue",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-missing-queue-"));
      try {
        writeReadySetupRun(runRoot, {
          queue: "",
        });
        assertHasFinding(checkGateSetupReady(runRoot), /requires QUEUE ## Active Queue/, "check-gate-setup-ready rejects missing active queue");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects non-sequential queue",
    () => {
      const queue = sequentialQueue().replace("execution_mode: `sequential`", "execution_mode: `parallel_subagent_batch`");
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-nonseq-"));
      try {
        writeReadySetupRun(runRoot, { queue });
        assertHasFinding(checkGateSetupReady(runRoot), /execution_mode=sequential/, "check-gate-setup-ready rejects non-sequential queue");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects missing queue health",
    () => {
      const queue = sequentialQueue().replace(/- queue_health: `ready`\n/, "");
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-missing-health-"));
      try {
        writeReadySetupRun(runRoot, { queue });
        assertHasFinding(checkGateSetupReady(runRoot), /queue_health=ready or thin/, "check-gate-setup-ready rejects missing queue health");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects blocked queue",
    () => {
      const queue = sequentialQueue().replace("queue_health: `ready`", "queue_health: `blocked`");
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-blocked-"));
      try {
        writeReadySetupRun(runRoot, { queue });
        assertHasFinding(checkGateSetupReady(runRoot), /queue_health=ready or thin/, "check-gate-setup-ready rejects blocked queue");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "check-gate-setup-ready rejects closed queue",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-setup-closed-"));
      try {
        writeReadySetupRun(runRoot, { queue: closedQueue() });
        assertHasFinding(checkGateSetupReady(runRoot), /queue_health=ready or thin/, "check-gate-setup-ready rejects closed queue");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "runtime gate orchestration includes setup_ready checker",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-runtime-setup-"));
      try {
        writeReadySetupRun(runRoot);
        const status = setupStatus({ seedReady: "yes", includeTopic: true, runRoot });
        assertNoFindings(
          runtimeGateFindings(runRoot, {
            profile: join(runRoot, "case.profile.md"),
            plan: join(runRoot, "case.plan.md"),
            status: join(runRoot, "case.status.md"),
            queue: join(runRoot, "case.queue.md"),
            trace: join(runRoot, "case.trace.md"),
          }, {
            plan: setupPlan(runRoot),
            status,
            queue: sequentialQueue(),
            trace: "",
          }),
          "runtime gate orchestration includes setup_ready checker",
        );
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "runtime gate orchestration does not require historical setup queue to stay executable",
    () => {
      const status = `${statusHeader({ gate: "wave0_complete", wave: "Wave 1", state: "blocked", nextGate: "wave1_complete" })}\n${SETUP_READY}\n${WAVE0_PASS_AUDIT}\n${WAVE0_INVENTORY_ROW}`;
      const queue = `${activeQueueHeader({ health: "blocked" })}

### slot_1_current

- action: \`not_applicable\`

### slot_2_next

- action: \`not_applicable\`

### slot_3_pending

- action: \`not_applicable\`

### slot_4_pending

- action: \`not_applicable\`

### slot_5_tail

- action: \`not_applicable\`
`;
      withRunFiles({ plan: planWithFloors(), status, queue }, (runRoot) => {
        const findings = runtimeGateFindings(runRoot, {}, { plan: planWithFloors(), status, queue, trace: "" });
        assertNoFindings(
          findings.filter((finding) => /setup_ready requires/.test(finding.message)),
          "runtime gate orchestration does not require historical setup queue to stay executable",
        );
      });
    },
  ],
  [
    "runtime gate orchestration rejects incomplete setup_ready transition",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-runtime-setup-incomplete-"));
      try {
        writeReadySetupRun(runRoot, {
          status: setupStatus({ seedReady: "no", includeTopic: true, runRoot }),
        });
        assertHasFinding(
          runtimeGateFindings(runRoot, {
            profile: join(runRoot, "case.profile.md"),
            plan: join(runRoot, "case.plan.md"),
            status: join(runRoot, "case.status.md"),
            queue: join(runRoot, "case.queue.md"),
            trace: join(runRoot, "case.trace.md"),
          }, {
            plan: setupPlan(runRoot),
            status: setupStatus({ seedReady: "no", includeTopic: true, runRoot }),
            queue: sequentialQueue(),
            trace: "",
          }),
          /seed_topic_intake_ready must be yes or gap_queue_backed/,
          "runtime gate orchestration rejects incomplete setup_ready transition",
        );
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
];

runIfMain(import.meta.url, tests);
