import {
  assertHasFinding,
  assertNoFindings,
  frameworkStateFindings,
  inventoryFindings,
  join,
  mkdirSync,
  mkdtempSync,
  queueFindings,
  queueSkeletonOutput,
  resolve,
  rmSync,
  runIfMain,
  statusInProgress,
  statusSkeletonOutput,
  statusWithCountedCacheInventory,
  tmpdir,
  writeReferenceFile,
  writeFileSync,
} from "./test-runtime-harness.mjs";
import { artifactFindings } from "../checks/runtime-artifact.mjs";

function writeArtifact(runRoot, relPath, body) {
  const fullPath = resolve(runRoot, relPath);
  mkdirSync(resolve(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, body);
}

function topicArtifactStatus({
  evidenceSummaryPath = "seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md",
  questionListPath = "seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md",
  evidenceSummaryState = "produced_at_ref_count=1",
  questionListState = "produced_at_ref_count=1",
} = {}) {
  return `
### Topic t1/demo

- topic_id: \`t1\`
- topic_slug: \`demo\`
- accepted_topic_ref_count: \`1\`
- topic_unique_ref_count: \`1\`
- topic_seed_backfill_status: \`current\`
- question_reconciliation_state: \`reconciled\`
- emergent_question_protocol_state: \`executed\`
- exploration_exploitation_decision: \`exploit_current_line\`
- exploration_trigger_refs: \`seed_topics/_reference/t1-ref.md\`
- exploration_queue_consequence: \`continue targeted verification in the active queue\`
- evidence_summary: \`${evidenceSummaryState}\`
- evidence_summary_path: \`${evidenceSummaryPath}\`
- question_list: \`${questionListState}\`
- question_list_path: \`${questionListPath}\`
`;
}

function evidenceSummaryBody() {
  const paragraph = "seed_topics/_reference/t1-ref.md records the local benchmark method, dated scope, limitation, and current judgment. This fixture repeats enough concrete material to count as a substantive topic artifact with local backing. ";
  return `# Evidence Summary

produced_at_ref_count: 1

## Key Evidence

${paragraph.repeat(4)}

## Mechanism

${paragraph.repeat(3)}

## Current Judgment

${paragraph.repeat(3)}

## Topic Target Coverage

| target_ids | coverage_status | backing_refs | queue_consequence | last_updated_ref_count |
| --- | --- | --- | --- | --- |
| TT-1 | covered | seed_topics/_reference/t1-ref.md | none | 1 |

${paragraph.repeat(2)}
`;
}

function questionListBody() {
  const paragraph = "The question list reconciles the active research questions against seed_topics/_reference/t1-ref.md and preserves the current status for handoff. ";
  return `# Question List

produced_at_ref_count: 1

## Topic Investigation Targets

| target_id | target_question | origin | status | profile_relevance | evidence_refs | next_action | last_updated_ref_count |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TT-1 | Does the fixture claim hold under the local benchmark? | seed | answered | fixture profile requires local benchmark answer | seed_topics/_reference/t1-ref.md | none | 1 |

## Question Reconciliation

- [resolved] The first topic question is answered by seed_topics/_reference/t1-ref.md.
- [open] A lower-priority follow-up remains tracked with queue consequence.

## Emergent Question Protocol

- new_concept: checked; no new topic object emerged from seed_topics/_reference/t1-ref.md.
- contradiction: checked; no contradiction against the fixture hypothesis.
- missing_information_gap: checked; no material public-source gap changed the target.
- noise_pattern: checked; no systematic excluded-source pattern changed the route.
- result: no_new_questions_after_protocol.

## Exploration / Exploitation Decision

- decision: exploit_current_line
- trigger_refs: seed_topics/_reference/t1-ref.md
- unresolved_questions: low-priority follow-up remains open but does not block the target.
- counterexample_failure_search: queued same-line verification after current artifact repair.
- queue_consequence: continue targeted verification in the active queue.
- next_action: targeted verification, not broad exploration.
- last_updated_ref_count: 1

${paragraph.repeat(5)}
`;
}

function prepareTopicArtifactRun(runRoot, {
  evidenceSummaryPath = "seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md",
  questionListPath = "seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md",
  evidenceSummaryBodyText = evidenceSummaryBody(),
  questionListBodyText = questionListBody(),
} = {}) {
  writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
  writeArtifact(runRoot, evidenceSummaryPath, evidenceSummaryBodyText);
  writeArtifact(runRoot, questionListPath, questionListBodyText);
}

export const tests = [
  [
    "counted inventory rejects cache path",
    () => {
      const findings = inventoryFindings({ status: statusWithCountedCacheInventory(), plan: "" });
      assertHasFinding(findings, /not _cache staging/, "counted inventory rejects cache path");
    },
  ],
  [
    "framework cache directory rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        mkdirSync(join(runRoot, "_framework", "_cache"), { recursive: true });
        mkdirSync(join(runRoot, "seed_topics", "_reference"), { recursive: true });
        mkdirSync(join(runRoot, "seed_topics", "_artifacts"), { recursive: true });
        writeFileSync(join(runRoot, "_framework", "_cache", "noise.md"), "noise");
        assertHasFinding(frameworkStateFindings(runRoot), /must not contain mutable run data directory/, "framework cache directory rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "topic artifacts validate without must-answer artifact",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot);
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertNoFindings(findings, "topic artifacts validate without must-answer artifact");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "evidence summary invalid topics path rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        const invalidPath = "seed_topics/_artifacts/topics/t1-demo/evidence-summary.md";
        prepareTopicArtifactRun(runRoot, { evidenceSummaryPath: invalidPath });
        const status = topicArtifactStatus({ evidenceSummaryPath: invalidPath });
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /wave1_topics\/<topic-id>-<topic-slug>\/evidence-summary\.md/, "evidence summary invalid topics path rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "evidence summary missing Topic Target Coverage status rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot, {
          evidenceSummaryBodyText: evidenceSummaryBody().replace("coverage_status", "coverage_state"),
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /Topic Target Coverage missing field: coverage_status/, "evidence summary missing Topic Target Coverage status rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "evidence summary rejects curly placeholder in target coverage refs",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot, {
          evidenceSummaryBodyText: evidenceSummaryBody().replace(
            "| TT-1 | covered | seed_topics/_reference/t1-ref.md | none | 1 |",
            "| TT-1 | covered | {backing refs} | none | 1 |",
          ),
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /unresolved template placeholder residue/, "evidence summary rejects curly placeholder in target coverage refs");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "question list missing Topic Investigation Targets rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot, {
          questionListBodyText: questionListBody().replace("## Topic Investigation Targets", "## Investigation Notes"),
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /question-list missing Topic Investigation Targets section/, "question list missing Topic Investigation Targets rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "question list rejects curly placeholder in investigation target refs",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot, {
          questionListBodyText: questionListBody().replace(
            "seed_topics/_reference/t1-ref.md | none | 1 |",
            "{REFERENCE_DIR path or none} | none | 1 |",
          ),
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /unresolved template placeholder residue/, "question list rejects curly placeholder in investigation target refs");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "question list missing emergent protocol rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot, {
          questionListBodyText: questionListBody().replace("## Emergent Question Protocol", "## Protocol Notes"),
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /missing Emergent Question Protocol section/, "question list missing emergent protocol rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "question list rejects curly placeholder in exploration trigger refs",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot, {
          questionListBodyText: questionListBody().replace(
            "- trigger_refs: seed_topics/_reference/t1-ref.md",
            "- trigger_refs: {local reference paths...}",
          ),
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /unresolved template placeholder residue|missing meaningful field: trigger_refs/, "question list rejects curly placeholder in exploration trigger refs");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "question list ledger section order rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        const body = questionListBody();
        const targetStart = body.indexOf("## Topic Investigation Targets");
        const reconciliationStart = body.indexOf("## Question Reconciliation");
        const emergentStart = body.indexOf("## Emergent Question Protocol");
        const reorderedBody = body.slice(0, targetStart)
          + body.slice(reconciliationStart, emergentStart)
          + body.slice(targetStart, reconciliationStart)
          + body.slice(emergentStart);
        prepareTopicArtifactRun(runRoot, {
          questionListBodyText: reorderedBody,
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /sections are out of required Wave 1 ledger order/, "question list ledger section order rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "question list missing exploration decision rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot, {
          questionListBodyText: questionListBody().replace("- decision: exploit_current_line", "- decision: not_assessed"),
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /must record one canonical decision value/, "question list missing exploration decision rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "question list missing queue consequence rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot, {
          questionListBodyText: questionListBody().replace("- queue_consequence: continue targeted verification in the active queue.", "- queue_consequence: none"),
        });
        const status = topicArtifactStatus();
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /missing meaningful field: queue_consequence/, "question list missing queue consequence rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "question list STATUS decision mirror rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        prepareTopicArtifactRun(runRoot);
        const status = topicArtifactStatus().replace(
          "- exploration_exploitation_decision: `exploit_current_line`",
          "- exploration_exploitation_decision: `not_assessed`",
        );
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue: "" });
        assertHasFinding(findings, /STATUS exploration_exploitation_decision is not mirrored/, "question list STATUS decision mirror rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "initial artifact repair in Refill Pool only rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-artifact-regression-"));
      try {
        const status = topicArtifactStatus({
          evidenceSummaryState: "produced_at_ref_count=0",
          questionListState: "produced_at_ref_count=0",
        });
        const queue = `
## Active Queue

### slot_1_current

- action: \`review promoted topic reference and sync Wave 1 inventory\`

## Refill Pool

### Candidate Block

- candidate: \`produce topic evidence summary and question list artifacts for t1 demo\`
`;
        const findings = artifactFindings(runRoot, { status: join(runRoot, "case.status.md") }, { status, queue });
        assertHasFinding(findings, /active-window artifact production work/, "initial artifact repair in Refill Pool only rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "queue skeleton source-intake defaults pass enum guard",
    () => {
      assertNoFindings(queueFindings({ status: statusInProgress(), queue: queueSkeletonOutput() }), "queue skeleton source-intake defaults pass enum guard");
    },
  ],
  [
    "status skeleton source-intake defaults pass enum guard",
    () => {
      assertNoFindings(queueFindings({ status: statusSkeletonOutput(), queue: queueSkeletonOutput() }), "status skeleton source-intake defaults pass enum guard");
    },
  ],
];

runIfMain(import.meta.url, tests);
