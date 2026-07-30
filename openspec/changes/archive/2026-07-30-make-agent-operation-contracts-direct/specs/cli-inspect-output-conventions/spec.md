> req: IOC-004

## MODIFIED Requirements

### Requirement: Inspect CLIs are documented non-gate structured-output commands

Wave inspect CLIs SHALL preserve the non-gate `{ check, inspect, advice, hints }` JSON stdout contract and no-routing behavior for every completed invocation, including caller invocation and configuration failures. Pass SHALL return `hints: []`. A known contract, invocation, or definition/config failure SHALL return a stable structured root with `rule_id`, `repair_kind`, `missing_fact`, exact next-action coordinate `write_to`, and checkpoint-appropriate `rerun`; it SHALL NOT fall back to stderr-only usage text or hand-built `{check,inspect,advice}` without `hints[]`.

Exit codes SHALL remain `0` for pass, `1` for known inspected-contract failure, and `2` for invocation/configuration failure. A missing `--bundle` value SHALL identify the missing required argument and return a command template containing `<bundle-path>`; because no runtime bundle was resolved, it SHALL NOT fabricate an absolute path. A definition parse/load failure SHALL preserve the same Gate-definition schema coordinate returned by the shared parser and SHALL use `repair_kind: missing_contract` with the exact framework contract boundary rather than suggesting edits inside an arbitrary run bundle.

Shared artifact/provenance failures SHALL be projected from the same `wave-contract-findings.mjs` finding used by the formal Gate. Inspect-only advisory findings MAY use that same shape, but SHALL remain non-blocking and SHALL NOT acquire formal routing or durable side effects.

Before resolving a bundle or loading a Wave definition, each Wave inspect CLI
SHALL parse its public invocation. Its only legal forms are one standalone
`--help` or `-h`, or exactly one `--bundle <bundle-path>` pair with no positional
arguments. Help SHALL write its static usage/help response, exit `0`, and
perform no bundle read, evaluator call, or side effect. A bare positional path,
missing, duplicate, unknown, incomplete, option-looking, or
nonexistent/not-directory bundle argument SHALL instead return the existing
structured non-gate invocation/configuration envelope with exit `2`. Only a
validated resolved bundle directory may appear in a domain finding's
`write_to`, `rerun`, or checkpoint command. An untrusted option token or an
unvalidated path SHALL never be reflected into those repair coordinates.

#### Scenario: Missing bundle still returns structured inspect JSON

- **WHEN** `inspect-wave1-output.mjs` is invoked without a bundle argument
- **THEN** stdout SHALL contain `{ check, inspect, advice, hints }` with a stable invocation root and exit code `2`
- **AND** the hint SHALL show the required `--bundle <bundle-path>` command template without claiming an absolute bundle root

#### Scenario: Definition configuration failure cannot omit repair coordinates

- **WHEN** a Wave inspect CLI cannot schema-parse its Gate definition
- **THEN** it SHALL return exit code `2` with a structured definition/config root in `hints[]`
- **AND** it SHALL NOT emit an inspect/advice-only object or suggest editing runtime artifacts to repair framework configuration

#### Scenario: Inspect failure is repairable output failure

- **WHEN** an inspect-wave CLI detects malformed or missing wave artifacts
- **THEN** it SHALL emit structured inspect/advice detail
- **AND** it SHALL use the documented non-gate failure class rather than phase-routing semantics

#### Scenario: Missing bundle is invocation error

- **WHEN** an inspect-wave CLI is called without the required bundle argument
- **THEN** it MAY use code `2` as caller invocation error
- **AND** the framework exit-code docs SHALL list this as a non-gate command class

#### Scenario: Help never becomes a Wave artifact verdict

- **WHEN** any `inspect-wave{0,1,2}-output.mjs` command is invoked with
  `--help` or `-h`
- **THEN** it SHALL exit `0` after static help output
- **AND** it SHALL not load a Gate definition, resolve a bundle, or emit a
  Wave-domain finding

#### Scenario: Unsafe invocation input cannot become a rerun command

- **WHEN** a Wave inspect caller supplies an option token or nonexistent path
  in place of a valid bundle directory
- **THEN** the command SHALL return one structured invocation/configuration
  root with exit `2`
- **AND** its `write_to`, `rerun`, and command hint SHALL use only a stable
  placeholder or a validated bundle coordinate, never the supplied token

#### Scenario: Bare bundle path is rejected before Wave evaluation

- **WHEN** an inspect-wave CLI receives `<bundle-path>` without `--bundle`
- **THEN** it SHALL return the structured non-gate invocation envelope with exit
  `2` before it resolves the path, loads a definition, or evaluates Wave output
- **AND** its repair coordinate SHALL use the documented `--bundle
  <bundle-path>` template rather than echo the supplied path
