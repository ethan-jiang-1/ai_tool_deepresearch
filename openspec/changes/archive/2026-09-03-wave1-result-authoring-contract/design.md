# Design: Wave1 Result-Authoring Contract — Generated Value-Domain Guidance And Dry-Submit Diagnostics

## Context

See proposal.md — Why. Two engine seams, both deterministic and Agent-facing by construction:

1. **Generated authoring guidance** (`DEEP_RESEARCH_HARNESS/engine/work-unit-envelope.mjs`): the per-attempt
   `task.md` Completion Contract (「Cache And Source Facts」/source-claim bullets, ~:472-483) already names
   some constraints (`source_ref may name only a current declared output or an authorized prior submitted
   output`) but omits the leaf-directory rule for cache/degraded refs, the no-slug/no-file-path value
   domains, the leaf-url authority for claim.url, and any accepted positive example. Wave1 rerun evidence:
   five of six agents independently guessed wrong values (G1-G4), and dry-submit was the only correction
   point.

2. **Dry-submit claim diagnostics** (`DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs`
   `validateSourceClaims`, ~:735-841): it already emits per-claim repair errors carrying `json_pointer` and
   recorded leaf urls (BUG-242 / DEW-028), but it does not count duplicate accepted claims for one URL
   (G3), so a 16-claim/4-URL result forces the Agent to hand-diff counts.

## Goals / Non-Goals

**Goals:**
- Generated task guidance states the exact value domains once, per assignment, in the place the actor reads
  first, plus a compact accepted+degraded positive example.
- dry-submit `invalid_result` reports how many accepted claims repeat a URL when duplicates exist, so repair
  is one deterministic edit instead of manual counting.

**Non-Goals:**
- No schema field additions/removals; no verdict-semantics change (duplicates remain valid schema-wise until
  this diagnostic — we only *report* counts, consistent with DEW-028's "verdict SHALL NOT change" pattern;
  the existing accepted_source_urls↔claims consistency checks keep their behavior).
- No change to `shared-subagent-protocol.md` canonical text; the example lives in engine-generated task.md
  so it is assignment-conditioned (accepted+degraded wording differs by kind/contract).
- No run-bundle mutation, no new CLI, no dependency.

## Decisions

### D1 — Value-domain guidance is generated, not a static doc

Envelope text is built from the actual `manifest.output_contract`/`cache_policy` (leaf set, page rule,
allowed meta fields) and `result.schema`; the new bullets are appended **only when
`outputContract.source_claims.allowed === true`**, and the positive example is derived from the same
declared cache policy + an example output path, never hardcoded prose that could drift from the contract.
Rationale: this is the same generated-vs-authoritative boundary the Completion Contract already declares
("manifest, beacon, result schema, receipt, validators, and submit remain authoritative"); a static doc
would be a second source of truth.

### D2 — Duplicate-claim counting is a read-only diagnostic in validateSourceClaims

When iterating accepted claims, keep a URL→count map and, on finishing, if any accepted URL has count > 1,
raise one `invalid_result`-style repair error naming the URL, its claim count, and the JSON pointer range
(`/source_claims/{first..last}` indexes). The check is placed after per-claim ref validation so existing
higher-priority violations still surface first (deterministic ordering preserved). Claim URLs are compared
through the existing `normalizeUrlForSourceCache` used elsewhere in the function, so `?query`/www variants
count as the same URL the way the accepted-URL membership check already does.

### D3 — Example fragment stays small and contract-derived

The accepted+degraded example mirrors the two legal outlets of the source-claim contract: one accepted claim
with `cache_trail_refs: [<declared leaf dir>]`, and one degraded claim with
`degraded_capture_ref: <declared leaf dir>` (leaf whose page.md carries the explicit degraded record), each
with `source_ref` = an assigned output path. This shows the two shapes that G1/G2/G4 describe without
teaching a third.

### D4 — Semantic-precision reflection (touched surfaces: generated task authoring view + dry-submit diagnostic)

- **Reader / bounded question**: the generated task's「Cache And Source Facts」answers "what values may
  `cache_trail_refs[]`/`degraded_capture_ref`/`source_ref`/claim.url take?" The answer must be the closed
  value domains enforced by the validators — leaf **directories** (not `<leaf>/page.md`), current assigned
  output paths or authorized prior outputs (not slugs), leaf-recorded URLs. The five failed Wave1 agents
  each answered differently because the generated guidance named the constraint only half-way.
- **Distinction that must be preserved**: refs point at *declared cache leaf directories*; source_ref points
  at *declared output paths*; claim.url points at *the fetched URL the leaf records*. These three are
  different coordinate spaces — the gotchas were agents collapsing them into one space.
- **Normal reasoning stop**: dry-submit rejects with per-claim `json_pointer` repair errors; this change
  makes the rejection carry the duplicate-claim count (enrichment only) and makes the *generated guidance*
  state the domains up front, so the actor self-checks before work_done. No new acceptance verdict, no new
  repair route.
- **Net simplification**: guidance states the rule once in the place actors read; diagnostics remove the
  hand-diff step. No new module/state/status. Direct Source of Record unchanged: manifest output contract +
  cache policy (guidance derives from them); validators remain the enforcement boundary. Helper-oriented:
  engine emits deterministic guidance/diagnostics; Agent performs ordinary repair; no new user decision.

## Risks / Trade-offs

- [Generated text drifts from schema/validators] → D1 derives from the same manifest/cache policy inputs the
  validators consume; add an envelope unit test asserting the emitted bullets mention the exact declared
  leaf dirs and an output path, and that the example's refs equal those leaf dirs.
- [Duplicate counting noise on legitimately repeated URLs] → Duplicate accepted claims for one URL are
  already a G3 defect in practice; counting is informational and existing consistency checks still govern
  acceptance. Message carries the exact indexes so repair is unambiguous.
- [Verdict wording changes dry-submit output shape consumers rely on] → Only *additive* fields/messages on
  an already-failing result; passing results unchanged.

## Migration Plan

- Engine-generated task.md changes affect only newly claimed envelopes; nothing is rewritten in place.
- Diagnostic additions are read-only; no data migration. Rollback = revert the two files.

## Open Questions

None.
