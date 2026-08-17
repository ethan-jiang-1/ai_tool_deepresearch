> req: CMI-001

## MODIFIED Requirements

### Requirement: Command playbook guides agent to produce a complete bundle

The `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` playbook SHALL instruct the agent to create `dpt_rb_{name}/` at project root, containing `BUNDLE_MAP.md`, five `rb_*` control files, `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, `final/`, `_work_units/`, and `_scripts/`.

The five `rb_*` control files are the instantiation-time set: `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`. The playbook SHALL state that the sixth ledger file `rb_output_declarations.jsonl` is Engine-created lazily at the first successful `operate-work-unit submit` and is not part of the instantiation-time content; a freshly instantiated bundle that does not yet contain it is not drift, and its later appearance is the normal submitted-ledger runtime surface.

The playbook SHALL describe `BUNDLE_MAP.md` as a passive bundle map and SHALL NOT treat it as a lifecycle phase node or replacement for `RUN.md`, command playbooks, or phase Markdown.

`_scripts/` SHALL be scaffolded at instantiation time as the run-scoped helper script location: one-shot executors, generators, and recovery scripts that serve only the current run bundle SHALL be written there and SHALL NOT be written to the repository root or the Harness framework root. It is a non-authority runtime area (same class as `_logs/` and `_cache/`): its contents are Agent-produced execution aids that never establish gate, evidence, provenance, or lifecycle authority, and its presence or contents SHALL NOT be part of any gate or inspect-bundle required-shape check.

#### Scenario: Agent follows playbook for fresh bundle

- **WHEN** Agent reads `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` and is given name "ai-safety"
- **THEN** Agent creates `dpt_rb_ai-safety/` as a peer of `DEEP_RESEARCH_HARNESS/` with `BUNDLE_MAP.md`, all required control files, and all required directories including `_scripts/`

#### Scenario: Bundle name collision

- **WHEN** `dpt_rb_ai-safety/` already exists
- **THEN** the playbook instructs the agent to report error and stop, not overwrite

#### Scenario: Playbook distinguishes instantiation-time files from the lazily created ledger

- **WHEN** an Agent reads the playbook's bundle-content description
- **THEN** it SHALL see the five instantiation-time `rb_*` control files named explicitly
- **AND** it SHALL be told that `rb_output_declarations.jsonl` appears after the first successful `submit` and its absence in a fresh bundle is not drift

#### Scenario: Playbook directs run-scoped scripts into the bundle

- **WHEN** an Agent needs to write a work-unit executor, reference generator, or recovery script during a run
- **THEN** the playbook SHALL direct it to write the script under the current run bundle root `_scripts/`
- **AND** it SHALL direct the Agent not to write such scripts to the repository root or `DEEP_RESEARCH_HARNESS/`
- **AND** the playbook SHALL present `_scripts/` as a non-authority runtime area that never counts as gate or evidence surface
