# Case-137 Runtime Outcome

This change-local record indexes the retained Supervisor result. It is not a
replacement for the run-owned report, audit, logs, or native completion.

## One-Shot Invocation

- batch_id: `53e68120-9201-45e0-9e9b-df83ad811779`
- case: `case-137-standard-fast-final-composition`
- quarantined playbook: `experiments_playbook/exp_extrem_slow/case-137-extreme-slow-final-composition.md`
- command boundary: `--timeout 45000 --health-timeout 5000 --max-total-budget-usd 20`
- run root: `/Users/bowhead/ai_tool_deepresearch/.exp-bundles/runs/53e68120-9201-45e0-9e9b-df83ad811779/001-case-137-standard-fast-final-composition-84f5ac60-dcca-423f-9a21-afab26775321`
- retained report: `/Users/bowhead/ai_tool_deepresearch/.exp-bundles/_reports/53e68120-9201-45e0-9e9b-df83ad811779.json`
- retained logs: `/Users/bowhead/ai_tool_deepresearch/.exp-bundles/_logs/53e68120-9201-45e0-9e9b-df83ad811779/`

## Retained Result

- duration_ms: 45177
- native_outcome: null
- lifecycle_outcome: ERROR
- effective_outcome: ERROR
- agent_process: timeout
- health: null
- reason: agent_timeout
- cost_usd: 0.328053
- cleanup_status: not_attempted

## Outcome

outcome: no-evidence

The one retained result did not satisfy the conjunctive CDE-003 fast-evidence
condition because it has no native `PASS`, null lifecycle outcome, or `CLEAN`
health. Case-137 was removed from the active manifest and moved to
`experiments_playbook/exp_extrem_slow/`. The diagnostics remain preserved, the
case will not be retried by this Change, and there is no CDE-003 Agent-behavior
PASS claim.
