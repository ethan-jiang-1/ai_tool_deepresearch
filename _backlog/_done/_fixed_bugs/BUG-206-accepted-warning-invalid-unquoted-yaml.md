---
bug_id: BUG-206
title: reference `acceptance_status: accepted :warning:` is invalid as unquoted YAML but the template documents it as a plain value
severity: P2
phase: wave0
status: fixed
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-07)
surfaced_at: 2026-08-07
---

# BUG-206: `acceptance_status: accepted :warning:` breaks reference frontmatter YAML

## Observation

`shared-reference-template.md` documents `acceptance_status` values as
`accepted` / `accepted :warning:` / `EXCLUDED`. Writing it verbatim:

```yaml
acceptance_status: accepted :warning:
```

is **not valid YAML**: the `: ` inside `:warning:` is a mapping indicator, so
the parser fails with a generic "YAML parse failed: Unexpected scalar at node
end" at line 7. The value must be quoted: `acceptance_status: "accepted :warning:"`.

In this run the Wave0 shared-reference materialization (8 files) and the Wave1
topic-reference materialization (8 degraded-source files) both hit this.
`parseReferenceMetadata` returned an empty map, which cascaded into
`reference_index_layer_unclassifiable` / `wave0_reference_backing` /
`per_topic_ref_md_count_floor` failures whose messages did **not** name the
quoting issue.

## Why it matters

- The template presents a value that fails when used literally — a spec-to-YAML
  foot-gun.
- The failure surfaces as a downstream topic-binding/index error, not as a
  frontmatter-format error pointing at the value.

## Suggested direction

- Document in `shared-reference-template.md` that `accepted :warning:` MUST be
  quoted (or accept a quote-free variant such as `accepted_warning`).
- Consider having the reference-frontmatter error message name the offending
  key/value so the quoting fix is obvious.

## Verification

Write a `reference/*.md` with `acceptance_status: accepted :warning:` (unquoted)
and run `sync-reference-index.mjs` → index blocked on frontmatter parse;
`parseReferenceMetadata` returns an empty map.
