---
bug_id: BUG-156
title: enter-phase output overload — concatenates all shared files into single 36KB+ output
severity: P2
phase: hitl1, setup, seed-topics
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29)
surfaced_at: 2026-07-29
---

# BUG-156: enter-phase output overload

## What happened

`enter-phase.mjs` loads ALL `requires` shared files PLUS the target phase Markdown into one concatenated output. For `phase-hitl1.md`, this produced ~36KB / 491 lines of output. The `<!-- DPT_CONTINUATION_CUE -->` block (the critical routing instruction) is buried at line 486-490 — the Agent must read through ~480 lines of shared profile schema documentation before finding the actual phase entry point.

## Concrete example

`enter-phase --node phases/phase-hitl1.md` loaded:
- `shared/shared-profile.md` (~350 lines of field reference)
- Other shared files
- `phases/phase-hitl1.md` (the actual target)

The Bash output was so large (36.2KB) it triggered `<persisted-output>` truncation, requiring a second `Read` call to find the continuation cue.

## Impact

Every phase transition requires:
1. Run `enter-phase` → get truncated/massive output
2. Read the persisted output file with offset to find the continuation cue
3. Parse the cue to know what to do next

This adds ~1-2 extra tool calls per phase transition (× 4 transitions so far = ~4-8 wasted turns).

## Expected behavior

`enter-phase` should output a concise summary with:
- The loaded phase file path
- The continuation cue (always visible, never buried)
- A manifest of loaded shared files (names only, not full content)

The full shared file content should be available via a separate mechanism (e.g., `--verbose` flag or a separate `load-shared` command) rather than always concatenated.

**Why:** The current output design treats the Agent's context window as infinite. In practice, large outputs trigger truncation and require secondary reads, slowing every phase transition.

**How to apply:** Refactor `enter-phase.mjs` to emit a structured summary by default, with full content behind a flag. The shared files are already loaded by the phase's `requires` frontmatter — the Agent can read them independently when needed.

## C3 Disposition (2026-07-30)

C3 changes default successful entry presentation to cue first, then the exact existing source-gate `advance-status` command, the target `## 0. Execution Brief`, and an ordered target-excluding dependency manifest. The complete loaded closure remains available only with `--full`; the bounded view does not introduce a loader, scheduler, status writer, or target-work-completion claim.
