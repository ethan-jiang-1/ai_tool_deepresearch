---
schema: command-experiment/v2
experiment: iterative-interaction
case: case-714-heavy-user-research-controls
case_goal: "A real Subject Agent captures one natural-language HITL1 research-control brief, preserves its strict exclusion through the durable host-file snapshot, and follows the existing HITL1 handoff without inventing a control or source path."
verdict_mode: all
required_checks: [case-714-natural-control-capture, case-714-durable-snapshot, case-714-no-fabricated-path, case-714-existing-handoff]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: URC-001, URC-002, URC-003
not_run_if: "The independent authenticated Subject Agent runtime or required real search/fetch tools are unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008 -->

# Case 714 - Natural-Language User Research Controls

## Execution Contract

Prepare a fresh production bundle at the legal HITL1 boundary. Only the independent Subject Agent may receive the user turn, write existing HITL1 owners, write the bounded `rb_plan.md## Constraints > User Research Controls` snapshot, run the bounded probe/Gate, and consume a legal handoff. The Playbook Agent may prepare the boundary, retain exact prompt/transcript/result bytes, and run deterministic observation/finalization; it must not write a profile decision, snapshot, path, trace, receipt, or Gate result.

The fixed user turn is:

```text
按建议开始。本轮只使用一手来源；不要把媒体转述当作证据。报告最后单列无法用一手来源验证的结论。
```

The Subject prompt is limited to the current production lifecycle surface and the current user turn. It must not contain the expected snapshot label, a file path, command sequence, expected verdict, or a preconstructed control field.

## Evidence And Verdict

PASS requires deterministic inspection of the real bundle and raw Subject transcript to show all of the following:

- the Subject response precedes the durable supplied-controls snapshot;
- the snapshot uses the exact production label and literal fence, contains the user's strict first-party exclusion, and has no external source path;
- no copied control appears in profile, queue, manifest, result, receipt, or fabricated trace authority;
- the existing HITL1 probe/Gate takes an honest available or unavailable branch, and any legal handoff is consumed through the existing route.

If the independent Agent or real tools are unavailable, finalize `NOT_RUN` with the unavailable reason. Do not create a scripted snapshot or fixture PASS.

## Run

Use the existing iterative-interaction Subject adapter and finalizer pattern from case 711, substituting case id `714` and the fixed user turn above. Preserve the adapter-owned `subject_prompt`, raw `subject_transcript`, and `subject_result` in the verdict bundle before the one native finalizer boundary.
