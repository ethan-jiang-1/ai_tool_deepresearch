# Post-Final Rerun Recovery

Agent-facing narrow recovery path for an explicit evidence-expanding user
decision to rerun after legal Final delivery. Presentation-only feedback about
reader, structure, length, wording, emphasis, or existing verified evidence
stays in `phases/phase-final.md`: prepare retained staging and apply a
presentation revision — `publish-final-report --polish` CAS-updates the current
latest primary bytes with the version number unchanged (see
`command_playbook/persist-artifact.md`). Do not create or apply a
ReopenResearchPass request for that feedback; only an evidence-expanding
request uses this rerun path and a new global version.

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

## 1.5 Intake From A Dig List

When the current run bundle's `_diagnostics/` contains an Agent-authored
next-dig-list, form the rerun scope from it before drafting the retained
request. The normative intake rules — reading the latest list, the
tier-structured bounded scope proposal, declared dead-hole exclusion, the
user-owned correction step, and the non-authority boundary — are owned by
`openspec/specs/research/post-final-recovery/spec.md` requirement "Post-final
rerun intake guidance structures scope formation from a diagnostics dig-list".
This playbook keeps only the operating sequence: read the latest next-dig-list
(skip this section when absent) → propose one bounded scope organized by the
list's priority tiers, referencing selected item identifiers → let the user
correct the proposal → record the finally selected identifiers in
`requested_scope` and, when the reason carries a focus, `reason` per §2.

## 2. Retain Request

If the accepted evidence-expanding request adds or revises a research focus,
resolve any material ambiguity and let the user correct the Agent's concise
interpretation before `apply`. Put exactly these two visibly labelled parts in
the existing multiline `reason` string:

```text
用户的重点原话（逐字保留）：
<only the accepted wording directly relevant to this research expansion>

Agent 对本轮额外研究方向的理解（可由用户修正）：
<the accepted corrected, bounded interpretation>
```

The first part faithfully retains the accepted normalized focus wording, not
the whole Final conversation. Existing LF normalization, outer trim, and NUL
rejection still apply, so “逐字保留” does not promise CRLF or outer-whitespace
preservation. Keep `requested_scope` separate and bounded. The Engine validates
the existing request shape/lineage only; it does not parse these labels,
classify focus, compare the two parts, or infer permission. When an
evidence-expanding rerun has no new or revised focus, retain the existing
ordinary non-empty `reason` contract without empty labels.

```json
{
  "schema_version": "1.0.0",
  "action": "post_final_rerun",
  "reason": "<ordinary decided reason, or the accepted labelled multiline focus reason above>",
  "requested_scope": "<decided scope>",
  "expected_bundle_identity": "<copy object from inspect facts.request_bindings>",
  "expected_final_lineage": "<copy object from inspect facts.request_bindings>"
}
```

Keep the file until `apply` returns `committed|unchanged` or exact recovery finishes.
Do not add a focus object or field, label parser, permission inference,
serializer/event/workspace change, or second rerun route.

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

`--at` accepts a gate enum (e.g. `hitl2_recorded`) or a phase ref (e.g.
`phase-rerun`); see the check-reentry contract for the exact mechanics. The
post-final entry-target semantics — why `hitl2_recorded` is the correct
incoming checkpoint right after entry/status sync, and how to read the phase
ref — are owned by `openspec/specs/research/post-final-recovery/spec.md`
(POF-006).
