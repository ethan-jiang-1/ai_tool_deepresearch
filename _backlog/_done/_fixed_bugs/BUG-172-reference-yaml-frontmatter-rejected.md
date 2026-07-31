---
bug_id: BUG-172
title: Reference .md files with YAML frontmatter are rejected by inspect — only prose body allowed
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
status: resolved
resolved: 2026-07-30
resolved_by: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators
verification: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators/apply-evidence.md
---

# BUG-164: Reference YAML frontmatter rejected

## C1 Disposition (2026-07-30)

Resolved by OpenSpec change `converge-artifact-contract-evaluators` (v0.61).
New rich references use one opening YAML-frontmatter mapping; legacy bullet
metadata remains read-compatible through the shared metadata reader. Malformed
or non-mapping frontmatter now produces one
`reference_metadata_frontmatter_invalid` root instead of field-level cascades.
Focused parser, count, authority, and guidance evidence is retained in the
change's `apply-evidence.md`.

This change does not create submitted output declarations, source/cache trails,
or countability for historical filesystem-only files. Those provenance facts
remain fail-closed and are outside this metadata-presentation repair.

## What happened

Created 9 shared reference files (`reference/00-shared-cross-methodology-*.md`) with standard Jekyll/Hugo-style YAML frontmatter:

```markdown
---
source_url: "https://..."
title: "Shared Reference 1: ..."
retrieved_date: "2026-07-29"
topic_tags: [...]
source_kind: shared_foundation
---
# Heading
```

The `inspect-wave0-output.mjs` rejected ALL 9 files:

```
YAML frontmatter is not allowed in reference/00-shared-cross-methodology-01.md
```

Result: `shared_ref_count_floor`: 0 countable references (threshold: 9), all 9 classified as `filesystem_only_not_backed`.

## Root cause

The reference file format expected by the inspect/gate is plain Markdown prose without YAML delimiters. Metadata must be inline in the body, not in frontmatter. This contradicts:
1. Standard Markdown practice (YAML frontmatter is the convention for document metadata)
2. The `shared-reference-template.md` which the phase's `requires` chain loads (template shows `source_url` as a metadata concept)
3. The seed topic files which DO use YAML frontmatter successfully

## Impact

All 9 shared references were uncountable. Fixing required rewriting each file without frontmatter. Combined with the count floor requirement (9 shared refs), this created a double penalty: not only did I need to create 9 files, but all 9 were silently invalid due to format.

## Expected behavior

Either:
- Accept YAML frontmatter in reference files and parse metadata from it (preferred — consistent with seed_topics/)
- OR the inspect should detect frontmatter and give a clear repair hint: "Remove YAML frontmatter, place metadata as inline Markdown"

**Why:** The current behavior is a silent format rejection with no hint in the task.md or reference template about the required format. The Agent has no way to discover this requirement without triggering the inspect failure.
