---
bug_id: BUG-201
status: closed; Change B v0.76 2026-08-07
discovered: 2026-08-05
phase: wave1
severity: P2_validation_false_negative
---

# Wave1 Question-List Semantic Section Parser — False Negative

## Closure (2026-08-07)

Archived Change B `align-gate-contract-descriptors-and-terminal-recovery-tests`
aligned descriptor metadata with the shared semantic-section evaluator. Its
Gate-path regressions accept equivalent heading case, order, level, and spacing
while rejecting a missing or empty required section. See the
[closed remediation ledger](../_closed_plans/gate-schema-progressive-gate-schema-queue-remediation.md).

## Symptom

`check-gate-wave1-complete.mjs` rule `question_list_has_four_sections` reports
"Missing or empty semantic section(s): exploration / exploitation decision" even
when the section heading `## exploration / exploitation decision log` exists
with substantive bullet-point content (~5 detailed bullet points).

## Reproduction

1. Wave1 sub-agent writes `question-list.md` with all four required sections
2. Phase Agent fixes content iteratively to match expected format
3. Section heading `## exploration / exploitation decision log` exists
4. Section contains substantive bullet points with keywords (continue, exploit, decision, risk)
5. Dry-submit still reports section as missing/empty after multiple content fixes

## Observed in

- Topic 03 (`03_agentic-productivity-metrics`), work unit `wu-w1-b000-deep-i0008`
- 5+ iterations of content fixes all failed with same error

## Hypothesis

The semantic section parser may:
1. Require an exact heading string with trailing colon or other punctuation
2. Have a case-sensitivity issue with the slash character
3. Require specific keywords in the section body that aren't documented
4. Have a regex mismatch on the heading boundary

## Workaround

None found. Topic failed after exhausting repair attempts.

## Related

- Wave0 supplementary WU bug (similar pattern of validator rejecting valid data)
