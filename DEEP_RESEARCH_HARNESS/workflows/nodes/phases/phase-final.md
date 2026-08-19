---
node_type: phase
id: phase-final
phase: final
gate: null
stop: "yes"
execution_contract:
  surface: phase-agent
  search_policy: no_search
suggested_context:
  - shared/shared-schemas
  - shared/shared-anti-cheating-rules
---

# Phase: Final - Deliver And Refine In Place

> **Lifecycle terminal, delivery interactive**: Final has `gate: null`, no
> `next`, and no `transitions.chain.json` entry. It remains the current node
> while a delivered report is discussed and refined. That conversation adds no
> Final Gate, transition, satisfaction fact, profile counter, or trace event.

## 0. Execution Brief

- **Objective**: After the exact Readiness status synchronization, publish the
  current lineage's missing primary report immediately, show it, and remain in
  Final for bounded presentation revisions.
- **Start here**: Read the accepted current-lineage HITL2 handoff, verified
  bundle evidence and limitation surfaces, the HITL1 controls baseline when
  present, the newest complete matching Decisions revision on rerun, Wave2
  Current Intent Coverage when present, `rb_status.json`, `rb_trace.jsonl`, and
  the latest canonical primary Final report when one is already bound.
- **Path to pass**: First Final entry with an admitted empty inventory publishes
  `final/final.md`. An admitted post-C5 return with zero canonical append
  publishes the next global version. A current-lineage report is refined only
  in response to clear presentation feedback.
- **Completion check**: A report is presented only after
  `publish-final-report` returns `committed`; Final then remains available for
  the next user turn. A satisfied turn writes nothing.
- **Failure posture**: Keep retained staging on backing/publication rejection;
  repair that staging or its legal backing and retry the same publisher. Do not
  ask the user to run commands or manufacture a lifecycle fact.

## 1. Stage Goal

Final delivers the user-facing primary report, not a fixed pain-point, view, or
feature. The current accepted handoff establishes the verified research
boundary; a feature label only describes one presentation version.

The legal delivery order is:

```text
admitted Final entry -> advance-status --to readiness_passed
  -> current lineage has no bound report: publish immediately
  -> show latest report and invite feedback
  -> clear presentation request: publish one immutable next version
  -> satisfied: end this turn without a write
  -> new evidence/research: accepted C5 request and existing rerun path
```

The entry admission is already Engine-owned. It is either the bundle-wide empty
primary baseline for the first Final load, or the exact C5 event-bound prior
full inventory for a newer Final load. Do not reinterpret a report written
after entry as a premature file, and do not treat an old report as delivery for
a newer lineage.

## 2. Required Inputs

- A route-bound `phases/phase-final.md` load whose entry admission succeeded.
- The exact Readiness source status synchronization:
  `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <bundle> --to readiness_passed`.
- The current lineage's accepted HITL2 handoff/receipt, all earlier lineage
  history, and verified wave/evidence artifacts. Preserve them; do not rewrite
  them for a presentation revision.
- `rb_plan.md## Constraints > ### User Research Controls` as the immutable HITL1
  baseline when present; for current-contract rerun N, the newest complete
  `rb_plan.md## Decisions > ### Rerun intent revision: N`; and the Wave2
  `## Current Intent Coverage` projection when present. Older revisions remain
  history and do not reactivate withdrawn obligations.
- The current-lineage `composition_handoff`. Research controls/amendments own
  research obligations; this handoff owns reader, use, view, foregrounding,
  compression, language, evidence exposure, and appendix posture.
- `rb_profile.yaml`, `rb_status.json`, and `rb_trace.jsonl` as current runtime
  facts, plus the canonical `final/` inventory and latest report when present.
- The current user turn. It may guide presentation, but it cannot create
  Engine authority, publication evidence, or a C5 request by itself.

If the current lineage's handoff, verified evidence, or Final admission facts
are missing or drifted before first delivery, expose that upstream boundary.
Do not fill it from chat, rationale, receipts, timestamps, directory order, or
an older report. Controls, Decisions, or synthesis coverage cannot manufacture
missing/stale current-lineage composition semantics; conversely, presentation
preferences cannot weaken research controls, current limitations, uncertainty,
contradictions, or backing obligations.

## 3. Allowed Actions

- Compose from verified evidence, current research-intent owners, current
  answerability/limitation surfaces, and the accepted current-lineage handoff.
- Keep every primary report complete and reader-facing, with a `## Evidence
  Map` containing `Finding ID`, `Declared Key Finding`, and `Submitted
  Backing`; each backing is a safe link to submitted backing.
- Write a complete retained staging report, then use only:

  ```bash
  node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs publish-final-report --bundle <bundle> --source <retained-staging> [--feature <safe_snake_case>]
  ```

  The Engine allocates `final/final.md` only for an empty bundle-wide primary
  series and otherwise the next global version. The caller never selects a
  primary target, version, CAS, overwrite, or force flag.
- On `committed`, present the exact latest report. On a backing or publication
  rejection, retain staging, repair the named map row/backing or run the
  reported sweep boundary, then retry the same publisher.
- For clear presentation feedback about existing verified content, reground in
  the latest report and publish exactly one immutable revision. Reader, order,
  length, phrasing, sectioning, explanation depth, and evidence exposure may
  change without changing research meaning, material limits, or accepted HITL2
  handoff fields. This presentation-only path never rewrites the controls
  baseline or appends a Decisions revision.
- For materially ambiguous presentation feedback, ask one minimum clarification
  before publishing the next version. Do not turn a clear request into an
  extra confirmation.
- When the user is satisfied, finish the current interaction with no report,
  state, profile, status, Gate, trace, counter, pointer, or event write.
