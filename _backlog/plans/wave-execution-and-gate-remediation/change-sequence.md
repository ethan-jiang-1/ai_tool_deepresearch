# Fixed Wave/Gate Change Boundaries And Order

This appendix indexes the execution decision in the parent plan. Silent autonomous execution is intentionally excluded and is owned by [Silent Autonomous Execution](../silent-autonomous-execution.md). The roadmap has exactly three sequential OpenSpec changes.

| Order | Change | Covers | Acceptance loop |
|---|---|---|---|
| 1 | `make-pre-wave-readiness-feedback-direct` | BUG-100, BUG-101, BUG-102 | archived 2026-07-24: one bounded access sample + producer facts -> early verdict -> legal pre-Wave route or explicit no-advance |
| 2 | `make-wave-producer-contract-and-closeout-direct` | BUG-105, BUG-107, BUG-108, BUG-111, BUG-112 | proposed, ready for explore: author -> dry-submit -> mechanical repair or semantic replacement -> formal submit -> submitted-backed closeout -> inspect |
| 3 | `simplify-wave-gate-feedback-and-degradation-policy` | BUG-109, BUG-110, BUG-113 | evaluator facts -> minimal roots + shared fail-closed policy, including an inactive Wave2 positive fixture |

## 1. `make-pre-wave-readiness-feedback-direct`

This change owns the readiness route spanning HITL1, setup and seed topics. It authorizes canonical topic-state application at its legal producer point, uses one search and at most the first three eligible returned candidates for bounded fetch observation, and reuses the Gate seed parser at authoring/completion. It does not create a second topic-state owner, retry controller or YAML parser; exhausted candidates return unavailable and do not authorize Setup/Wave work.

## 2. `make-wave-producer-contract-and-closeout-direct`

This change owns the producer-to-consumer chain:

```text
canonical rich reference
  -> direct path/content/backing feedback
  -> dry-submit
      mechanical same-`work_id` repair, or semantic fail-and-replace
  -> only PASS proceeds to formal submit
  -> submitted ledger
  -> reference/index/depth/return-map closeout
  -> inspect after full drain
```

It retains one parser/evaluator for rich references, never treats fenced YAML as rich metadata, never scans files to amend provenance, and never lets a Sub-agent own Phase depth/backfill work.

## 3. `simplify-wave-gate-feedback-and-degradation-policy`

This change consumes trustworthy producer facts. It projects one structured evaluator result into minimal root-first hints and degradation eligibility; it does not alter underlying truth. Eligibility is parsed metadata, false by default, and remains fail closed for queue, provenance, structure, receipt and trace roots. One delta-spec-authorized inactive Wave2 fixture proves the adapter's positive metadata path without adding a production eligible rule.

## Execution Checkpoints

1. Correct the affected bug records and bug index before proposing Change 1.
2. [x] Propose, explore, apply, verify and archive Change 1.
3. [ ] Propose, explore, apply, verify and archive Change 2, then Change 3.
4. After each archive, run the smallest affected disposable-bundle path. Do not repair or reuse the production evidence bundle as a fixture.

The sole hard dependency is Change 2 -> Change 3: Gate feedback must consume truthful producer facts.
