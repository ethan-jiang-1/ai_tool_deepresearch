---
bug_id: BUG-207
title: `operate-topic-state schema --context wave_projection` shows `source_identity.kind` closed to `submitted_work`, but wave2_judgment entries require `finding`
severity: P2
phase: wave2
status: open
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-07)
surfaced_at: 2026-08-07
---

# BUG-207: schema projection hides the wave-dependent `source_identity` form

## Observation

`node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs schema --context wave_projection`
reports for `apply_seed_projection`:

```
"updates[].entries[].source_identity.kind": ["submitted_work"]
```

Following that, a Wave2 `wave2_judgment` entry with
`source_identity: { kind: "submitted_work", work_id: "wu-..." }` is rejected:

```
updates[0].entries[0].source_identity — Value violates a declared cross-field constraint.
```

The actual writer (`canonical-topic-state.mjs` `ProjectionSourceIdentitySchema`)
accepts a second kind, `{ kind: "finding", finding_id: "W2F-001" }`, for Wave2
entries, and additionally requires `entry_id === finding_id`. Nothing in the
schema output or the phase prose (`phase-wave2.md` §3.3 just says entry_id is
the W2F id) reveals that the `source_identity` object differs per wave.

This run spent three apply cycles on the wrong `source_identity` shape before
reading engine source to find the `finding` form.

## Why it matters

- The schema command is the "read-only authoring projection" contract, but it
  is misleading for Wave2.
- The generic "declared cross-field constraint" error does not name the legal
  kind (`finding`) or the `entry_id === finding_id` rule.

## Suggested direction

- Make the schema output expose the wave-dependent `source_identity` forms
  (e.g., per-slot allowed kinds), or document the two forms in
  `phase-wave2.md` / the operate-topic-state playbook.
- Improve the cross-field error to name the expected shape.

## Verification

Run `operate-topic-state schema --context wave_projection` and observe only
`submitted_work` is listed; then apply a wave2_judgment packet with
`{ kind: "submitted_work" }` and observe the opaque cross-field rejection.
