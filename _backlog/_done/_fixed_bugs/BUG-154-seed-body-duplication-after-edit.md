---
bug_id: BUG-154
title: Seed topic body duplication after Agent Edit — old template content persists below enrichment
severity: P2
phase: seed-topics
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-154: Seed topic body duplication after Agent Edit

## What happened

`instantiate-run-bundle.mjs` creates seed topic files with the full template skeleton, including body initialization sections with `pending` placeholders AND the appendix slot section. When the Agent uses `Edit` to replace the first `pending` block with enrichment content, the old template's duplicate body sections further down persist:

```markdown
## 初始假设、缺口或张力
**已知**：SDD 的核心要素包括...   ← Agent's enrichment

## why now
- GitHub Spec Kit 2025 年底发布...   ← Agent's enrichment

(... appendix slots ...)

## 初始假设、缺口或张力
**已知**：pending — derive only from...  ← OLD template ghost
**缺口**：pending — identify what Wave0...
```

## Root cause

The seed topic template from `instantiate-run-bundle.mjs` generates BOTH:
1. The initialization skeleton (body sections with `pending` markers)
2. The appendix slot section with backfill tokens

These are concatenated into one file. The Agent's `Edit` operation replaces the first occurrence but cannot distinguish between "initialization area" and "appendix area." The old `pending` sections after the appendix become unreachable orphan content.

The Engine's `enrich_seed` apply only writes frontmatter — it does not touch the body at all, so body duplication is never repaired.

## Impact

Seed topic files carry orphan `pending` sections that confuse Wave0 sub-agents reading search constraints. The gate checks frontmatter completeness only (`frontmatter_completeness`), not body duplication, so this passes structural gates silently.

## Expected behavior

Option A: The template should mark a clear boundary between "Agent-editable initialization area" and "read-only appendix area" (e.g., a `<!-- AGENT_EDIT_BOUNDARY -->` comment), and the Engine should reject or warn on content below that boundary.

Option B: `enrich_seed` apply should also rewrite the body initialization area, clearing old `pending` markers.

**Why:** The current template design assumes the Agent will write the entire body in one pass, but the `Edit` tool operates on substring matches. The mismatch between tool capability and template design creates persistent content debt.

**How to apply:** Short-term: add a `<!-- INITIALIZATION_END -->` marker to the template and have the gate's agent verification (`content_has_all_sections`) check that no `pending —` text exists below it. Long-term: have the Engine regenerate the full body from template + enrichment during `enrich_seed` apply.

## C2 disposition (2026-07-30)

Fixed for newly rendered canonical seeds. The renderer and shared template now
place one stable `seed-initialization` start/end region before the Engine-owned
research appendix. `seed-topics-ready` checks current-marker seeds for
renderer-owned initialization headings or pending markers below that end
boundary; `enrich_seed` still preserves body ownership rather than becoming a
general body-rewrite API.

Verification coordinates:

- `tests/engine/helpers/canonical-topic-state.test.mjs`
- `tests/integration/cli/check-gate-seed-topics-ready.test.mjs`
- `tests/integration/cli/operate-topic-state-seed-enrichment.test.mjs`
- `tests/integration/md/seed-topic-projection-document-contract.test.mjs`

Pre-C2 seeds without the current markers remain readable, including historical
duplicate body prose. C2 deliberately does not infer authority from those bytes
or bulk-migrate them.
