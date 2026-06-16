# bundle-data-isolation Specification

## Purpose
TBD - created by archiving change prototype-start-from-here. Update Purpose after archive.
## Requirements
### Requirement: Multiple bundles can coexist at project root
Two bundles (`dpt_rb_{name}`) SHALL be loadable simultaneously, with each returning its own independent state.

#### Scenario: Two bundles loaded side by side
- **WHEN** `loadBundle('dpt_rb_a')` and `loadBundle('dpt_rb_b')` are called
- **THEN** each returns a `BundleState` with its own independent data

#### Scenario: Modifying one bundle does not affect the other
- **WHEN** `bundleA.status.current_gate` is changed to `wave0_complete`
- **THEN** `bundleB.status.current_gate` remains unchanged

### Requirement: Each bundle has its own seed_topics/
Every bundle SHALL own its own `reference/` and `artifacts/` directories, never sharing them with other bundles or the framework.

#### Scenario: Bundle A references don't appear in Bundle B
- **WHEN** a reference file is written to `dpt_rb_a/reference/`
- **THEN** `dpt_rb_b/reference/` remains empty