- When the request needs a new source, Topic, evidence, research conclusion,
  or research-profile change, use the existing audited post-final C5
  inspect/apply/recover route. Only evidence-expanding work uses audited C5.
  Presentation feedback alone remains here.

### 3a. Composition And Revision Discipline

For every first or post-rerun primary report, re-read verified answers, material
contradictions, limitations, confidence boundaries, root must-answer coverage,
submitted backing, the applicable controls baseline, newest complete matching
revision, Wave2 Current Intent Coverage, and current-lineage
`composition_handoff`. Choose a narrative spine appropriate to the handoff and
current user need. Existing views may change the reading path, but no revision
may hide material uncertainty or use feature labels as a second report type. A
material unfulfilled current research commitment remains visible under the
existing verified-content rules even when the requested view is compressed.

Run the same compact composition pass for base and every revision:

1. **Reground** in the accepted current-lineage handoff, verified evidence,
   baseline + newest complete matching revision, current-intent coverage, and
   latest report where one exists; a receipt is not a fallback data owner, and
   neither is a derived projection.
2. **Answer Inventory** gathers verified findings, evidence meaning, and
   submitted-backed references.
3. **Coverage and materiality** retains each must-answer's answered/partial/
   unavailable status plus material contradiction, limitation, and confidence
   boundary.
4. **Spine and placement** selects the reader path, section order, body versus
   appendix placement, and a visible reason for omitted material.
5. **Draft and self-check** verifies coverage, Evidence Map, and backing before
   invoking the canonical publisher.

The accepted views remain distinguishable: `profile_default` is
profile-appropriate; `executive_brief` is decision-first; `evidence_map` is
evidence-first; `claim_judgment` is claim-first; `technical_deep_dive` is
mechanism/dependency-first; and `custom` follows accepted instructions within
verified boundaries. A presentation revision may use any suitable reading path
without rewriting the accepted HITL2 `final_report_view` or
`composition_handoff`.

The first admitted empty-bundle lineage must compose and publish before asking
anything. A post-C5 Final lineage with an admitted zero-append prior inventory
also composes and publishes before asking, using the next global version rather
than recreating the base. Only a lineage already bound to a latest report waits
for or acts on presentation feedback.

## 4. Expected Artifacts

- First admitted empty primary inventory: committed `final/final.md`.
- Later revision or post-C5 first delivery: committed
  `final/final_v<N>.md` or `final/final_<feature>_v<N>.md`, with one global
  contiguous `N` across labels.
- Every primary version is independently backed, immutable, and retains all
  earlier report bytes. The canonical inventory, not a profile counter or
  current pointer, supplies version/latest facts.
- The terminal status remains `current_gate: readiness_passed`,
  `next_gate: none`, and `current_node: phases/phase-final.md` after delivery
  and revisions.

The publisher is a mechanical durability/backing result. Legal delivery also
requires the current Final lineage, admitted entry, and Readiness status
synchronization. Neither the Engine nor this node judges report quality or user
satisfaction.

## 5. Gate Command

None. Final has `gate: null` and no outgoing Gate CLI.

## 6. On Gate Pass

N/A. The prior Readiness Gate is the final lifecycle Gate. Its status must be
synchronized before Final composition or publication.

## 7. On Gate Fail

N/A. Final has no Gate. A publisher or backing result is feedback about
retained staging and durability, not a Final verdict, transition, or report
quality assessment.

## 8. Stop Behavior - Deliver First, Then Refine

`stop: "yes"` is Final-specific: it is not an instruction to wait before the
first report. After admitted entry and the exact Readiness status sync, first
delivery is immediate. After each committed report, show it and invite ordinary
natural-language feedback while staying on Final.

Use Chinese for report narrative and delivery/feedback language unless the user
asks for another language. Keep canonical paths, commands, field names, enums,
citations, and source titles unchanged.

Do not create a menu, third HITL, or repeated confirmation. The user decides
whether a report is satisfactory; the Agent interprets presentation requests
and performs the bounded rewrite; the Engine validates direct lifecycle,
inventory, backing, and durable-commit facts only.

## 9. Anti-Cheating Rules

- **MUST NOT wait for feedback before a current lineage's missing first
  delivery.**（先发布再邀请反馈的次序契约见本 phase §4 的 delivery 段；empty-bundle
  base 与 admitted zero-append post-C5 delivery 都先发布）
- **MUST NOT add a Final Gate, `next`, self-transition, satisfaction field,
  delivery trace event, revision counter, current pointer, or handoff rewrite.**
- **MUST NOT overwrite, delete, rename, or renumber a committed primary
  report.** Use `publish-final-report`; never use generic persistence or a
  caller-chosen primary target.
- **MUST NOT use chat memory, mtime, filename order, or report content to infer
  lineage, entry, version, or satisfaction.**
- **MUST NOT treat a previous lineage's report as delivery for a newer C5
  return.** It needs the admitted prior inventory and a new global append.
- **MUST NOT route presentation-only feedback through C5/HITL2 or mutate the
  accepted profile/composition handoff, controls baseline, or Decisions.** Only
  evidence-expanding work uses audited C5 before a newer intent revision can
  become current.
- **MUST NOT infer delivery semantics from research controls/coverage or weaken
  research obligations from presentation intent.** Missing/stale
  `composition_handoff` remains its existing boundary; compression cannot hide
  a material limitation or unsupported current commitment.
- **MUST NOT claim that Engine feedback proves report quality, semantic
  improvement, feedback classification, or genuine user satisfaction.**
- **MUST NOT fabricate Evidence Map backing, lifecycle trace, receipts, or
  runtime facts.** See `shared/shared-anti-cheating-rules.md` for global rules.

## Log

`_logs/run.log` may contain diagnostics only. It is not delivery or version
authority and must not substitute for the committed primary report inventory.
