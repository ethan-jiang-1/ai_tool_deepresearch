> req: CMI-001

## MODIFIED Requirements

### Requirement: Command playbook guides agent to produce a complete bundle

The `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` playbook SHALL instruct the agent to create `dpt_rb_{name}/` at project root, containing `BUNDLE_MAP.md`, five `rb_*` control files, `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, `final/`, and `_work_units/`.

The five `rb_*` control files are the instantiation-time set: `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`. The playbook SHALL state that the sixth ledger file `rb_output_declarations.jsonl` is Engine-created lazily at the first successful `operate-work-unit submit` and is not part of the instantiation-time content; a freshly instantiated bundle that does not yet contain it is not drift, and its later appearance is the normal submitted-ledger runtime surface.

The playbook SHALL describe `BUNDLE_MAP.md` as a passive bundle map and SHALL NOT treat it as a lifecycle phase node or replacement for `RUN.md`, command playbooks, or phase Markdown.

#### Scenario: Agent follows playbook for fresh bundle
- **WHEN** Agent reads `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` and is given name "ai-safety"
- **THEN** Agent creates `dpt_rb_ai-safety/` as a peer of `DEEP_RESEARCH_HARNESS/` with `BUNDLE_MAP.md`, all required control files, and all required directories

#### Scenario: Bundle name collision
- **WHEN** `dpt_rb_ai-safety/` already exists
- **THEN** the playbook instructs the agent to report error and stop, not overwrite

#### Scenario: Playbook distinguishes instantiation-time files from the lazily created ledger
- **WHEN** an Agent reads the playbook's bundle-content description
- **THEN** it SHALL see the five instantiation-time `rb_*` control files named explicitly
- **AND** it SHALL be told that `rb_output_declarations.jsonl` appears after the first successful `submit` and its absence in a fresh bundle is not drift
