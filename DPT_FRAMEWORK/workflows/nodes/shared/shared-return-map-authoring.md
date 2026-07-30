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

For Wave0, obtain `<work_id>/N` from the contribution-aware Wave0
inspection/preflight result. `N` is the exact global ordinal owned by that
submitted contribution in the current validated
`artifacts/wave0/<topic>/source.yaml` array. A later legal append has its own
contribution/work ID and owns only its appended interval; do not infer history
from the mutable full array or `result_hash`. One contribution may therefore
need several exact entries or identity-bound deferred dispositions. Use the
template for entry shape and the existing playbook for the one legal
packet/apply/inspect loop.
