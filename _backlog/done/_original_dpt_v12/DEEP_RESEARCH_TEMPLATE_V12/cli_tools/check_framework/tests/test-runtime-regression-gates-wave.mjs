import {
  assertHasFinding,
  assertNoFindings,
  closedQueue,
  runIfMain,
  sequentialQueue,
  writeReferenceFile,
} from "./test-runtime-harness.mjs";
import { checkGateReadinessPassed } from "../checks/gates/check_gate_readiness_passed.mjs";
import { checkGateWave0Complete } from "../checks/gates/check_gate_wave0_complete.mjs";
import { checkGateWave1Complete } from "../checks/gates/check_gate_wave1_complete.mjs";
import { checkGateWave2Complete } from "../checks/gates/check_gate_wave2_complete.mjs";
import { runtimeGateFindings } from "../checks/gates/index.mjs";
import {
  PROFILE_HITL2_READY,
  READINESS_PASS,
  SYNTHESIS_MATRIX_ROW,
  TRACE_WITH_CHECKPOINT,
  V12_9_READINESS_PASS,
  WAVE0_INVENTORY_ROW,
  WAVE0_PASS_AUDIT,
  WAVE1_ACCEPTED_ROW,
  WAVE1_PASS_AUDIT,
  WAVE2_PASS_AUDIT,
  legacyWave1QuestionListBody,
  planWithFloors,
  statusHeader,
  synthesisArtifactBody,
  wave1EvidenceSummaryBody,
  wave1QuestionListBody,
  wave1TopicBlock,
  withRunFiles,
} from "./test-runtime-regression-gates-wave-fixtures.mjs";

