# Post-Final Rerun Recovery

Agent-facing narrow recovery path for an explicit evidence-expanding user
decision to rerun after legal Final delivery. Presentation-only feedback about
reader, structure, length, wording, emphasis, or existing verified evidence
stays in `phases/phase-final.md`: prepare retained staging and publish the next
immutable primary version there. Do not create or apply a C5 request for that
feedback.

## Boundary

- User owns only the new rerun semantics/risk decision and any host-required non-delegable approval.
- This operation is only for a request that needs new sources, Topics, evidence,
  research conclusions, or a research-profile change. It does not classify free-form
  chat; the Final Agent makes that bounded semantic distinction from the current
  request and verified research boundary.
- Request metadata is semantic/audit input plus optimistic concurrency; it is not verified identity, permission, `--human-directed`, `--override`, or `--force`.
- Agent owns every remaining legal mechanical step.
- Final remains terminal. This operation does not create a Final loop, outgoing Final edge, generic repair, state-seed, addendum namespace, or direct topic/status mutation.

## 1. Inspect

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs inspect --bundle <bundle>
```

Read `verdict`, `reason_code`, `facts.request_bindings`, and the single `next_action`.

- `eligible`: retain one request using the exact inspect bindings.
- `recover_required`: run the exact operation-bound recover command; do not submit new semantics.
- `unchanged`: continue from the returned accepted stage action.
- `blocked`: resolve only the named owner/boundary. If the rerun limit is exhausted, ask only whether to start a new bundle; after that decision execution returns to the Agent.

## 2. Retain Request

```json
{
  "schema_version": "1.0.0",
  "action": "post_final_rerun",
  "reason": "<decided reason>",
  "requested_scope": "<decided scope>",
  "expected_bundle_identity": "<copy object from inspect facts.request_bindings>",
  "expected_final_lineage": "<copy object from inspect facts.request_bindings>"
}
```

Keep the file until `apply` returns `committed|unchanged` or exact recovery finishes.

## 3. Apply Or Exact Recover

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs apply --bundle <bundle> --input <request.json>
node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs recover --bundle <bundle> --operation-id <operation-id>
```

`committed` means profile/event durability only, not rerun completion. An accepted workspace always owns recovery until cleanup.

## 4. Consume Existing Rerun Owners

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <bundle> --node phases/phase-rerun.md
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <bundle> --to hitl2_recorded
node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle <bundle> --at hitl2_recorded
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs inspect --bundle <bundle>
```

Then follow `phase-rerun.md`: existing topic-state apply/recover, rerun-count increment, rerun-ready gate, `enter-phase <check.next>`, and `advance-status --to rerun_ready`.

`check-reentry --at phase-rerun` means `rerun_ready` has already passed. Immediately after C5 entry/status sync, the correct incoming checkpoint is `hitl2_recorded`.
