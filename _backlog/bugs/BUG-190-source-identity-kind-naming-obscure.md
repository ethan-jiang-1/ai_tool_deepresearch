# BUG-190: source_identity.kind discriminator "submitted_work" is non-obvious

**Status**: open
**Severity**: P2 — UX friction; easily corrected but wastes time
**Found**: 2026-08-03 during `agentic-rd-org-delivery-systems-2026` Wave0 execution

## Symptom

When creating wave_projection packets for `operate-topic-state.mjs apply`, the natural value for `source_identity.kind` is `work_unit` (matching the `work_id` field name and the ubiquitous "work unit" terminology throughout the framework). Using `work_unit` returns:

```
validation_errors: [{path: "updates[0].entries[0].source_identity.kind", code: "invalid_union_discriminator"}]
```

The correct value is `submitted_work`, which is not discoverable from the error message or surrounding context. The Agent must run `operate-topic-state.mjs schema --context wave_projection` and inspect `closed_values` to find the valid discriminator.

## Root cause

The schema discriminator `submitted_work` uses a different naming convention than the surrounding vocabulary (`work_id`, `work_unit`, `operate-work-unit`). The error message says "invalid_union_discriminator" but does not list valid values.

## Impact

Every Agent encountering this for the first time will waste 1-3 repair cycles discovering the correct discriminator. With 5 topics × 1 projection each, this cost multiplies.

## Expected behavior

Either:
- Accept `work_unit` as an alias for `submitted_work`, OR
- Error message should list valid discriminator values: "Expected one of: submitted_work", OR
- Rename discriminator to `work_unit` for consistency with the rest of the framework vocabulary
