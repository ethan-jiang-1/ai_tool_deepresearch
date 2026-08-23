# 2026-08-22-de-spawn-bundle-instantiation

WS-B: replace per-test bundle-instantiation subprocess spawns (NEW_BUNDLE, ~620ms each) with once-instantiated template + fs.cpSync clone (~30ms) in the six highest-value CLI/e2e suites; keep plan_basename/identity semantics identical (clone naming mirrors new-disposable-bundle; setup-ready keeps its basename-consistency check via plan_basename patch).
