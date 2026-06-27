# research-styles Specification

## Purpose

Define research style profiles that control deep research depth and breadth parameters. Each style is a JSON file consumed by the JS engine. The system applies the selected style via CLI, stores resolved parameters in `rb_profile.yaml`, and enforces numeric thresholds through gate `count_floor` rules with dynamic threshold resolution. Quality parameters are enforced by Agent checklist + Queue re-fill loops.

## Requirements

### Requirement: Research style JSON files define per-style parameters

The system SHALL provide one JSON file per research style under `DPT_FRAMEWORK/schema/research-styles/`. Each file SHALL be consumed exclusively by JS (`apply-research-style.mjs` CLI) — Agent and MD SHALL NOT read these files. Adding a new style SHALL require only adding a new JSON file.

Each style file SHALL contain at minimum:
- `user_visible`: boolean
- `wave0_per_topic_source_floor`: positive integer
- `wave0_shared_ref`: object with `base` (non-negative integer) and `per_topic` (non-negative integer) — topic-count-dependent factor; CLI computes absolute `wave0_shared_ref_total`
- `wave1_per_topic_ref_floor`: positive integer
- `topic_unique_ratio`: number in [0, 1]
- `counterexample_search`: boolean
- `cross_verification`: boolean
- `p0p1_independent_backing`: positive integer
- `quality_min_tier`: string (`tier_1` / `tier_2` / `tier_3` / `tier_4`)
- `quality_min_substance`: string (`substantive` / `thin` / `none`)
- `wave2_cross_topic_depth`: non-negative integer — minimum cross-topic connections per topic (0=none, 1=≥1 per topic, 2=≥2 per topic with at least 1 contradiction)
- `wave2_emergent_search_rounds`: non-negative integer — rounds of emergent content search per topic, each from a different angle

#### Scenario: JS reads style parameters via CLI
- **WHEN** `apply-research-style.mjs --bundle <path> --style claim_verification` executes
- **THEN** it SHALL read `DPT_FRAMEWORK/schema/research-styles/claim_verification.json`, read `topic_registry` length from `rb_plan.md`, compute `wave0_shared_ref_total = base + per_topic × topic_count`, and write all parameters (with computed absolute values) to `rb_profile.yaml#/research_style_params`

#### Scenario: Agent applies style parameters via CLI
- **WHEN** phase-hitl1.md instructs the Agent to apply a research style
- **THEN** the Agent SHALL run `apply-research-style.mjs --bundle <path> --style <profile>` and verify stdout output — the Agent SHALL NOT read JSON style files or compute topic-count-dependent values

#### Scenario: New style added with minimal change
- **WHEN** a developer creates a new JSON file under `research-styles/` with the required parameter keys
- **THEN** the style SHALL be available for use without any code changes (beyond the new JSON file)

### Requirement: Profile stores research style parameters after HITL1

The system SHALL store research style parameters in `rb_profile.yaml` under the key `research_style_params`. After HITL1, the Agent SHALL run `apply-research-style.mjs` to write all parameters from the selected style's JSON definition file into this section. The profile SHALL serve as the single source of truth for all downstream consumers (gate CLI and phase MD).

#### Scenario: HITL1 applies parameters via CLI
- **WHEN** user selects `claim_verification` during HITL1
- **THEN** Agent SHALL run `node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle <path> --style claim_verification`, verify stdout JSON (applied profile, topic_count, wave0_shared_ref_total), and confirm exit code 0

#### Scenario: Gate CLI reads dynamic threshold from profile
- **WHEN** gate CLI evaluates a `count_floor` rule with `threshold_source` pointing to `rb_profile.yaml#/research_style_params/wave0_shared_ref_total`
- **THEN** it SHALL resolve the threshold by reading the value at that path in `rb_profile.yaml`

#### Scenario: Rerun recomputes parameters when topic_registry changes
- **WHEN** phase-rerun adds or removes topics and updates `topic_registry` in `rb_plan.md`
- **THEN** it SHALL re-run `apply-research-style.mjs --bundle <path> --style <research_profile>` to recompute `wave0_shared_ref_total` with the updated topic count
- **AND** the recomputed `research_style_params` SHALL replace the previous values in `rb_profile.yaml`
- **AND** phase-seed-topics (rerun-aware mode) SHALL synchronize `action: add` and `action: remove` results with `topic_registry` before passing control to wave0

#### Scenario: Old bundle without research_style_params
- **WHEN** gate CLI evaluates a `count_floor` rule and `rb_profile.yaml` has no `research_style_params` section
- **THEN** it SHALL fall back to the hardcoded `threshold` value in the gate definition JSON

