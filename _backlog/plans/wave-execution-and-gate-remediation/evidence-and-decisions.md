# Evidence And Fixed Wave/Gate Decisions

This appendix records evidence behind the three-change Wave/Gate plan. Silent phase entry, Agent continuation and host liveness evidence are owned by [Silent Autonomous Execution](../silent-autonomous-execution.md).

## Sources Read

- `_backlog/bugs/BUG-100-...md` through `BUG-113-...md` for this plan's scope.
- Production bundle `dpt_rb_openspec-large-project-maintenance-patterns`: gate diagnostics, work units, output ledger, references, seed topics and artifacts.
- Accepted specs for HITL1/topic state, seed materialization, rich references, delegated work units, research waves and gates.
- All `guidelines/`, including `evolution-simple-reliable-control.md` and `evolution-helper-oriented-agent.md`.

## Evidence To Decision Mapping

| Bugs | Evidence | Fixed decision |
|---|---|---|
| 100 | Search succeeded while earlier first-result fetches were policy-blocked; a later result was fetchable. | Change 1 uses one search and at most the first three eligible returned candidates in order; it records one final direct observation with bounded ordinal/count facts, not query or URL history. |
| 101 | Topic state is required by HITL1 Gate, while current apply window starts only after the Gate. | Change 1 authorizes idempotent canonical topic-state apply at the legal HITL1 producer point; Gate continues to require canonical state. |
| 102 | Invalid seed YAML was first found at phase-end Gate. | Change 1 adds one owning seed-validation checkpoint immediately after authoring/batch completion, reusing the Gate parser/schema. |
| 105, 111 | Rich refs used fenced/bare YAML or noncanonical names; parser contract is bullet/colon metadata plus semantic sections, while selected canonical-prefix files were bare YAML. | Change 2 uses one canonical rich-reference contract: full topic-slug path, parser-aligned content and submitted backing as separately diagnosed roots. |
| 107, 108, 112 | Dry-submit already detects cache/receipt roots; Wave1 direct flow skipped it, formal rejects repeated and Phase closeout was omitted. | Change 2 makes dry-submit, mechanical same-attempt repair, semantic fail-and-replace, formal submit and closeout one visible Phase Agent loop. |
| 109 | 11 base failures produced 35 masked ids and 43--113 primary hints. | Change 3 projects independent prerequisite roots only in primary hints and retains full dependent detail durably. |
| 110 | Wave1 already has a narrow eligible path; observed failure set contains structural/provenance/queue roots. | Reclassify as misdiagnosed. Change 3 regression-proves existing fail-closed semantics. |
| 113 | Wave2 adapter has no degradation path although generic accepted Gate contract requires eligible repeated-failure support; current failure set is ineligible and Wave2 definitions name no eligible rule. | Change 3 adds common adapter support, default-ineligible metadata, no new production Wave2 eligible rule, and one delta-spec-authorized inactive positive fixture. |

## Fixed Design Decisions

1. The access sample performs one search and considers at most the first three eligible returned candidates in order. It records one final observation plus bounded candidate count/ordinal facts; its content never becomes research evidence or a query/URL history.
2. Topic-state application occurs through its existing transaction/workspace owner at the legal producer point, not through a manual state edit.
3. Seed validation invokes the existing parser/schema at authoring/completion; it is not a generic watcher or second YAML interpretation.
4. Rich reference path, content and submitted backing remain separate direct roots.
5. A returned Wave1 work item runs dry-submit before formal submit. Only mechanical candidate-declaration repair retains its `work_id`; a semantic post-`work_done` root follows accepted fail-and-replace, while integrity/no-path roots remain owner/terminal boundaries. Only a successful ledger row permits Phase closeout.
6. Degradation eligibility is explicit parsed metadata and false by default. Existing Wave0/1 accepted soft floors remain the only true production values; Wave2 has none until accepted specs add one. The Change 3 delta spec may authorize one inactive test fixture solely to prove adapter capability.

## Proof Boundaries

```text
deterministic contract -> unit / integration / deterministic_e2e
real Phase Agent preflight or closeout -> agent_flow_e2e + Subject evidence
real Sub-agent first return -> agent_flow_e2e + independent Sub-agent evidence
external search/fetch -> real call or NOT_RUN
```

The plan must not report a real actor outcome from a fixture, static Markdown assertion, console summary or manually repaired production bundle.

## Review Guardrails

- Rich-reference acceptance must never turn filesystem presence into submitted evidence.
- A root-first diagnostic must not delete independent failures or change pass/fail truth.
- A degraded handoff remains legal route evidence, never clean quality evidence.
- Queue, receipt, provenance, structure, trace and binding roots remain permanently fail closed.
