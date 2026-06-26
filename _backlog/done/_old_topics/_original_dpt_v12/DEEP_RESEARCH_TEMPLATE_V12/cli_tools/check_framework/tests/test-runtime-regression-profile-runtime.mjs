import {
  assertHasFinding,
  assertNoFindings,
  closedQueue,
  runIfMain,
  sequentialQueue,
  writeReferenceFile,
} from "./test-runtime-harness.mjs";
import { checkGateReadinessPassed } from "../checks/gates/check_gate_readiness_passed.mjs";
import { checkGateWave2Complete } from "../checks/gates/check_gate_wave2_complete.mjs";
import {
  PROFILE_HITL2_READY,
  READINESS_PASS,
  STATUS_HITL2_READY,
  STATUS_HITL2_WAVE2_BRIEF_READY,
  SYNTHESIS_MATRIX_ROW,
  WAVE0_PASS_AUDIT,
  WAVE1_PASS_AUDIT,
  WAVE2_PASS_AUDIT,
  planWithFloors,
  profileFixture,
  statusHeader,
  synthesisArtifactBody,
  withRunFiles,
} from "./test-runtime-regression-profile-fixtures.mjs";

const TRACE_WITH_CHECKPOINT = `
# Trace

### T001 Wave 2 transition checkpoint

- gate_transition: \`wave2_complete -> readiness_passed\`
- evidence_bundle: \`seed_topics/_artifacts/wave2/cross-topic-synthesis.md; seed_topics/_reference/t1-ref.md\`
- queue_consequence: \`readiness local evidence retrieval\`
- status_pointer_sync: \`T001 Wave 2 transition checkpoint\`
`;

function readinessStatus({
  statusHITL2 = STATUS_HITL2_READY,
  wave2 = WAVE2_PASS_AUDIT,
  brief = STATUS_HITL2_WAVE2_BRIEF_READY,
  readiness = READINESS_PASS,
  tracePointer = false,
} = {}) {
  return `${statusHeader({ gate: "readiness_passed", wave: "Readiness Check", state: "completed", nextGate: "none" })}
${tracePointer ? "\n## Trace Pointer\n\n- last_trace_entry: `T001 Wave 2 transition checkpoint`\n" : ""}
${statusHITL2}
${wave2}
${brief}
${readiness}`;
}

function transformHITL2Bundle(transform) {
  return {
    profile: transform(PROFILE_HITL2_READY),
    statusHITL2: transform(STATUS_HITL2_READY),
    wave2: transform(WAVE2_PASS_AUDIT),
    brief: transform(STATUS_HITL2_WAVE2_BRIEF_READY),
  };
}

function transformedReadinessCase(transform, options = {}) {
  const bundle = transformHITL2Bundle(transform);
  return {
    profile: bundle.profile,
    status: readinessStatus({ statusHITL2: bundle.statusHITL2, wave2: bundle.wave2, brief: bundle.brief, ...options }),
  };
}

