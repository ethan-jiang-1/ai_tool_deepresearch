---
bug_id: BUG-211
title: Wave1 canonical reference filename is a hidden deterministic contract (token + 12-hex digest)
severity: P3
phase: wave1
status: open
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-07)
surfaced_at: 2026-08-07
---

# BUG-211: Wave1 reference materialization requires the canonical filename or it does not "close"

## Observation

Wave1 Phase-owned reference materialization failed to converge for an entire
pass because the materialized files used descriptive slugs, e.g.
`reference/01_agentscope-platform-2aran-com-multi-agent-frameworks-c.md`,
instead of the canonical form the inspect derives:

```
reference/{topic.slug}-{host+path-token-48}-{sha256(url).slice(0,12)}.md
```

e.g. `reference/01_agentscope-platform-2aran-com-articles-research-topics-multi-agent-f-1e5d1155cfaa.md`.

`inspect-wave1-output.mjs` (`wave1-reference-convergence.mjs#canonicalWave1ReferencePath`)
only counts a reference file whose relPath exactly equals that computed path and
whose body cites the candidate's source/cache/work-unit refs. Plausible-but-
non-canonical names are ignored ("materialize_projection: N candidates without
a closed canonical projection"), and the hint lists the exact `write_to`
targets — but the naming algorithm is documented only in engine source, not in
`phase-wave1.md` §3.2.2 or `shared-reference-template.md`.

This run materialized 60 references with the wrong names first, then had to
remove them and re-materialize 52 at the inspect-provided canonical paths.

## Why it matters

- The phase node tells the Phase Agent to materialize
  `reference/{topic.slug}-<source-slug>.md` but does not define how
  `<source-slug>` is computed; the inspect is the only authority, and it is
  verbose to read.
- The failure message ("without a closed canonical projection") does not say
  "your filenames must match this deterministic form."

## Suggested direction

- Document the canonical path derivation (`{slug}-{host+path token}-{12-hex}`)
  in `phase-wave1.md` / `shared-reference-template.md`, or have the inspect
  emit one explicit "canonical name for this candidate is …" line per candidate.

## Verification

Materialize a Wave1 topic reference with any non-canonical name, run
`inspect-wave1-output.mjs` → candidate remains unclosed; only the exact
computed path closes it.
