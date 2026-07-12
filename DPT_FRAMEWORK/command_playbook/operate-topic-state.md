# Operate Canonical Topic State

Use this playbook only inside the existing legal HITL1 or route-bound HITL2→rerun lifecycle position. It does not create reentry, override, maintenance, or post-final mutation authority.

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle <bundle>
```

If inspect reports an accepted operation, run its exact command and inspect again:

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs recover --bundle <bundle> --operation-id <id>
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle <bundle>
```

For add/intent refinement, retain the approved semantic input outside `_diagnostics/topic-state/`, then apply. For rename/reorder/renumber/safe-remove during sanctioned rerun, edit the complete `layout_baseline` returned by inspect: keep every current UID exactly once in ordered `topics[]` or explicit `remove_topic_uids[]`; the user owns title/order/remove semantics, while the Agent owns mechanical drain/apply/recover.

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply --bundle <bundle> --input <retained-input.json>
```

If apply reports active queue/work-unit ownership, resolve it through the existing queue/work-unit inspect, submit, repair, or terminalization owner and rerun the same retained input. Do not hand-edit queue, work-unit, ledger, registry, seed, status, or trace bytes.

After a committed add or safe remove changes registry length and the result names the style follow-up, run the existing `apply-research-style.mjs` owner. Then inspect canonical topic state and run the normal gate/status audit. Historical artifact/reference/output paths remain at their recorded provenance coordinates; do not move or rewrite them to match the current slug.

Safe remove is intentionally limited to dependency-free topics with no queue/work-unit/ledger/artifact/reference history. A history blocker means preserve the topic; it is not permission to invent retired state. Post-final fresh apply remains the C5 boundary.
