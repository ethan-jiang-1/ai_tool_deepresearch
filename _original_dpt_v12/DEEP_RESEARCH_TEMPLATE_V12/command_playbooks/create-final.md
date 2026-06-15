---
title: "Create Final"
role: "final interpretation output command"
scope: "create final or view-specific final deliverables after research readiness"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/METHODOLOGY.md"
  - "specs/WORK_DIRECTORY_LAYOUT.md"
writes:
  - "<FINAL_DIR>/*"
---

# Create Final

This command creates the final interpretation output after the research run has enough evidence and synthesis to support a deliverable.

Final output is outside `_framework/` and outside process artifacts. It is the user-facing interpretation layer built from local references, topic artifacts, and Wave 2 synthesis.

## Directory Naming

Use the `final_output_dir` recorded by HITL2. The mapping is deterministic:

```text
profile_default       -> RUN_DIR/final/
executive_brief       -> RUN_DIR/final_executive_brief/
evidence_map          -> RUN_DIR/final_evidence_map/
claim_judgment        -> RUN_DIR/final_claim_judgment/
technical_deep_dive   -> RUN_DIR/final_technical_deep_dive/
custom                -> RUN_DIR/final_custom_{custom_final_report_view_slug}/
```

For `custom`, HITL2 must also record `custom_final_report_view_label` and `custom_final_report_view_slug`. Do not invent or re-slug the directory during finalization.

## Preconditions

- Use `STATUS_PATH` and `QUEUE_PATH` to confirm the run is ready for finalization.
- Create final output only after `current_gate=readiness_passed` and Readiness Check `overall_status=pass`.
- Confirm `TRACE_PATH` contains the distinct Readiness closeout checkpoint whose `gate_transition` value is `readiness_passed`, the earlier Wave 0/1/2 transition checkpoints are still present as distinct non-correction entries, `STATUS_PATH -> Trace Pointer.last_trace_entry` points to the Readiness closeout checkpoint, and the queue is closed through `queue_health=closed` rather than an `await user review` task.
- Confirm `ARTIFACT_DIR/wave2/cross-topic-synthesis.md` exists, the Cross-Topic Conclusion Matrix is populated, confirmed `answer_phase=wave2_synthesis` must-answer entries are covered or explicitly not required, and high-leverage final claims can be traced to local reference paths rather than short ids or chat memory.
- Confirm `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision` records the HITL2 decision and `STATUS_PATH -> Human Decision Checkpoints`, `STATUS_PATH -> Wave 2`, and `STATUS_PATH -> Wave 2 Human Decision Brief` mirror it with `PROFILE hitl2_checkpoint_status=recorded`, `STATUS Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded`, the PROFILE Human Decision Checkpoints `HITL2_wave2_readiness_decision` row `status=recorded`, `human_checkpoint_status=recorded`, `answerability_class=ready_substantive` or `ready_insufficient_judgment`, `user_decision=proceed_to_readiness`, a concrete `final_report_view`, and a mapped `final_output_dir`.
- If the HITL2 decision is missing, pending, `request_view_revision`, `blocked_repair_required`, `repair_and_rerun`, or `stop_blocked`, do not create final output. Route back to Wave 2 human decision, view clarification, topology repair, Wave 1 evidence repair, or Wave 2 synthesis work as recorded in `repair_recommendation`.
- If `final_report_view=custom`, confirm `custom_final_report_view_label` and `custom_final_report_view_slug` are both recorded and that `final_output_dir` ends in `final_custom_{custom_final_report_view_slug}` after replacing the brace placeholder with the concrete recorded slug.
- If finalization exposes a substantive evidence gap, do not paper it over in final prose. Reopen or refill the affected earlier gate and queue the repair.
- Final output must cite local evidence from `RUN_DIR/seed_topics/_reference/` and derived artifacts from `RUN_DIR/seed_topics/_artifacts/` where relevant.

## Output Shape

Use the final directory for view-specific interpretive files such as:

```text
README.md
00-*.md
01-*.md
02-*.md
...
evidence-map.md
```

The exact file count is deliverable-specific. Numbered markdown files are preferred when the final output is a multi-part interpretation. The view, ordering, and synthesis lens must follow the recorded HITL2 `final_report_view`; a custom view must preserve the recorded `custom_final_report_view_label` and use the recorded slug only for the directory name.

## Boundaries

- HITL2-mapped final directories are not gate evidence.
- They do not replace `STATUS_PATH` gate audits.
- They do not count as references.
- They do not replace topic artifacts.
- They must not be written into `_framework/`.

## Stop Condition

Stop when the final directory contains a coherent interpretation for the requested view, the output can be traced to local references/artifacts, and any discovered evidence gaps have either been repaired through the normal queue/gate path or explicitly recorded as limitations with confidence consequences.
