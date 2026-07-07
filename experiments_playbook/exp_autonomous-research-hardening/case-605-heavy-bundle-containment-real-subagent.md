---
schema: command-experiment/v1
experiment: autonomous-research-hardening
case: case-605-heavy-bundle-containment-real-subagent
weight: heavy
case_goal: "BUG-037: real Sub-agent work-unit execution writes only under active bundle_dir and repo-root leak inspection stays clean."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-605_arh_bundle_containment
trace: dpt_disp_case-605_arh_bundle_containment/rb_trace.jsonl
verdict: trace-jsonl
req: BUI-002
agent_mode: native-subagent-required
agent_dependency: real Sub-agent/WebSearch/WebFetch environment; NOT RUN when native Sub-agent execution is unavailable
---

## Execution Contract

Heavy actor-boundary containment canary. A real Sub-agent must execute the claimed work unit. The proof target is producer containment, not just Engine rejection. Inline JS may set up the bundle and record verdict checks; it may not write delegated outputs in place of the Sub-agent.

## Required Actor Assertions

- All Sub-agent-created runtime files are under the active `dpt_disp_*` bundle root.
- Repo root has no active-bundle-associated `_work_units/`, `artifacts/`, `_cache/`, `reference/`, or `final/` leak.
- `inspect-bundle` exits 0 after submit and reports no `active_bundle_blocker`.
- Any cleanup debris classification is recorded separately and does not hide active leaks.

## Steps

1. Create a disposable bundle and claim a write-producing work unit.
2. Hand `task.md`, `_beacon.json`, and spawn prompt to a real native Sub-agent.
3. Sub-agent writes declared outputs/cache/result/receipt under `bundle_dir`.
   - `result.cache_trails` must declare bundle-relative cache leaf directory paths only, not `websearch.json`, `page.md`, or `meta.json` file paths.
4. Submit through `operate-work-unit submit`.
5. Run `inspect-bundle <bundle>` from repo root.
6. Record trace checks:
   - `real-subagent-submit-succeeded`
   - `inspect-bundle-no-active-leak`
   - `repo-root-no-runtime-leak`
7. Verdict from `rb_trace.jsonl`.

Do not treat deterministic repo-root leak unit tests as closure for this heavy actor case; they only prove the classifier.
