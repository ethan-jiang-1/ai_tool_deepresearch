# Bundle Map

> req: BUM-001, BUM-002, BUM-003, BUM-004

## Purpose

Define the canonical passive bundle map contract for runtime bundles. `BUNDLE_MAP.md` is the human/Agent-readable navigation surface at bundle root that describes where research content, runtime control files, diagnostics, work-unit state, cache, and final outputs live. It is a passive map, not a lifecycle phase node, command playbook, or authority surface.

## Requirements

### Requirement: BUNDLE_MAP.md is the canonical passive bundle map

New runtime bundles SHALL contain `BUNDLE_MAP.md` at bundle root as the canonical human/Agent-readable map of bundle contents.

`BUNDLE_MAP.md` SHALL describe where research content, runtime control files, diagnostics, work-unit state, cache, and final outputs live. It SHALL be a passive navigation surface. It SHALL NOT be a lifecycle phase node, command playbook, queue authority, gate authority, handoff authority, or state source.

#### Scenario: New bundle exposes bundle map

- **WHEN** a new production or disposable runtime bundle is instantiated
- **THEN** the bundle root SHALL contain `BUNDLE_MAP.md`
- **AND** the map SHALL identify itself as a passive bundle map
- **AND** the map SHALL NOT claim that reading it completes or enters any lifecycle phase

#### Scenario: Bundle map is not machine authority

- **WHEN** an Agent needs current runtime truth
- **THEN** `BUNDLE_MAP.md` SHALL direct it to active bundle control files and diagnostics
- **AND** it SHALL NOT tell the Agent to infer gate pass, queue drain, submitted evidence coverage, or phase completion from the map text itself

### Requirement: Bundle map content is organized as maps

`BUNDLE_MAP.md` SHALL organize content as bundle navigation rather than execution instructions.

It SHALL include:

- Research Content Map for `seed_topics/`, `reference/`, `artifacts/wave0/`, `artifacts/wave1/`, `artifacts/wave2/`, `final/`, and useful cache locations.
- Runtime Control Map for `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`, `rb_output_declarations.jsonl`, and `_work_units/`.
- Diagnostics Map for `_logs/`, `_diagnostics/`, `_checkpoints/`, and rebuildable diagnostic cache/projection areas when present.
- Reentry Pointers explaining that non-null `rb_status.json.current_node` is the current loaded lifecycle Markdown coordinate, while trace/reentry diagnostics are used when that field is absent.

The map can point to `DPT_FRAMEWORK/RUN.md`, command playbooks, phase nodes, and accepted diagnostics. It SHALL NOT duplicate detailed lifecycle commands that belong in those control surfaces.

#### Scenario: Reader finds research artifacts

- **WHEN** an Agent or human opens `BUNDLE_MAP.md`
- **THEN** they SHALL see where seed topics, references, wave artifacts, cache, and final report artifacts are located
- **AND** the map SHALL distinguish durable research artifacts from rebuildable cache/projection areas

#### Scenario: Reader finds runtime diagnostics

- **WHEN** a bundle needs debugging or reentry
- **THEN** `BUNDLE_MAP.md` SHALL identify the status, queue, trace, ledger, work-unit, log, diagnostic, and checkpoint surfaces to inspect
- **AND** it SHALL state that trace and structured control files, not chat memory or the map text, are the runtime truth

### Requirement: BUNDLE_MAP.md replaces START_FROM_HERE.md for new bundles

New bundle instantiation SHALL generate `BUNDLE_MAP.md` and SHALL NOT generate `START_FROM_HERE.md` as the primary bundle root map.

Framework docs, phase docs, instantiation gates, inspect output, reentry advice, file-observability expectations, and regression tests SHALL use `BUNDLE_MAP.md` as the current primary name for new bundles.

#### Scenario: Instantiation writes new map name

- **WHEN** `instantiate-run-bundle.mjs` creates a new bundle
- **THEN** the generated bundle SHALL contain `BUNDLE_MAP.md`
- **AND** the command's success output SHALL name `BUNDLE_MAP.md` rather than `START_FROM_HERE.md`

#### Scenario: Current docs use new map name

- **WHEN** static regression scans current framework docs and tests after this change
- **THEN** new-bundle guidance SHALL refer to `BUNDLE_MAP.md`
- **AND** it SHALL NOT describe `START_FROM_HERE.md` as the primary current bundle root file

### Requirement: Legacy START_FROM_HERE.md is diagnostic compatibility only

Existing historical or active bundles can contain `START_FROM_HERE.md` without `BUNDLE_MAP.md`. Framework inspection and reentry guidance SHALL treat such bundles as legacy compatibility when all other required bundle surfaces are present, and SHALL report deprecation advice.

Legacy compatibility SHALL NOT make `START_FROM_HERE.md` the primary file for newly instantiated bundles. If both `BUNDLE_MAP.md` and `START_FROM_HERE.md` exist, tooling SHALL prefer `BUNDLE_MAP.md` as the current map and SHALL report the legacy file as deprecated compatibility debris with removal or migration advice.

#### Scenario: Legacy bundle remains inspectable

- **WHEN** an existing bundle contains `START_FROM_HERE.md` but no `BUNDLE_MAP.md`
- **AND** all other required bundle surfaces are present
- **THEN** diagnostic tooling SHALL keep the bundle readable with a deprecation warning
- **AND** the warning SHALL tell the reader that new bundles use `BUNDLE_MAP.md`

#### Scenario: Both map files exist

- **WHEN** a bundle contains both `BUNDLE_MAP.md` and `START_FROM_HERE.md`
- **THEN** tooling SHALL treat `BUNDLE_MAP.md` as the current map
- **AND** tooling SHALL report the legacy file as deprecated compatibility debris rather than as a second authority surface
