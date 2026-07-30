# Operate Canonical Topic State

Use this playbook only inside the existing legal HITL1, route-bound HITL2→rerun, or witnessed Seed Topics lifecycle position. It does not create reentry, override, maintenance, or post-final mutation authority.

## Discover The Accepted Input Before Apply

Use the read-only schema operation before authoring a context-specific retained input:

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs schema --context <hitl1|rerun|seed_topics|wave_projection>
```

It returns the available action form, required and optional paths, closed values, nested value shapes, and an illustrative template that the actual top-level `TopicApplyPlanSchema` accepts. It does not read a bundle, infer the current lifecycle window, or authorize an `apply` mutation.

`--help` or `-h` is standalone and exits `0`. The exact non-help forms are `inspect --bundle <bundle>`, `schema --context <context>`, `apply --bundle <bundle> --input <retained-input.json>`, and `recover --bundle <bundle> --operation-id <id>`; unknown, duplicate, mixed, positional, missing-value, or unknown-context forms are code `2` invocation/configuration roots before bundle or workspace access.

When a retained `apply` input reaches the existing Zod validator and is invalid, read `validation_errors[]` and its primary field path. Those details are safe schema expectations, not a new writer or authorization claim: correct only the retained input, run the same `apply`, then run the same applicable inspect/Gate checkpoint. A lifecycle, owner, or missing-writer rejection remains that direct boundary and is not field-level permission to edit another authority.

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle <bundle>
```

If inspect reports an accepted operation, run its exact command and inspect again:

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs recover --bundle <bundle> --operation-id <id>
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle <bundle>
```

For add/intent refinement, retain the approved semantic input outside `_diagnostics/topic-state/`, then apply. For rename/reorder/renumber/safe-remove during sanctioned rerun, edit the complete `layout_baseline` returned by inspect: keep every current UID exactly once in ordered `topics[]` or explicit `remove_topic_uids[]`; the user owns title/order/remove semantics, while the Agent owns mechanical drain/apply/recover.

During a witnessed Seed Topics window only, retain a complete closed enrichment input and use the same apply command. The Engine derives the path and all canonical fields from `topic_uid`; the Agent supplies no canonical keys.

```json
{
  "context": "seed_topics",
  "action": "enrich_seed",
  "topic_uid": "tp_<current_uid>",
  "enrichment": {
    "hypothesis": "explicit gap or Agent judgment",
    "in_scope": "explicit boundary",
    "out_of_scope": "explicit exclusion",
    "search_guardrails": { "required_terms": ["term"], "forbidden_broadening": ["broadening"] },
    "evidence_route": { "preferred_sources": ["source type"], "noise_to_avoid": ["noise"] }
  }
}
```

`input_invalid` means correct the retained input and rerun apply. `frontmatter_invalid` permits only its exact syntax repair, followed by this same writer. Existing legacy body copies are preserved; generic `inspect` never authorizes direct YAML repair or this writer outside the legal window.

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply --bundle <bundle> --input <retained-input.json>
```

## Wave Projection Packet

Inside the exact loaded pre-completion Wave window only, the same writer also
accepts a retained Seed Topic projection packet. It derives the seed path and
heading from `topic_uid` and `slot_id`; never provide a path, heading, token,
line number, raw Markdown, append instruction, or patch.

```json
{
  "context": "wave_projection",
  "action": "apply_seed_projection",
  "topic_uid": "tp_<current_uid>",
  "wave": "wave0",
  "updates": [{
    "slot_id": "wave0_evidence",
    "entries": [
      {
        "source_identity": { "kind": "submitted_work", "work_id": "wu-w0-b001-<kind>-i0001" },
        "entry_id": "wu-w0-b001-<kind>-i0001/1",
        "evidence_meaning": "Agent-authored navigation meaning for the first current candidate",
        "relationship": "supports",
        "refs": ["reference/<existing-file>.md"],
        "status": "supported",
        "next_hop": "Read the concrete reference first"
      },
      {
        "source_identity": { "kind": "submitted_work", "work_id": "wu-w0-b001-<kind>-i0001" },
        "entry_id": "wu-w0-b001-<kind>-i0001/2",
        "evidence_meaning": "The second current candidate has no materializable consumer reference.",
        "relationship": "defers",
        "refs": ["none"],
        "status": "deferred",
        "next_hop": "limitation: no materializable consumer reference is available."
      }
    ]
  }]
}
```