export const tests = [
  [
    "check-gate-wave2-complete rejects missing PROFILE synthesis FMA coverage",
    () => {
      const status = `${statusHeader({ gate: "wave2_complete", wave: "Wave 2", nextGate: "readiness_passed" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}\n${WAVE2_PASS_AUDIT}\n${SYNTHESIS_MATRIX_ROW}`;
      withRunFiles({ profile: profileFixture(), plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeReferenceFile(runRoot, "seed_topics/_artifacts/wave2/cross-topic-synthesis.md", synthesisArtifactBody());
        assertHasFinding(checkGateWave2Complete(runRoot), /cover PROFILE synthesis FMA id FMA-1/, "check-gate-wave2-complete rejects missing PROFILE synthesis FMA coverage");
      });
    },
  ],
  [
    "check-gate-wave2-complete rejects unknown PROFILE FMA id in matrix",
    () => {
      const badMatrix = SYNTHESIS_MATRIX_ROW.replace("| t1/demo | MA-1 | conclusion", "| t1/demo | FMA-99 | conclusion");
      const status = `${statusHeader({ gate: "wave2_complete", wave: "Wave 2", nextGate: "readiness_passed" })}\n${WAVE0_PASS_AUDIT}\n${WAVE1_PASS_AUDIT}\n${WAVE2_PASS_AUDIT}\n${badMatrix}`;
      withRunFiles({ profile: profileFixture(), plan: planWithFloors(), status }, (runRoot) => {
        writeReferenceFile(runRoot, "seed_topics/_reference/t1-ref.md");
        writeReferenceFile(runRoot, "seed_topics/_artifacts/wave2/cross-topic-synthesis.md", synthesisArtifactBody());
        assertHasFinding(checkGateWave2Complete(runRoot), /unknown PROFILE FMA id: FMA-99/, "check-gate-wave2-complete rejects unknown PROFILE FMA id in matrix");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects invalid final report view",
    () => {
      const { profile, status } = transformedReadinessCase((text) => text.replaceAll("final_report_view: `evidence_map`", "final_report_view: `freeform_map`"));
      withRunFiles({ profile, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /requires concrete HITL2 final_report_view/, "check-gate-readiness-passed rejects invalid final report view");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects invalid HITL2 enum fields",
    () => {
      const { profile, status } = transformedReadinessCase((text) => text
        .replace("answerability_class: `ready_substantive`", "answerability_class: `almost_ready`")
        .replace("human_checkpoint_status: `recorded`", "human_checkpoint_status: `done`")
        .replace("user_decision: `proceed_to_readiness`", "user_decision: `ship_it`"));
      withRunFiles({ profile, status, queue: closedQueue() }, (runRoot) => {
        const findings = checkGateReadinessPassed(runRoot);
        assertHasFinding(findings, /answerability_class has invalid enum value: almost_ready/, "check-gate-readiness-passed rejects invalid answerability_class");
        assertHasFinding(findings, /human_checkpoint_status has invalid enum value: done/, "check-gate-readiness-passed rejects invalid human_checkpoint_status");
        assertHasFinding(findings, /user_decision has invalid enum value: ship_it/, "check-gate-readiness-passed rejects invalid user_decision");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects request_view_revision and requires queue-backed clarification",
    () => {
      const requestRevision = (text) => text.replaceAll("user_decision: `proceed_to_readiness`", "user_decision: `request_view_revision`");
      const missingQueueWork = transformedReadinessCase(requestRevision);
      withRunFiles({ profile: missingQueueWork.profile, status: missingQueueWork.status, queue: closedQueue() }, (runRoot) => {
        const findings = checkGateReadinessPassed(runRoot);
        assertHasFinding(findings, /cannot pass with HITL2 user_decision=request_view_revision/, "request_view_revision blocks Readiness");
        assertHasFinding(findings, /requires concrete queue-backed final report view clarification work/, "request_view_revision requires queue-backed view clarification");
      });

      const queuedClarification = transformedReadinessCase(requestRevision);
      const queue = sequentialQueue().replace(
        "review promoted topic reference and sync Wave 1 inventory",
        "clarify final report view revision with user and record selected synthesis lens",
      );
      withRunFiles({ profile: queuedClarification.profile, status: queuedClarification.status, queue }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /cannot pass with HITL2 user_decision=request_view_revision/, "request_view_revision still cannot enter Readiness when queued");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects HITL2 drift in STATUS Wave 2",
    () => {
      const status = readinessStatus({
        wave2: WAVE2_PASS_AUDIT.replace("final_report_view: `evidence_map`", "final_report_view: `executive_brief`"),
      });
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /STATUS Wave 2 HITL2 final_report_view must match/, "STATUS Wave 2 HITL2 drift fails");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects HITL2 drift in STATUS Wave 2 Human Decision Brief",
    () => {
      const status = readinessStatus({
        brief: STATUS_HITL2_WAVE2_BRIEF_READY.replace("final_report_view: `evidence_map`", "final_report_view: `claim_judgment`"),
      });
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /STATUS Wave 2 Human Decision Brief HITL2 final_report_view must match/, "STATUS Wave 2 Human Decision Brief HITL2 drift fails");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects missing PROFILE HITL2 recorded state",
    () => {
      const profile = PROFILE_HITL2_READY.replace("- hitl2_checkpoint_status: `recorded`\n", "");
      const status = readinessStatus();
      withRunFiles({ profile, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /PROFILE hitl2_checkpoint_status=recorded/, "missing PROFILE HITL2 recorded state fails");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects missing STATUS HITL2 recorded state",
    () => {
      const status = readinessStatus({
        statusHITL2: STATUS_HITL2_READY.replace("- hitl2_wave2_readiness_decision_status: `recorded`\n", ""),
      });
      withRunFiles({ profile: PROFILE_HITL2_READY, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /STATUS hitl2_wave2_readiness_decision_status=recorded/, "missing STATUS HITL2 recorded state fails");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects missing PROFILE HITL2 checkpoint row",
    () => {
      const profile = PROFILE_HITL2_READY.replace(/\| HITL2_wave2_readiness_decision \|[^\n]+\n/, "");
      const status = readinessStatus();
      withRunFiles({ profile, status, queue: closedQueue() }, (runRoot) => {
        assertHasFinding(checkGateReadinessPassed(runRoot), /must include HITL2_wave2_readiness_decision row/, "missing PROFILE HITL2 checkpoint row fails");
      });
    },
  ],
  [
    "check-gate-readiness-passed accepts profile_default final directory mapping",
    () => {
      const { profile, status } = transformedReadinessCase(
        (text) => text
          .replaceAll("final_report_view: `evidence_map`", "final_report_view: `profile_default`")
          .replaceAll("final_output_dir: `final_evidence_map`", "final_output_dir: `final`"),
        { tracePointer: true },
      );
      withRunFiles({ profile, status, queue: closedQueue(), trace: TRACE_WITH_CHECKPOINT }, (runRoot) => {
        assertNoFindings(checkGateReadinessPassed(runRoot), "profile_default maps to final/");
      });
    },
  ],
  [
    "check-gate-readiness-passed accepts deterministic named final directory mapping",
    () => {
      const { profile, status } = transformedReadinessCase(
        (text) => text
          .replaceAll("final_report_view: `evidence_map`", "final_report_view: `executive_brief`")
          .replaceAll("final_output_dir: `final_evidence_map`", "final_output_dir: `final_executive_brief`"),
        { tracePointer: true },
      );
      withRunFiles({ profile, status, queue: closedQueue(), trace: TRACE_WITH_CHECKPOINT }, (runRoot) => {
        assertNoFindings(checkGateReadinessPassed(runRoot), "executive_brief maps to final_executive_brief/");
      });
    },
  ],
  [
    "check-gate-readiness-passed rejects custom final view without label and slug",
    () => {
      const { profile, status } = transformedReadinessCase((text) => text
        .replaceAll("final_report_view: `evidence_map`", "final_report_view: `custom`")
        .replaceAll("final_output_dir: `final_evidence_map`", "final_output_dir: `final_custom_risk-view`"));
      withRunFiles({ profile, status, queue: closedQueue() }, (runRoot) => {
        const findings = checkGateReadinessPassed(runRoot);
        assertHasFinding(findings, /requires concrete custom_final_report_view_label/, "custom view requires label");
        assertHasFinding(findings, /requires custom_final_report_view_slug as a lowercase slug/, "custom view requires slug");
      });
    },
  ],
];

runIfMain(import.meta.url, tests);
