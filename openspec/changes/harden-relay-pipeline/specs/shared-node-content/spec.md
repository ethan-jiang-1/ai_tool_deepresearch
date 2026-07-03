# Shared Node Content (delta)

> req: SHC-002, SHC-003

## Purpose

Update shared workflow guidance so the shared node summaries match the hardened relay pipeline and the relay role spec rename. These updates keep shared nodes as Agent-readable generated summaries/guidance only; they do not make shared prose deterministic gate, queue, relay, trace, or transition authority.

## MODIFIED Requirements

### Requirement: Shared gate rules content as generated summary

`shared-gate-rules.md` SHALL reflect the current relay-backed wave gates and readiness surface.

The gate summary SHALL be updated at least in these places:

- Wave0 SHALL describe current reference/index/source surfaces: `reference/_INDEX.md`, `reference/README.md`, `reference/00-shared-*.md`, and `artifacts/wave0/{topic}/source.yaml`, plus relay provenance and count/cache/dedup checks.
- Wave1 SHALL describe relay-backed topic deepening outputs: `artifacts/wave1/{topic.slug}/evidence-summary.md`, `artifacts/wave1/{topic.slug}/question-list.md`, and `reference/{topic.slug}-*.md`; it SHALL NOT describe Wave1 as a skeleton/foundation-placeholder phase.
- Readiness SHALL describe the current reference index as `reference/_INDEX.md`, not `reference/index.md`.
- Wave2 SHALL describe conditional relay provenance for new search/evidence/reference or promoted cross references, not an unconditional whole-phase subagent hard gate.

The update SHALL preserve the shared-gate-rules authority boundary: it is a generated summary and SHALL point to gate definition JSON and gate CLI output as deterministic rule authority. This cleanup SHALL NOT blanket-add `shared/shared-gate-rules` to every phase `requires`.

#### Scenario: Agent reads current gate summary for wave phases

- **WHEN** Agent reads `shared-gate-rules.md` before Wave0, Wave1, Wave2, or readiness
- **THEN** the summary SHALL describe the current artifact/reference surfaces and relay provenance posture
- **AND** it SHALL NOT describe superseded Wave1 skeleton behavior or stale `reference/index.md`

### Requirement: Shared schemas content matches current executable surface

`shared-schemas.md` SHALL update relay role spec path references and role-spec structure summaries to the new role-key-first filenames.

The shared schemas summary SHALL use these role spec references when describing relay role guidance:

| Role spec | Role key |
|-----------|----------|
| `phases/subagent-dpt-source-intake.md` | `dpt-source-intake` |
| `phases/subagent-dpt-evidence-extractor.md` | `dpt-evidence-extractor` |
| `phases/subagent-dpt-topic-scout.md` | `dpt-topic-scout` |

The body SHALL state that these role specs are Phase-Agent-loaded guidance used to construct relay slot `task.md`; they are not manifest lifecycle phase nodes and are not globally loaded shared guidance through `manifest.shared[]`.

#### Scenario: Shared schemas references renamed role specs

- **WHEN** Agent reads `shared-schemas.md` for relay role spec paths
- **THEN** it SHALL see the `subagent-dpt-*` filenames
- **AND** it SHALL NOT be directed to `phase-wave0-subagent.md`, `phase-wave1-subagent.md`, or `phase-wave2-subagent.md` for current-contract behavior
