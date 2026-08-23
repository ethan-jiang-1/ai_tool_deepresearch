# 2026-08-22-parallelize-regression-suite

Parallel-safety fix for the regression suite: eliminate the shared tests/.test-bundles/.baseline-snapshot race across 7 CLI integration test files so the default parallel npm test run is green (~605s serial -> ~160-200s parallel); harden leftover-bundle cleanup.
