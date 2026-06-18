# bundle-data-isolation Specification
> req: BUI-001

## Purpose
多个 Runtime Bundle 在项目根同级共存,数据互相隔离、互不污染。
## Requirements
### Requirement: Multiple bundles can coexist at project root
Two bundles (`dpt_rb_{name}`) SHALL coexist at project root, each with its own independent file set and state.

#### Scenario: Two bundles coexist side by side
- **WHEN** `dpt_rb_a/` and `dpt_rb_b/` are both present at project root
- **THEN** each has its own independent control files, data directories, and trace

#### Scenario: Modifying one bundle does not affect the other
- **WHEN** `bundleA.status.current_gate` is changed to `wave0_complete`
- **THEN** `bundleB.status.current_gate` remains unchanged

### Requirement: Each bundle has its own data directories
Every bundle SHALL own its own `reference/` and `artifacts/` directories, never sharing them with other bundles or the framework.

#### Scenario: Bundle A references don't appear in Bundle B
- **WHEN** a reference file is written to `dpt_rb_a/reference/`
- **THEN** `dpt_rb_b/reference/` remains empty

