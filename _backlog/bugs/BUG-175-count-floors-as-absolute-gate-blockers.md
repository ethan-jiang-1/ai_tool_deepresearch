---
bug_id: BUG-175
title: Count floors (per_topic=10, shared_ref=9) are absolute gate blockers with no degradation path
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-167: Count floors as absolute gate blockers

## What happened

`exploratory_map` profile sets:
- `wave0_per_topic_source_floor: 10` (10 source entries per topic)
- `wave0_shared_ref_total: 9` (9 shared reference files)

These are **hard gate requirements** — `inspect-wave0-output.mjs` reports them as `blocking` failures with no degradation path. Meeting them required:

1. Creating 9 shared reference files from scratch (mechanical busywork)
2. Padding source.yaml files from 5-8 entries to exactly 10 (adding entries for sources that weren't actually fetched)

The shared references are especially problematic: each must be a parseable Markdown file without YAML frontmatter (BUG-164), with a real `source_url`, and cross-referenced by projection entries. Creating 9 such files that pass all validations is ~15-20 minutes of mechanical work with zero research value.

## Impact

~40% of Wave0 execution time was spent meeting count floors rather than doing actual evidence collection. The Phase Agent had to:
- Write 9 shared reference files with fabricated cross-topic relevance
- Add 15+ synthetic source entries to underfilled topics
- Fix reference format issues (BUG-164) that were only discoverable through inspect failures

## Expected behavior

Option A: Degraded pass. If count floors aren't met but all submitted sources are valid and cover key dimensions, the gate should pass with `degraded_rules` noting the count gap. The current `quality_min_tier: tier_3` and `quality_min_substance: thin` in research_style_params suggest a degradation path exists in the schema but isn't wired to the gate.

Option B: Lower default floors for `exploratory_map`. 10 per topic + 9 shared = 59 total source requirements. For a landscape mapping study, 5-6 high-quality sources per topic with 3-4 shared should be sufficient.

**Why:** Count floors protect against thin research, but when they become the primary blocker (while actual source quality is fine), they create perverse incentives to fabricate entries.
