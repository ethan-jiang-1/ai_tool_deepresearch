# bundle/cmd-bundle-instantiation (delta)

> req: CMI-011

## ADDED Requirements

### Requirement: Instantiation scaffolds the run-scoped tmp directory

`instantiate-run-bundle.mjs` SHALL create `_tmp/` as part of the bundle directory scaffold (alongside `_scripts/`, `_logs/`, `_cache/`), and SHALL write `_tmp/README.md` from the `_tmp/README.md.tmpl` template. The playbook `instantiate-run-bundle.md` SHALL describe `_tmp/` as the run-scoped temporary-artifact location: intermediate products of run-scoped scripts belong there, it is a non-authority runtime area that archives with the bundle, and system `/tmp/` SHALL NOT be used for run-scoped intermediates.

The scaffold SHALL NOT make `_tmp/` a gate or inspect-bundle required-shape entry: its presence is a creation-time convention, not a validation requirement, and a bundle whose `_tmp/` was removed or emptied SHALL still pass structural inspection.

#### Scenario: Fresh bundle gets the tmp scaffold

- **WHEN** `instantiate-run-bundle.mjs` creates a fresh bundle
- **THEN** the bundle contains `_tmp/` and `_tmp/README.md`
- **AND** the creator's success report mentions the tmp scaffold alongside the other data directories

#### Scenario: Playbook directs intermediates to bundle _tmp

- **WHEN** an Agent reads `instantiate-run-bundle.md` and needs a place for run-scoped script intermediates
- **THEN** the playbook SHALL direct it to the current run bundle root `_tmp/`
- **AND** SHALL direct it not to use system `/tmp/` for run-scoped intermediates

#### Scenario: Removed tmp directory does not fail inspection

- **WHEN** a bundle has no `_tmp/` directory or an empty one
- **THEN** `inspect-bundle.mjs` SHALL NOT report `_tmp/` as missing or fail for its absence