function planWithoutConfirmedTopics() {
  return planWithFloors().replace(/## Topic Registry[\s\S]*$/, `
## Topic Registry

| id | slug | title | seed_files | current_hypothesis | why_it_matters | must_answer |
| --- | --- | --- | --- | --- | --- | --- |

## Seed Topic Intake Matrix

| topic | must_answer | why_now | boundary | evidence_anchors | why_it_matters | intake_status | intake_gap | queue_consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
`);
}

function planWithIntakeGap() {
  return planWithFloors()
    .replace("| t1/demo | Demo must answer | 2026 trigger | Demo boundary | Official source route | Demo matters | ready | none | not_applicable |", "| t1/demo | Demo must answer | 2026 trigger | Demo boundary | Official source route | Demo matters | gap | missing search guardrails | repair t1/demo intake context |");
}

function writeWave1Artifacts(runRoot, { questionListBody = wave1QuestionListBody(), evidenceSummaryBody = wave1EvidenceSummaryBody() } = {}) {
  writeReferenceFile(runRoot, "seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md", evidenceSummaryBody);
  writeReferenceFile(runRoot, "seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md", questionListBody);
}

export const tests = [
  [
    "check-gate-wave0-complete passes backed Wave 0 audit",
    () => {
      const status = `${statusHeader({ gate: "wave0_complete", wave: "Wave 1", nextGate: "wave1_complete" })}\n${WAVE0_PASS_AUDIT}\n${WAVE0_INVENTORY_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/00-shared-r1.md");
        assertNoFindings(checkGateWave0Complete(runRoot), "check-gate-wave0-complete passes backed Wave 0 audit");
      });
    },
  ],
  [
    "check-gate-wave0-complete rejects pass without inventory backing",
    () => {
      const status = `${statusHeader({ gate: "wave0_complete", wave: "Wave 1", nextGate: "wave1_complete" })}\n${WAVE0_PASS_AUDIT}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        assertHasFinding(checkGateWave0Complete(runRoot), /counted accepted shared references/, "check-gate-wave0-complete rejects pass without inventory backing");
      });
    },
  ],
  [
    "check-gate-wave0-complete rejects queue-backed seed intake",
    () => {
      const status = `${statusHeader({ gate: "wave0_complete", wave: "Wave 1", nextGate: "wave1_complete" })}\n${WAVE0_PASS_AUDIT.replace("seed_topic_intake_ready: `yes`", "seed_topic_intake_ready: `gap_queue_backed`")}\n${WAVE0_INVENTORY_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/00-shared-r1.md");
        assertHasFinding(checkGateWave0Complete(runRoot), /seed_topic_intake_ready=yes/, "check-gate-wave0-complete rejects queue-backed seed intake");
      });
    },
  ],
  [
    "check-gate-wave0-complete rejects zero confirmed topics",
    () => {
      const status = `${statusHeader({ gate: "wave0_complete", wave: "Wave 1", nextGate: "wave1_complete" })}\n${WAVE0_PASS_AUDIT}\n${WAVE0_INVENTORY_ROW}`;
      withRunFiles({ plan: planWithoutConfirmedTopics(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/00-shared-r1.md");
        assertHasFinding(checkGateWave0Complete(runRoot), /derived_topic_count > 0/, "check-gate-wave0-complete rejects zero confirmed topics");
      });
    },
  ],
  [
    "check-gate-wave0-complete rejects missing topic-start rows",
    () => {
      const badAudit = WAVE0_PASS_AUDIT.replace(/\| topic \| wave1_start_point[\s\S]*?\| t1\/demo \| ready \| ready \| ready \| pass \| none \|\n/, "");
      const status = `${statusHeader({ gate: "wave0_complete", wave: "Wave 1", nextGate: "wave1_complete" })}\n${badAudit}\n${WAVE0_INVENTORY_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/00-shared-r1.md");
        assertHasFinding(checkGateWave0Complete(runRoot), /topic-start audit row/, "check-gate-wave0-complete rejects missing topic-start rows");
      });
    },
  ],
  [
    "check-gate-wave0-complete rejects unresolved intake gaps",
    () => {
      const status = `${statusHeader({ gate: "wave0_complete", wave: "Wave 1", nextGate: "wave1_complete" })}\n${WAVE0_PASS_AUDIT}\n${WAVE0_INVENTORY_ROW}`;
      withRunFiles({ plan: planWithIntakeGap(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/00-shared-r1.md");
        assertHasFinding(checkGateWave0Complete(runRoot), /unresolved intake gap/, "check-gate-wave0-complete rejects unresolved intake gaps");
      });
    },
  ],
  [
    "check-gate-wave1-complete passes backed Wave 1 audit",
    () => {
      const status = `${statusHeader({ gate: "wave1_complete", wave: "Wave 2", nextGate: "wave2_complete" })}\n${WAVE0_PASS_AUDIT}\n${wave1TopicBlock()}\n${WAVE1_PASS_AUDIT}\n${WAVE1_ACCEPTED_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeWave1Artifacts(runRoot);
        assertNoFindings(checkGateWave1Complete(runRoot), "check-gate-wave1-complete passes backed Wave 1 audit");
      });
    },
  ],
  [
    "check-gate-wave1-complete rejects legacy question list without exploration ledger",
    () => {
      const status = `${statusHeader({ gate: "wave1_complete", wave: "Wave 2", nextGate: "wave2_complete" })}\n${WAVE0_PASS_AUDIT}\n${wave1TopicBlock()}\n${WAVE1_PASS_AUDIT}\n${WAVE1_ACCEPTED_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeWave1Artifacts(runRoot, { questionListBody: legacyWave1QuestionListBody() });
        assertHasFinding(checkGateWave1Complete(runRoot), /question-list missing Question Reconciliation section/, "check-gate-wave1-complete rejects legacy question list without exploration ledger");
      });
    },
  ],
  [
    "check-gate-wave1-complete rejects curly placeholder residue in question list",
    () => {
      const status = `${statusHeader({ gate: "wave1_complete", wave: "Wave 2", nextGate: "wave2_complete" })}\n${WAVE0_PASS_AUDIT}\n${wave1TopicBlock()}\n${WAVE1_PASS_AUDIT}\n${WAVE1_ACCEPTED_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeWave1Artifacts(runRoot, {
          questionListBody: wave1QuestionListBody().replace(
            "- trigger_refs: seed_topics/_reference/t1-ref.md",
            "- trigger_refs: {local reference paths...}",
          ),
        });
        assertHasFinding(checkGateWave1Complete(runRoot), /unresolved template placeholder residue/, "check-gate-wave1-complete rejects curly placeholder residue in question list");
      });
    },
  ],
  [
    "check-gate-wave1-complete rejects stale topic artifacts at gate audit",
    () => {
      const status = `${statusHeader({ gate: "wave1_complete", wave: "Wave 2", nextGate: "wave2_complete" })}\n${WAVE0_PASS_AUDIT}\n${wave1TopicBlock({ acceptedCount: 2, producedCount: 1 })}\n${WAVE1_PASS_AUDIT}\n${WAVE1_ACCEPTED_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeWave1Artifacts(runRoot);
        assertHasFinding(checkGateWave1Complete(runRoot), /produced_at_ref_count must equal accepted_topic_ref_count at Wave 1 gate/, "check-gate-wave1-complete rejects stale topic artifacts at gate audit");
      });
    },
  ],
  [
    "check-gate-wave1-complete rejects missing topic evidence rows",
    () => {
      const status = `${statusHeader({ gate: "wave1_complete", wave: "Wave 2", nextGate: "wave2_complete" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        assertHasFinding(checkGateWave1Complete(runRoot), /requires at least 1 counted accepted topic references/, "check-gate-wave1-complete rejects missing topic evidence rows");
      });
    },
  ],
  [
    "check-gate-wave1-complete rejects queue-backed topic intake repair",
    () => {
      const status = `${statusHeader({ gate: "wave1_complete", wave: "Wave 2", nextGate: "wave2_complete" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}\n${WAVE1_ACCEPTED_ROW}`;
      withRunFiles({ plan: planWithIntakeGap(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        assertHasFinding(checkGateWave1Complete(runRoot), /intake\/context repair is unresolved|queue-backed/, "check-gate-wave1-complete rejects queue-backed topic intake repair");
      });
    },
  ],
  [
    "check-gate-wave1-complete rejects missing wave1 topic answers status",
    () => {
      const badAudit = WAVE1_PASS_AUDIT.replace("| t1/demo | 1 | 1 | 1 | 0 | 1 | 1 | pass | answered |", "| t1/demo | 1 | 1 | 1 | 0 | 1 | 1 | pass | not_started |");
      const status = `${statusHeader({ gate: "wave1_complete", wave: "Wave 2", nextGate: "wave2_complete" })}\n${WAVE0_PASS_AUDIT}\n${badAudit}\n${WAVE1_ACCEPTED_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        assertHasFinding(checkGateWave1Complete(runRoot), /wave1_topic_answers unset/, "check-gate-wave1-complete rejects missing wave1 topic answers status");
      });
    },
  ],
  [
    "check-gate-wave2-complete passes backed synthesis audit",
    () => {
      const status = `${statusHeader({ gate: "wave2_complete", wave: "Readiness Check", nextGate: "readiness_passed" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}\n${WAVE2_PASS_AUDIT}\n${SYNTHESIS_MATRIX_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeReferenceFile(runRoot, "seed_topics/_artifacts/wave2/cross-topic-synthesis.md", synthesisArtifactBody());
        assertNoFindings(checkGateWave2Complete(runRoot), "check-gate-wave2-complete passes backed synthesis audit");
      });
    },
  ],
  [
    "runtime gate orchestration rejects Readiness entry before HITL2 is recorded in STATUS",
    () => {
      const status = `${statusHeader({ gate: "wave2_complete", wave: "Readiness Check", nextGate: "readiness_passed" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}\n${WAVE2_PASS_AUDIT}\n${SYNTHESIS_MATRIX_ROW}`;
      withRunFiles({ profile: PROFILE_HITL2_READY, plan: planWithFloors(), status, queue: sequentialQueue(), trace: TRACE_WITH_CHECKPOINT }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeReferenceFile(runRoot, "seed_topics/_artifacts/wave2/cross-topic-synthesis.md", synthesisArtifactBody());
        assertHasFinding(
          runtimeGateFindings(runRoot, {}, { profile: PROFILE_HITL2_READY, plan: planWithFloors(), status, queue: sequentialQueue(), trace: TRACE_WITH_CHECKPOINT }),
          /Readiness requires HITL2 answerability_class/,
          "runtime gate orchestration rejects Readiness entry before HITL2 is recorded in STATUS",
        );
      });
    },
  ],
  [
    "check-gate-wave2-complete rejects empty synthesis matrix",
    () => {
      const status = `${statusHeader({ gate: "wave2_complete", wave: "Readiness Check", nextGate: "readiness_passed" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}\n${WAVE2_PASS_AUDIT}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        assertHasFinding(checkGateWave2Complete(runRoot), /requires concrete Cross-Topic Conclusion Matrix rows/, "check-gate-wave2-complete rejects empty synthesis matrix");
      });
    },
  ],
  [
    "check-gate-wave2-complete rejects failed Root Must-Answer synthesis coverage",
    () => {
      const badAudit = WAVE2_PASS_AUDIT.replace("| synthesis_phase_must_answers | all confirmed answer_phase=wave2_synthesis entries covered | 1 / 1 | pass | none |", "| synthesis_phase_must_answers | all confirmed answer_phase=wave2_synthesis entries covered | 0 / 1 | fail | missing synthesis coverage |");
      const status = `${statusHeader({ gate: "wave2_complete", wave: "Readiness Check", nextGate: "readiness_passed" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}\n${badAudit}\n${SYNTHESIS_MATRIX_ROW}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeReferenceFile(runRoot, "seed_topics/_artifacts/wave2/cross-topic-synthesis.md", synthesisArtifactBody());
        assertHasFinding(checkGateWave2Complete(runRoot), /synthesis_phase_must_answers.result=pass/, "check-gate-wave2-complete rejects failed Root Must-Answer synthesis coverage");
      });
    },
  ],
  [
    "check-gate-wave2-complete rejects missing matrix must-answer ids",
    () => {
      const badMatrix = SYNTHESIS_MATRIX_ROW.replace("| t1/demo | MA-1 | conclusion", "| t1/demo |  | conclusion");
      const status = `${statusHeader({ gate: "wave2_complete", wave: "Readiness Check", nextGate: "readiness_passed" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}\n${WAVE2_PASS_AUDIT}\n${badMatrix}`;
      withRunFiles({ plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeReferenceFile(runRoot, "seed_topics/_artifacts/wave2/cross-topic-synthesis.md", synthesisArtifactBody());
        assertHasFinding(checkGateWave2Complete(runRoot), /lacks concrete must_answer_ids/, "check-gate-wave2-complete rejects missing matrix must-answer ids");
      });
    },
  ],
  [
    "check-gate-readiness-passed passes closed readiness",
    () => {
      const status = `${statusHeader({ gate: "readiness_passed", wave: "Readiness Check", state: "completed", nextGate: "none" })}
## Trace Pointer

- last_trace_entry: \`T001 Wave 2 transition checkpoint\`

${V12_9_READINESS_PASS}`;
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue: closedQueue(), trace: TRACE_WITH_CHECKPOINT }, (runRoot) => {
        assertNoFindings(checkGateReadinessPassed(runRoot), "check-gate-readiness-passed passes closed readiness");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects partial readiness item",
    () => {
      const status = `${statusHeader({ gate: "readiness_passed", wave: "Readiness Check", state: "completed", nextGate: "none" })}\n${V12_9_READINESS_PASS.replace("topology_stability_check: `pass`", "topology_stability_check: `partial`")}`;
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /topology_stability_check=pass/, "check-gate-readiness-passed rejects partial readiness item");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects missing HITL2 decision",
    () => {
      const status = `${statusHeader({ gate: "readiness_passed", wave: "Readiness Check", state: "completed", nextGate: "none" })}\n${READINESS_PASS}`;
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /answerability_class=ready_substantive/, "check-gate-readiness-passed rejects missing HITL2 decision");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects missing human checkpoint readiness item",
    () => {
      const status = `${statusHeader({ gate: "readiness_passed", wave: "Readiness Check", state: "completed", nextGate: "none" })}\n${V12_9_READINESS_PASS.replace("- human_checkpoint_check: `pass`\n", "")}`;
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /human_checkpoint_check=pass/, "check-gate-readiness-passed rejects missing human checkpoint readiness item");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects active queue",
    () => {
      const status = `${statusHeader({ gate: "readiness_passed", wave: "Readiness Check", state: "completed", nextGate: "none" })}\n${V12_9_READINESS_PASS}`;
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue: sequentialQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /queue_health=closed/, "check-gate-readiness-passed rejects active queue");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects wrong closure reason",
    () => {
      const status = `${statusHeader({ gate: "readiness_passed", wave: "Readiness Check", state: "completed", nextGate: "none" })}\n${V12_9_READINESS_PASS}`;
      const queue = closedQueue().replace("closure_reason: `readiness_passed`", "closure_reason: `not_applicable`");
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /closure_reason=readiness_passed/, "check-gate-readiness-passed rejects wrong closure reason");
      });
    },
  ],
];

runIfMain(import.meta.url, tests);
