---
node_type: shared
id: shared-return-map-authoring
shared_scope: return-map-authoring
authority: guidance-only
execution_contract:
  surface: shared-guidance
  search_policy: no_search
requires: []
suggested_context: []
---

# Shared: Return-Map Authoring (Compatibility Pointer)

The Seed Topic card and entry presentation moved to
`templates/seed-topic-template.md`. Projection Packet and repair mechanics
belong to `command_playbook/operate-topic-state.md`. This pointer intentionally
defines no second entry grammar, slot ownership, token lifecycle, or writer
path.

For Wave0, `<work_id>/N` names the `N`th position in the current
result-declared, schema-valid `artifacts/wave0/<topic>/source.yaml` array. It
is a current projection coordinate, not a permanent `result_hash` snapshot or
source authority; one source intake may therefore need several exact entries or
identity-bound deferred dispositions. Use the template for entry shape and the
existing playbook for the one legal packet/apply/inspect loop.