Wave0 is authorized only in `seed_topics_ready -> wave0_complete` and owns
`wave0_evidence`. Wave1 is authorized only in
`wave0_complete -> wave1_complete` and must atomically include
`wave1_mechanisms`, `wave1_trends`, and `pending_questions`. Wave2 is
authorized only in `wave1_complete -> wave2_complete`, always includes
`wave2_judgment`, and may additionally upsert its exact current-round W2F
entry in `pending_questions`. For Wave0, obtain `<work_id>/N` from the existing
contribution-aware Wave0 inspection/preflight result: `N` is the exact global
ordinal that this submitted work unit's contribution owns in the current
validated `artifacts/wave0/<topic>/source.yaml` array. A later legal append has
its own contribution/work ID and owns only its appended interval. Do not
recalculate historical ownership from the mutable full array or treat
`result_hash` as a source-byte snapshot. One work ID may contribute multiple
entries or exact deferred dispositions in one `wave0_evidence` update, and
neither a bare work ID nor one arbitrary ordinal covers the whole source intake.
Wave1 entries use `<work_id>/<positive ordinal>`; Wave2 `entry_id`
equals its exact source `W2F-*` finding resolved to this topic.

The writer preserves every read-only card, consumes a first token or upserts a
stable identity, and stages only the selected seed in its existing workspace.
After a successful apply, run the corresponding same Wave inspect. If inspect
names a Wave0 candidate coordinate, repair only that retained packet entry or
disposition, apply through this writer, and rerun the same inspect. For an
explicit no-consumer-reference outcome, use `relationship: "defers"`,
`status: "deferred"`, `refs: ["none"]`, and a concrete limitation in
`next_hop`. A missing writer window, current authority, canonical binding, or
unique target is an owner/missing-contract boundary; do not hand-edit a seed.

If apply reports active queue/work-unit ownership, resolve it through the existing queue/work-unit inspect, submit, repair, or terminalization owner and rerun the same retained input. Do not hand-edit queue, work-unit, ledger, registry, seed, status, or trace bytes.

### Projection Repair

Use the same Wave inspect after every successful apply. When inspect or apply
fails, repair only the named direct root and rerun that same inspect:

| Inspect or apply root | Direct owner | Next legal action |
| --- | --- | --- |
| Current submitted/W2F authority unavailable | submitted work-unit or finding-index owner | Repair the named authority, rebuild the retained packet, then apply again. |
| `seed_projection_token`, generic prose, field/ref or identity root | Phase Agent's retained packet | Repair only that packet entry, apply it, then rerun the same inspect. |
| `seed_projection_layout_missing` or `seed_projection_layout_ambiguous` | current Seed Topic layout / future explicit migration design | Do not infer a heading or hand-edit bytes; preserve the direct layout root. |
| `wave_projection_not_authorized` | lifecycle/handoff owner | Re-enter through the accepted phase route; a user request does not grant the window. |
| `accepted_workspace` | existing topic-state recover owner | Run the exact reported `operate-topic-state recover`, then rerun apply and the same inspect. |

The document template tells an Agent what a rendered slot and entry look like.
This playbook owns the packet, authorization, writer and repair protocol; do not
copy any of those mechanics into a template or directly edit a Seed Topic.

## Rerun Direction Input

During a sanctioned rerun only, `add_topic` and `update_intent` carry a complete
`direction` object; a direction-only change uses `set_rerun_direction`. This is
an `operate-topic-state apply` input, not part of the initial Seed Topic
template. `rerun_count` equals the accepted profile count plus one. Use `add`
only with `add_topic`; use `supplement` with `update_intent` or
`set_rerun_direction`.

```json
{
  "context": "rerun",
  "actions": [{
    "action": "set_rerun_direction",
    "topic_uid": "tp_<current_uid>",
    "direction": {
      "rerun_count": 1,
      "action": "supplement",
      "new_search_dimensions": "<non-empty Agent-authored guidance>",
      "adjusted_depth": "<non-empty Agent-authored guidance>",
      "search_guardrails": "<non-empty Agent-authored guidance>",
      "rationale_excerpt": "<non-empty excerpt grounded in recorded HITL2 rationale>"
    }
  }]
}
```

The writer renders the resulting `## 本轮重跑方向` fragment atomically in the
affected current seed. Do not hand-edit that fragment. Correct retained input,
apply through this command, then run the reported inspect/gate again.

After a committed add or safe remove changes registry length and the result names the style follow-up, run the existing `apply-research-style.mjs` owner. Then inspect canonical topic state and run the normal gate/status audit. Historical artifact/reference/output paths remain at their recorded provenance coordinates; do not move or rewrite them to match the current slug.

Safe remove is intentionally limited to dependency-free topics with no queue/work-unit/ledger/artifact/reference history. A history blocker means preserve the topic; it is not permission to invent retired state. Post-final fresh apply remains the C5 boundary.