### Requirement: Gate count_floor reads dynamic threshold from profile

The `count_floor` rule type in gate definition JSONs SHALL support an optional `threshold_source` field specifying a JSON path within `rb_profile.yaml`. When present, the gate CLI SHALL resolve the threshold from the profile at that path. The existing `threshold` field SHALL be retained as fallback.

#### Scenario: count_floor with dynamic threshold
- **WHEN** gate-wave0-complete evaluates `shared_ref_count_floor` with `threshold_source: "rb_profile.yaml#/research_style_params/wave0_shared_ref_total"`
- **AND** the profile contains `research_style_params.wave0_shared_ref_total: 12`
- **THEN** the rule SHALL pass only if at least 12 matching files exist (not the hardcoded fallback of 1)

#### Scenario: count_floor without threshold_source (backward compatible)
- **WHEN** gate-wave2-complete evaluates a rule without `threshold_source`
- **THEN** it SHALL use the hardcoded `threshold` value as before

### Requirement: Phase MD references style-specific targets and uses unified Queue re-fill loop

Phase MD files for wave0, wave1, and wave2 SHALL instruct the Agent to read `rb_profile.yaml#/research_style_params` to determine phase-specific targets. All three waves SHALL use the same execution model: **fill Q → drain Q → check → (gap?) → re-fill Q → drain → re-check → ... → gate pass**. The check mechanism differs by phase (gate `count_floor` for wave0/1, Agent Quality Self-Check for wave2), but the re-fill loop is identical.

The wave1 phase MD SHALL include a Stop Conditions checklist. The wave2 phase MD SHALL include a Quality Self-Check covering all wave2 parameters.

#### Scenario: wave0 Agent reads per-topic and shared floor, triggers re-fill on gate fail
- **WHEN** Agent enters phase-wave0
- **THEN** it SHALL read `research_style_params.wave0_per_topic_source_floor` (per-topic `source.yaml` entries) and the gate CLI SHALL resolve `wave0_shared_ref_total` from the same profile section (global `00-shared-*.md` files, computed by `apply-research-style.mjs` from `wave0_shared_ref.base + per_topic × topic_count`)
- **WHEN** gate fails with `per_topic_count_floor` or `shared_ref_count_floor`
- **THEN** Phase Agent SHALL enter the Count-Floor Re-Fill Loop (§3.3.1 of phase-wave0.md): parse gate inspect → create supplementary task cards (`wave0-suppl-{topic.slug}-r{N}`) → enqueue → drain → rerun gate (max 3 attempts + no-progress escalation)
- **AND** supplementary tasks SHALL append to `source.yaml` without modifying existing entries, and SHALL NOT re-backfill seed topic tokens

#### Scenario: wave1 Agent reads per-topic floor and stop conditions, triggers re-fill on gate fail
- **WHEN** Agent enters phase-wave1
- **THEN** it SHALL read `research_style_params.wave1_per_topic_ref_floor` and `topic_unique_ratio`, and apply the Stop Conditions checklist (7 items, including `counterexample_search` and `cross_verification` which vary by style)
- **WHEN** gate fails with `per_topic_ref_md_count_floor`
- **THEN** Phase Agent SHALL enter the Count-Floor Re-Fill Loop (§3.3.2 of phase-wave1.md): parse gate inspect → create supplementary task cards (`wave1-suppl-{topic.slug}-r{N}`, produce only `reference/*.md` files) → enqueue → drain → rerun gate (max 3 attempts + no-progress escalation)
- **AND** supplementary tasks SHALL NOT modify evidence-summary.md, question-list.md, or backfill seed topic tokens

#### Scenario: wave2 Agent executes Quality Self-Check, triggers re-fill on quality gap
- **WHEN** Agent enters wave2
- **THEN** it SHALL read all 5 wave2 parameters from `research_style_params` and execute a Quality Self-Check (§3.3.1 of phase-wave2.md) before running gate:
  1. `p0p1_independent_backing` — each P0/P1 finding's `backing_refs` count ≥ threshold
  2. `quality_min_tier` — each backing source's tier ≥ threshold
  3. `quality_min_substance` — each backing source's substance ≥ threshold
  4. `wave2_cross_topic_depth` — each topic connected to ≥ N other topics in scan matrix (0=skip)
  5. `wave2_emergent_search_rounds` — each topic has ≥ N emergent search rounds, each from different angle (0=skip)
