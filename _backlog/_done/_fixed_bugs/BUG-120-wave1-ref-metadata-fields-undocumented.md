# BUG-120: Wave1 reference metadata fields undocumented — Agent discovers via gate failures

> **Disposition (2026-07-26): Closed.** The original guidance-delivery defect was fixed by `d65fe538a` (`make-wave-producer-contract-and-closeout-direct`): the shared reference template now reaches the Wave1 `requires` chain and the current static guidance regressions pass. A real `case-225` observation remains a separate content-validation opportunity; it is not evidence that this documented-contract defect is still present.

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-120 |
| **Severity** | P2 |
| **Phase** | wave1 |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

The wave1 reference file contract requires 8 metadata fields, 1 topic binding field, 5 body sections, AND scannable body refs to work-unit outputs. None of this is documented in the Agent-facing phase instructions (`phase-wave1.md`) or the shared reference template (`shared-reference-template.md`). The Agent discovers each requirement through a separate gate run — requiring 4 complete rewrites of 40 reference files.

## The Complete Reference File Contract (Discovered Through Gate Failures)

### Metadata Block Format
(From `DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs:327 parseReferenceMetadata`)

Format: `- key: value` lines BEFORE the first `#` heading. NOT YAML frontmatter.
```markdown
- source_url: https://github.com/Fission-AI/OpenSpec
- acceptance_status: accepted
- source_type: wave1_deepening
- tier: tier_2
- evidence_role: topic_specific
- trust_level: medium
- why_it_matters: "Core evidence for topic analysis"
- accessed_at: "2026-07-24"
- related_topic_uid: tp_781a7ee6-bed6-4a98-888a-e4782a2cd63b
```

### Required Metadata Fields
From `DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs`:
- `REQUIRED_REFERENCE_METADATA_FIELDS` (line ~370): `source_url`, `acceptance_status`, `source_type`, `tier`, `evidence_role`
- Additional fields checked later: `trust_level`, `why_it_matters`, `accessed_at`

### Topic Binding
From `DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs:317`:
```javascript
export const REFERENCE_TOPIC_BINDING_FIELDS = ['related_topic_uid', 'related_topic'];
```
The Agent tried `topic_binding` then `reference_topic_binding` — both rejected. Only `related_topic_uid` (with topic_uid value, not slug) works.

### Required Body Sections
5 markdown `##` sections required:
1. `## Key Facts`
2. `## Core Content Capture`
3. `## Relevance To This Research`
4. `## Quotable Terms / Concepts`
5. `## Risks And Limitations`

### Reference Countability Requirement
Even with all metadata and sections correct, references are "uncountable: filesystem_only_not_backed: lacks scannable body refs to submitted work-unit outputs". The body must contain links to work-unit artifact paths:
```markdown
## Backing References
- Work-unit output: artifacts/wave1/01_openspec-adoption-evidence/evidence-summary.md
- Source URL: https://github.com/Fission-AI/OpenSpec
```

## Discovery Sequence — 4 Rewrites of 40 Files

### Rewrite 1: YAML frontmatter format
Agent wrote references with `---\nsource_url: ...\n---` YAML frontmatter. Gate: all 40 files "lacks source_url metadata". The `parseReferenceMetadata` function parses `- key: value` bullet format, NOT YAML frontmatter.

### Rewrite 2: Bullet metadata with 5 fields
Agent switched to `- key: value` format with source_url, acceptance_status, source_type, tier, evidence_role. Gate: missing trust_level, why_it_matters, accessed_at, topic_binding.

### Rewrite 3: Added 8 fields + topic binding
Agent added trust_level, why_it_matters, accessed_at, and `topic_binding: <slug>`. Gate: "reference_topic_binding_missing" — topic_binding is wrong key name. Also: missing 5 body sections.

### Rewrite 4: Fixed topic binding + sections + body refs
Agent changed to `reference_topic_binding: <uid>`. Gate: "reference_topic_binding_missing" — STILL wrong! Discovered `REFERENCE_TOPIC_BINDING_FIELDS = ['related_topic_uid', 'related_topic']`. Changed to `related_topic_uid: <uid>`. Added 5 sections. Added body refs. Finally: ALL countable.

## What phase-wave1.md Documents

The phase says "Phase Agent materializes rich reference files at `reference/{topic.slug}-<source-slug>.md`" and points to `shared-reference-template.md`. The template mentions `source_url` but does NOT list:
- The 8 required metadata fields
- The `- key: value` format (not YAML frontmatter)
- The 5 required body sections
- The `related_topic_uid` binding field
- The scannable body refs requirement

## Suggested Fix

1. In `shared-reference-template.md`: document ALL 8 required metadata fields with their exact key names and valid values
2. Document that the format is `- key: value` bullets (not YAML frontmatter)
3. Document the 5 required body sections with descriptions
4. Document `related_topic_uid` as the topic binding field
5. Document the scannable body refs requirement
6. In `phase-wave1.md §3`: reference these requirements explicitly when instructing Phase Agent to materialize references
