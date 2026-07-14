## Context

The seed topic backfill zone uses `__BACKFILL_*__` tokens as structural targets for wave0/wave1/wave2 evidence backfill. Each token is consumed exactly once (grep → replace → gate `negate: true` check). The framework supports multi-round rerun (HITL2 → rerun → seed-topics → wave0/1/2 → HITL2), but consumed tokens are never re-injected. Round 2 has no structural backfill target.

The `repair-rerun-added-topic-bootstrap` commit (`80d0c9e83`) built work-unit-evidence-first infrastructure that partially addresses the problem:
- Wave0 §3.0 "Classify Direct Facts" lets existing topics reuse submitted coverage (no new work enqueued, no backfill needed)
- `buildSourceRefLineage()` enables supplementary work units to cite prior submitted outputs
- `renderNewSeedBody()` generates full skeletons with fresh tokens for `add_topic`
- `recover-declaration` restores missing ledger rows

But wave1/wave2 have no analogous classification logic, phase-rerun does not re-inject tokens, and the seed template still uses round-relative headers (`## 本轮新增证据`).

This design extends the new architecture's principle — **submitted work units are authoritative; seed topic backfill is a downstream projection** — consistently across all three waves, and adds the minimal structural mechanism (token re-injection) for when new supplementary findings DO need to land in seed topics.

## Goals / Non-Goals

**Goals:**
- Phase-rerun SHALL re-inject consumed `__BACKFILL_*__` tokens for existing topics so round 2+ has structural backfill targets
- Phase-wave1 and phase-wave2 SHALL classify topics before queue fill (mirror wave0 §3.0), with reuse skipping for topics with valid submitted coverage
- Seed template headers SHALL use wave-fixed names (`## Wave0 证据`) instead of round-relative names (`## 本轮新增证据`)
- Wave phases SHALL provide a fallback path when a backfill token is unexpectedly missing

**Non-Goals:**
- No `### Round N` accumulation within wave sections (submitted work-unit rows carry temporal order)
- No Engine-level token management (token re-injection is an Agent action in phase-rerun MD, not a JS operation)
- No migration logic for old-format seed files (phase-rerun naturally rewrites them on next rerun)
- No new gate rules or gate definition changes (existing `negate: true` pattern_match checks continue to work)
- No new CLI commands (token re-injection is a manual Agent action: read file → detect token → write line)

## Decisions

### Decision 1: Token re-injection is an Agent action in phase-rerun.md, not a JS operation

**Rationale**: Token detection (grep for `__BACKFILL_*__`) and insertion (append one line before next `## ` header) are simple text operations. The Agent already performs equivalent markdown edits when replacing tokens in wave phases. Adding a JS CLI for this would create a new Engine surface with schema, error handling, and test burden for a one-line text insertion.

**Alternatives considered**: A JS `reinject-backfill-tokens.mjs` CLI. Rejected: adds Engine code for what is fundamentally an Agent-side markdown edit. The existing pattern (Agent reads file → Agent edits markdown → Agent writes file) already works for the token replacement path. Token re-injection follows the same pattern.

**Net simplification**: This decision avoids adding a new Engine module, CLI command, Zod schema, and test fixture. The cost is that the Agent must follow the phase-rerun instructions correctly — which is the existing pattern for all phase MD instructions.

### Decision 2: Token re-injection detects tokens by name, not by section header

**Rationale**: The token names (`__BACKFILL_WAVE0_EVIDENCE__`, etc.) are stable identifiers already used by gate `pattern_match` rules. Section headers may vary (old format vs new format). Detecting by token name is header-agnostic and works on both old and new format seed files.

**Mechanism**: For each wave section, grep the section body for the corresponding `__BACKFILL_*__` string. If found → skip. If not found → the section's backfill was consumed last round → insert token at section bottom.

### Decision 3: Wave-fixed section headers replace round-relative headers

**Rationale**: "本轮" (this round) is misleading after round 1. Wave-fixed headers describe what content belongs where, regardless of round number. This aligns with the new architecture's principle that waves are organizational, not round-scoped.

**Safety analysis**: Gate `pattern_match` checks match on `__BACKFILL_*__` token strings (raw content grep), not section headers. `parseMarkdownSemanticSections` operates on English-named sections only. The only hardcoded Chinese header in Engine code is `## 本轮重跑方向` in `wave-contract-evaluators.mjs` line 329 — a separate section, unchanged. **Renaming backfill section headers will NOT break any Engine code.**

### Decision 4: Classify Direct Facts uses the same pattern as wave0 §3.0

**Rationale**: Consistency. The Agent already has wave0 §3.0 as a working reference. Wave1 and wave2 classification follows the same structure: check bundle authority (submitted ledger rows, not filesystem artifacts) → classify each topic → skip queue fill for reuse topics.

**Interaction with `buildSourceRefLineage`**: When a topic is classified as "supplement intent → normal supplementary demand," the supplementary work unit can cite prior submitted outputs via `buildSourceRefLineage` (already built). The classification prevents unnecessary enqueue; the lineage mechanism prevents unnecessary re-production.

## Risks / Trade-offs

- **Agent misinterprets token insertion position**: Low risk. The instruction says "after last content line, before next `## ` header." Ambiguity only arises if the section is empty (no content at all), in which case the token is the only content — worst case is a blank line before the token, which has no functional impact.

- **Old-format seed files with different section headers**: Low risk. Token detection (grep entire file for `__BACKFILL_*__`) is completely header-agnostic — works on any header format. Token insertion requires locating the target section; the phase-rerun instructions include the old-to-new header mapping so the Agent can find the correct section regardless of format. The first rerun after this change re-injects tokens at the correct location; the section header itself is not rewritten (non-goal: no migration logic).

- **Idempotency failure (duplicate tokens)**: Low risk. The detection logic is "if token exists → skip." As long as the Agent correctly greps for the token pattern, duplicate injection is impossible.

- **No gate coverage change means wave1/wave2 gates still false-pass on rerun**: Accepted. The gate cannot distinguish "consumed this round" from "consumed last round" without a round counter — which would require Engine changes. The mitigation is: classification prevents unnecessary enqueue (fewer topics need backfill), and token re-injection ensures the backfill target exists when it IS needed. The anti-cheating rules in wave phases already prohibit leaving tokens unconsumed.

- **Shared `__BACKFILL_PENDING_QUESTIONS__` token between wave1 and wave2**: Pre-existing pattern, inherited by this change. Wave1 §3.3 replaces this token first (status labels + return-map entries). Wave2 §3.2.3 also expects to backfill it (finding updates). In round 2, phase-rerun re-injects the token; wave1 consumes it; wave2 finds it absent and falls through to the missing-token fallback path (RWP-022), which instructs appending after last content. This is acceptable: wave2's pending-questions updates are additive to wave1's status labels. The wave2 gate's `negate: true` check on this token passes because wave1 consumed it — same as current behavior.
