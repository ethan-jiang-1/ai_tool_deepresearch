# Autonomous Research Hardening

This ledger records the proof boundary for `harden-autonomous-research-return-map` controlled experiments. These playbooks complement unit/integration tests; they do not turn deterministic fixtures into proof of Agent search, judgment, native Sub-agent writing, or silence.

| Bug | Required proof boundary | Playbook | Distance note | Closure claim allowed |
| --- | --- | --- | --- | --- |
| BUG-033 | MD-controller boundary | `case-601-standard-wave0-fail-stays-in-phase.md` | Standard controlled loop with real bundle, gate failure, phase audit, and trace checks. No external search. | Proves Engine feedback and playbook loop detect premature final/status drift; controller compliance still depends on runner following the playbook. |
| BUG-042 | MD-controller boundary | `case-602-standard-status-drift-return-to-legal-phase.md` | Standard controlled loop around hand-edited status drift diagnostic. | Proves audit feedback names legal target and no mutation; controller compliance requires runner to act on feedback. |
| BUG-043 | MD-controller / silent boundary | `case-603-standard-surfacing-intent-abort.md` | Standard trace/log path for would-have-surfaced intent and absence of HITL/final authorization. | Proves accepted observability shape; does not claim deterministic interception of all chat output. |
| BUG-039/040 | Sub-agent actor boundary | `case-604-heavy-real-subagent-write-before-return.md` | Heavy native Sub-agent canary; must use real Sub-agent/WebSearch/WebFetch environment. | Only closes actor compliance if a real Sub-agent writes files before returning and preserves nonce through submit. |
| BUG-037 | Sub-agent actor / bundle isolation | `case-605-heavy-bundle-containment-real-subagent.md` | Heavy native Sub-agent containment canary plus `inspect-bundle`. | Only closes producer containment if real writes stay under active `bundle_dir` and repo-root leaks are absent. |

Deterministic regression tests currently close Engine boundaries for hash drift, ledger-only counting, cache content validation, phase audit outcomes, return-map shape diagnostics, and surfacing event schema. Actor behavior remains controlled-experiment evidence, not unit-test evidence.
