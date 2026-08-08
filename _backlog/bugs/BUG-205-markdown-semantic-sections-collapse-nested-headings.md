---
bug_id: BUG-205
title: markdown semantic-section parser treats nested headings as boundaries, making `## Key Findings` with `###` subsections appear empty
severity: P2
phase: wave1
status: open
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-07)
surfaced_at: 2026-08-07
---

# BUG-205: `key_findings_missing_or_empty` rejects evidence summaries whose findings live under `###` subsections

## Observation

In Wave1 (run `dpt_rb_enterprise-ai-harness-platforms`), two of five submitted
`evidence-summary.md` files were rejected at work-unit `dry-submit` with
`key_findings_missing_or_empty`, even though the file visibly contained a
`## Key Findings` section with substantial `### 1. 核心机制理解` … `### 4. 企业采用证据`
subsections.

Root cause: `markdown-semantic-sections.mjs#parseMarkdownSemanticSections`
treats *every* heading level (`#{1,6}`) as a section boundary. For

```markdown
## Key Findings

### 1. 核心机制理解
...
```

the `key findings` section body is everything between `## Key Findings` and the
next heading — i.e. empty. The evaluator (`direct-output-contract.mjs`
`evaluateEvidenceSummary`) then reports `key_findings_missing_or_empty`.

Workaround (applied): inject a non-empty summary paragraph directly under
`## Key Findings` before the `###` subsections. The workaround is undocumented
and easy to miss; the sub-agent that authored the file produced a natural
`###`-subsection layout and was rejected.

## Why it matters

- The Wave1 phase node and `subagent-dpt-evidence-extractor` guidance describe
  Key Findings as a required semantic section but do not warn that nested
  `###` headings make it "empty" to the evaluator.
- The parser's "semantic section = any heading level" rule conflicts with the
  natural authoring structure (subsectioned Key Findings).
- 2/5 topics in this run hit it; each required a manual repair of an
  actor-authored file.

## Suggested direction (not an implementation decision)

Either (a) make the semantic-section body include nested-subsection content
(e.g., keep the direct body *and* the descendant `###`-section bodies), or (b)
document the constraint and have the sub-agent prompt instruct actors to put a
summary paragraph directly under `## Key Findings`.

## Verification

Reproduce: write an `evidence-summary.md` whose `## Key Findings` contains only
`###` subsections and no direct text; run the work-unit `dry-submit` for a
`wave1_topic_deepening` claim → `key_findings_missing_or_empty`.