- **WHEN** any of the 5 checks fails
- **THEN** Phase Agent SHALL enter the Quality Re-Fill Loop (§3.3.2 of phase-wave2.md): create supplementary task cards targeting the specific gap type (backing → `wave2-suppl-backing-{finding_id}`, cross-topic → `wave2-suppl-cross-{topic}`, emergent → `wave2-suppl-emergent-{topic}-r{N}`) → enqueue → drain → re-run Quality Self-Check (max 3 attempts + no-progress escalation)

**Enforcement boundary (this change):** Gate enforcement applies to 3 numeric parameters (`wave0_per_topic_source_floor`, `wave0_shared_ref_total`, `wave1_per_topic_ref_floor`) via `count_floor` rules with `threshold_source`, plus 1 content rule (`no_example_com_ref_url` / `no_example_com_shared_ref_url`) via `pattern_match` with glob target. All other parameters are enforced by Agent checklist + Queue re-fill loop — Agent discipline backed by structured MD instructions and Q as the autonomous execution engine. Upgrading quality parameters to Gate rules is deferred to `todo-evidence-quality` and `todo-explore-exploit`.

### Requirement: Supplementary tasks SHALL NOT produce placeholder references

Supplementary task cards created by Count-Floor Re-Fill Loops (wave0 §3.3.1, wave1 §3.3.2) SHALL enforce a three-layer defense against placeholder reference files with fake source URLs (e.g. `https://example.com`). The defense SHALL cover: (1) task card instruction ban, (2) Gate CLI deterministic rejection, and (3) Phase Agent post-drain verification.

#### Scenario: Supplementary task card prohibits placeholder source URLs
- **WHEN** Phase Agent creates a supplementary task card for count-floor re-fill
- **THEN** the task card `action` SHALL explicitly forbid creating reference files with `source_url` set to `https://example.com` or any equivalent placeholder domain
- **AND** the `action` SHALL require each new reference file's Key Facts section to contain at least 3 specific, verifiable factual statements (not generic filler)
- **AND** the `action` SHALL instruct: if no legitimate new source can be found after thorough search (≥3 different search angles), write `artifacts/wave{N}/{topic_slug}/suppl-failure-r{attempt}.md` documenting search keywords, angles attempted, and reasons for failure — rather than creating a placeholder reference file

#### Scenario: Gate CLI rejects reference files with placeholder URLs
- **WHEN** gate-wave1-complete evaluates `no_example_com_ref_url` rule with `pattern_match` against `reference/{topic}-*.md` using glob expansion
- **AND** any matching file contains `source_url: "https://example.com"` (or `http://example.com`, `https://www.example.com`)
- **THEN** the rule SHALL fail with a clear message identifying the offending file
- **AND** wave0-complete SHALL enforce the same via `no_example_com_shared_ref_url` rule against `reference/00-shared-*.md`

#### Scenario: Phase Agent detects placeholder-only supplementary round
- **WHEN** Phase Agent drains supplementary task cards and inspects newly created reference files before rerunning gate
- **AND** all new reference files from this round have `source_url` set to placeholder domains (example.com, placeholder.com, fake-url.com)
- **THEN** Phase Agent SHALL treat this as no-progress — immediate escalation without waiting for 3 attempts
- **AND** the placeholder reference files SHALL be deleted (`rm reference/{topic.slug}-ref-*.md` matching placeholder source_url)
- **AND** if a Sub-agent wrote `suppl-failure-r{attempt}.md`, this SHALL also trigger immediate escalation with the failure report content included in the escalation record

### Requirement: Debug style is hidden from end users

The system SHALL support a `debug` research style with `user_visible: false`. HITL1 SHALL only present styles where `user_visible: true` to the user. The `debug` style SHALL use the lowest parameter values: `wave0_per_topic_source_floor: 1`, `wave0_shared_ref_total: 1` (computed from `wave0_shared_ref: {base:1, per_topic:0}`), `wave1_per_topic_ref_floor: 1`, `topic_unique_ratio: 0`, `counterexample_search: false`, `cross_verification: false`, `p0p1_independent_backing: 1`, `quality_min_tier: tier_4`, `quality_min_substance: none`. It SHALL be available for development and testing only.

#### Scenario: Debug style not shown in HITL1
- **WHEN** HITL1 presents research style options to the user
- **THEN** only `quick_factual`, `exploratory_map`, and `claim_verification` SHALL appear (not `debug`)

#### Scenario: Debug style usable internally
- **WHEN** a developer manually sets `research_profile: debug` and writes the corresponding `research_style_params` into `rb_profile.yaml`
- **THEN** the gate system SHALL use the debug parameters (lowest floor=1, all quality thresholds at minimum) for that run
