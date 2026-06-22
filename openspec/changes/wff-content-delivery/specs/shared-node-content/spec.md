## MODIFIED Requirements

### Requirement: Shared profile content completeness

`shared-profile.md` SHALL describe the `rb_profile.yaml` schema components, including:
- `plan_basename`: research plan name
- `research_profile`: one of `quick_factual`, `exploratory_map`, `claim_verification`
- `root_must_answer_set`: 3-5 concrete research questions
- `human_decision_checkpoints.hitl1`: status, topic_rewrite, user_intent_summary, research_profile, root_must_answer_set
- `human_decision_checkpoints.hitl2`: status, answerability_class, user_decision, final_report_view, custom_slug, user_feedback

The HITL2 fields SHALL be documented:
- `status`: one of `not_started`, `pending_user`, `recorded`, `blocked`
- `answerability_class`: one of `not_assessed`, `ready_substantive`, `ready_insufficient_judgment`, `blocked_repair_required`
- `user_decision`: one of `not_started`, `proceed_to_readiness`, `request_view_revision`, `repair_and_rerun`, `stop_blocked`
- `final_report_view`: one of `not_started`, `profile_default`, `executive_brief`, `evidence_map`, `claim_judgment`, `technical_deep_dive`, `custom`
- `custom_slug`: optional custom report name

The profile document SHALL include an Authority Boundary section pointing to the executable Zod contract at `DPT_FRAMEWORK/schema/contracts/profile.mjs` as the deterministic source of truth.

#### Scenario: HITL2 fields documented in shared-profile

- **WHEN** Agent reads `shared-profile.md` to understand `rb_profile.yaml` structure
- **THEN** the document SHALL describe `human_decision_checkpoints.hitl2` and its sub-fields
- **AND** each field SHALL have its enum values listed

#### Scenario: Authority boundary points to contract

- **WHEN** Agent reads `shared-profile.md`
- **THEN** the document SHALL state that `DPT_FRAMEWORK/schema/contracts/profile.mjs` is the deterministic authority for profile schema
- **AND** the document SHALL NOT claim to be the authoritative schema definition itself

### Requirement: Shared gate rules content as generated summary

`shared-gate-rules.md` SHALL cover all 9 non-terminal gates: `instantiation-complete`, `hitl1-recorded`, `setup-ready`, `seed-topics-ready`, `wave0-complete`, `wave1-complete`, `wave2-complete`, `hitl2-recorded`, `readiness-passed`.

For each gate, the document SHALL describe: purpose (what lifecycle stage it guards), check direction (what kinds of rules to expect), and repair posture (common remediations for failures).

The document SHALL be marked `authority: generated-summary` and SHALL point to the gate definition JSON files and gate CLI output as deterministic truth — not to itself as authority.

#### Scenario: All nine gates covered

- **WHEN** Agent reads `shared-gate-rules.md`
- **THEN** the document SHALL have an entry for `hitl2-recorded`
- **AND** an entry for `readiness-passed`
- **AND** entries for all 7 other gates

#### Scenario: Generated-summary authority boundary

- **WHEN** Agent reads `shared-gate-rules.md`
- **THEN** the document SHALL state that gate definition JSON files are the deterministic authority
- **AND** the document SHALL NOT claim to define gate rules itself

### Requirement: Shared schemas content matches current executable surface

`shared-schemas.md` SHALL document the schema landscape, including:
- Profile schema (`rb_profile.yaml`, contract at `DPT_FRAMEWORK/schema/contracts/profile.mjs`)
- Status schema (`rb_status.json`)
- Queue schema (`rb_queue.json`)
- Plan schema (`rb_plan.md`)
- Trace schema (`rb_trace.jsonl` vs `_trace.jsonl` distinction)
- Gate and transition contract
- ReferenceMetadata schema (required fields for reference entries)
- Wave artifact directory structure (`reference/`, `artifacts/wave1/`, `artifacts/wave2/`)
- Final report artifact directory (`final/`)

The document SHALL explain that `final/` holds the terminal delivery output, generated once per delivery pass. It SHALL distinguish this from wave-level artifact directories.

#### Scenario: Final report directory documented

- **WHEN** Agent reads `shared-schemas.md`
- **THEN** the document SHALL describe the `final/` directory as the terminal delivery output location
- **AND** SHALL distinguish `final/` from wave artifact directories (`reference/`, `artifacts/wave1/`, `artifacts/wave2/`)

### Requirement: Shared anti-cheating rules content

`shared-anti-cheating-rules.md` SHALL list prohibitions that apply across all phases. The 6 core prohibitions SHALL be:
1. Do not hand-write trace events, receipts, verification records, or gate results
2. Do not modify control files after CLI fail to bypass a recheck
3. Do not skip retry attempt count or escalation limit
4. Do not treat chat memory or conversation context as runtime state or evidence
5. Do not claim evidence coverage, synthesis completeness, or subagent coverage in instantiation/setup phases
6. Do not continue past a `stop: yes` node without user input

Additional delivery-phase prohibitions SHALL include:
7. Do not write a fake HITL2 user decision or bypass user input
8. Do not judge semantic quality or writing quality in the readiness phase
9. Do not generate the final report from chat memory — source only from verified bundle state
10. Do not implement a hidden loop in the final phase for post-delivery rework

#### Scenario: HITL2 anti-cheating rule

- **WHEN** Agent reads `shared-anti-cheating-rules.md`
- **THEN** it SHALL contain a rule prohibiting writing a fake HITL2 user decision or bypassing user input

#### Scenario: Readiness anti-cheating rule

- **WHEN** Agent reads `shared-anti-cheating-rules.md`
- **THEN** it SHALL contain a rule prohibiting semantic/writing quality judgment in the readiness phase

#### Scenario: Final anti-cheating rule

- **WHEN** Agent reads `shared-anti-cheating-rules.md`
- **THEN** it SHALL contain a rule prohibiting generating the final report from chat memory
- **AND** a rule prohibiting a hidden loop in the final phase
