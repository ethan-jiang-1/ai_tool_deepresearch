# Data Isolation

多个 bundle 并行运行，各自的控制文件和 seed_topics 数据互不污染。

## ADDED Requirements

### Requirement: Multiple bundles can coexist in the same runs/ directory
Two bundles SHALL be loadable simultaneously, with each returning its own independent state.

#### Scenario: Two bundles loaded side by side
- **WHEN** `loadBundle('runs/bundle-a')` and `loadBundle('runs/bundle-b')` are called
- **THEN** each returns a `BundleState` with its own independent data

#### Scenario: Modifying one bundle does not affect the other
- **WHEN** `bundleA.status.current_gate` is changed to `wave0_complete`
- **THEN** `bundleB.status.current_gate` remains unchanged

### Requirement: Each bundle has its own seed_topics/
Every bundle SHALL own its own `seed_topics/_reference/` and `seed_topics/_artifacts/` directories, never sharing them with other bundles or the framework.

#### Scenario: Bundle A references don't appear in Bundle B
- **WHEN** a reference file is written to `runs/bundle-a/seed_topics/_reference/`
- **THEN** `runs/bundle-b/seed_topics/_reference/` remains empty
