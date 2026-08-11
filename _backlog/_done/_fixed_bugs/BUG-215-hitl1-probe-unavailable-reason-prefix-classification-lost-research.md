# Research Finding: BUG-215 HITL1 Unavailable Classification and Capability Scope

> Historical note: this investigation describes the pre-v0.86 search-first,
> reason-prefix Gate behavior. It was superseded by
> `rebuild-hitl1-source-access-alignment` (v0.86, `10b42247c`), which records a
> fixed China/overseas direct-sample observation and keeps material access
> alignment in the existing HITL1 conversation. See the paired BUG-215 card for
> the resolution and current regression evidence.

- Date: 2026-08-11
- Scope: Primary-source review of the supplied BUG-215 card, accepted OpenSpec specifications, current Harness guidance and JavaScript, and existing tests. No provider run bundle or external network result was inspected.
- Question: What is the current meaning of HITL1 `research_access` unavailable reasons, where is adapter-root classification lost, and what would a robust fix need to preserve?
- Citation form: repository-relative `path:line` references identify the owning source for each material claim.

## Bounded Verdict

BUG-215 records a real reported failure pattern: three HITL1 probes returned
`unavailable`, with search returning candidates while native fetch and the bounded
curl fallback did not yield qualifying content. The reported run then remained at
the HITL1 gate. This is a bug-card observation, not a provider run independently
reproduced by this review. `_backlog/bugs/BUG-215-hitl1-probe-unavailable-reason-prefix-classification-lost.md:15-30`

The deterministic classification loss is directly supported by the current
contracts. The selected adapter exposes two routeable roots,
`surface_absent` and `permission_required`; `ProfileSchema` accepts every trimmed
non-empty unavailable `reason`; the Phase writes a schema-valid probe return
unchanged; and the Gate recognizes an adapter root only by parsing the text before
the first colon. An unprefixed but schema-valid reason therefore takes the generic
unavailable branch rather than the adapter-owned projection.
`DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md:48-54`
`DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs:30-39`
`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md:138-143`
`DEEP_RESEARCH_HARNESS/host_tools/lib/research-access-adapter.mjs:122-130`
`DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs:162-189`

The defect is not evidence that every unavailable outcome should be forced into
one of those two roots. The accepted schema intentionally requires only direct
failure facts and a non-empty reason, and the probe guide permits unclassified
no-candidate, exhausted, and no-legal-path reasons. The existing adapter unit test
also explicitly treats `network_error:` as unrecognized. A fix that merely makes
the two prefixes mandatory would conflict with those current contracts.
`openspec/specs/engine/schema-core/spec.md:60-75`
`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:45-51`
`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:116-123`
`tests/host_tools/research-access-adapter.test.mjs:55-63`

## Current Contract and Data Flow

| Surface | Current owner and behavior | Effect of an unavailable result |
| --- | --- | --- |
| Isolated probe | It performs one fixed neutral search, considers at most three returned eligible URLs, tries native fetch first, and may use one exact same-URL curl fallback when independently permitted. It returns only one compact observation and has no bundle, receipt, evidence, or Gate authority. `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:15-35` `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:37-84` | The probe's return is transient until the Phase persists it. `DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md:39-46` |
| HITL1 Phase | The Phase spawns exactly one isolated probe, is the only `rb_profile.yaml#/research_access` writer, and writes a valid returned observation unchanged. On spawn, no-return, or invalid-return failure, it writes a synthetic unavailable reason beginning `probe_agent_spawn_failed:` or `probe_agent_return_invalid:`. `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md:136-141` | Recorded HITL1 semantics remain preserved; the Phase reruns the same probe and same Gate and may not enter Setup before success. `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md:143-145` |
| Profile state | `research_access` is a status-discriminated direct observation. An unavailable branch requires timestamp, non-success outcome, and non-empty reason; candidate count/ordinal describes considered candidates but is not a URL history or HTTP matrix. `openspec/specs/engine/schema-core/spec.md:60-75` | The raw reason is durable Phase-owned state. The style writer must preserve a valid available or unavailable observation unchanged. `openspec/specs/research/research-styles/spec.md:123-125` |
| HITL1 Gate | The definition checks only `rb_profile.yaml#/research_access/status == available`; missing, unprobed, or unavailable access fails and cannot authorize Setup or silent waves. `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-hitl1-recorded.definition.json:22-28` `openspec/specs/research/pre-research-gate-implementation/spec.md:82-88` | For an unavailable result, the checker reads `reason`, recognizes only the two adapter prefixes, and otherwise emits generic `external_action` feedback pointing at the reason. `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs:162-189` |
| Gate projection and audit | `hints[]` is a read-only projection of a structured finding. A failing gate writes a failure diagnostic containing `check`, `routing`, `inspect`, `advice`, and `hints`, then writes a `gate_attempt` audit row to `rb_trace.jsonl`. `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs:453-562` `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs:806-908` `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs:1210-1278` | Classification changes the projected `missing_fact`, `write_to`, and repair prose, not the raw observation's truth or the Gate's binary status test. `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs:176-189` |

The probe does not create a work-unit runtime receipt or evidence contribution.
Both the accepted phase specification and the shared probe guide prohibit a
parallel receipt, ledger, cache, artifact, reference, or coverage surface. Gate
audit diagnostics are distinct from probe evidence and from work-unit receipts.
`openspec/specs/research/pre-research-phase-content/spec.md:60-71`
`openspec/specs/research/pre-research-phase-content/spec.md:121-128`
`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:15-27`

## Reason Taxonomy: Routeable Roots Versus Raw Facts

1. **Routeable selected-adapter roots.** If the callable native surface is absent,
   the adapter requires `surface_absent:`. If selected-host policy denies a
   declared operation, it requires `permission_required:`. The accepted Gate
   feedback requirement is to name the selected adapter contract, host/provider
   boundary, and same probe/Gate rerun for either root.
   `DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md:48-54`
   `openspec/specs/research/research-access-adapter/spec.md:30-53`
   `openspec/specs/research/pre-research-gate-implementation/spec.md:311-330`

2. **Honest unclassified direct failures.** The probe can truthfully report a
   failed/blocked/no-candidate/no-legal-path outcome without establishing either
   adapter root. It must retain the final considered URL and outcome when it did
   consider a candidate, while the schema accepts a direct non-empty reason rather
   than a closed prefix enum. This includes transport, destination, response, or
   content failures when the direct observation does not establish absent surface
   or host policy denial.
   `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:45-51`
   `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:116-127`
   `openspec/specs/engine/schema-core/spec.md:63-75`

3. **Synthetic Phase relay failures.** A failure to spawn or validate the isolated
   probe is not a report about WebSearch, WebFetch, curl, a destination, or host
   policy. The Phase nonetheless records it in the existing unavailable branch
   using the two `probe_agent_*` prefixes. The current Gate assigns
   `external_action` to every unavailable status before it knows whether the
   reason is an adapter root, so these synthetic reasons also receive that generic
   repair kind. The accepted sources do not specify the correct future
   `repair_kind` for these synthetic facts; that is an unresolved design decision.
   `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md:140-143`
   `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs:164-189`
   `openspec/specs/engine/check-inspect-feedback/spec.md:61-71`

4. **Why text guessing is unsafe.** The Gate's current root parser does only a
   prefix lookup, and accepted Gate guidance forbids deriving blocking repair
   identity or repair lineage from prose/prefix matching after evaluation. A
   robust design therefore needs a direct, validated routeable fact for the cases
   that truly are adapter roots; it should not broaden a free-text keyword
   classifier over arbitrary raw reasons.
   `DEEP_RESEARCH_HARNESS/host_tools/lib/research-access-adapter.mjs:122-130`
   `openspec/specs/engine/gate-skeleton/spec.md:270-276`

## Capability Model and Limits of Inference

The following layers are an analytical model requested for BUG-215. Only the
specific source-backed facts in the middle column are current behavior; the model
names are not new accepted runtime fields.

| Layer | What the current probe establishes | What it does not establish |
| --- | --- | --- |
| Control-plane reachability | A configured launcher can start the selected Agent runtime. The launcher, `--check`, configuration, shell availability, and chat text are explicitly not research-access or tool-permission proof. `DEEP_RESEARCH_HARNESS/host_tools/README.md:29-36` `openspec/specs/research/research-access-adapter/spec.md:23-28` | It does not prove native search/fetch capability, an external data-plane route, or access to any destination. This is the source-backed limit behind the requested "control-plane" distinction. `DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md:42-46` |
| Search capability | The probe makes one exact Wikipedia-scoped query and may use actual returned eligible HTTP(S) URLs in provider order. `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:37-58` | It does not prove fetch content, another query's result class, or a later Wave's source route. The guide expressly says the probe does not prove future research work will be available. `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:33-35` |
| Fetch/runtime surface | An `available` observation requires real requested-page content for the exact returned URL via native fetch or a permitted same-URL fallback. Command exit, snippet, empty body, or challenge/error content is insufficient. `openspec/specs/research/research-access-adapter/spec.md:55-87` `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:60-78` | One successful content result does not prove all fetch destinations, stability, arbitrary shell egress, or a provider-wide availability claim. `DEEP_RESEARCH_HARNESS/RUN.md:18-22` `DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md:56-59` |
| Destination-class and network reachability | Current `research_access` retains only one direct observation and bounded candidate metadata; it intentionally retains no query history, candidate list, retry list, or HTTP-status matrix. `openspec/specs/engine/schema-core/spec.md:66-75` | It cannot distinguish a globally absent fetch surface from a target-class, regional, DNS, policy, TLS, CDN, or routing restriction. Any such conclusion requires a new, explicitly modeled observation rather than inference from a single Wikipedia target. This is a design requirement, not a current fact. |
| Latency and stability | The only specified fallback timing budget is `curl --max-time 15`; availability still requires actual page content. `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:64-78` | A timeout means no qualifying result arrived within that bounded attempt. It does not, by itself, prove permanent unreachability, nor does one quick success prove duration, reliability, or future stability. The latter distinctions are design requirements; no accepted latency/stability contract was found in the scoped sources. |
| Research-scope/Wave capability | Waves perform role-bound native observations before claim. The accepted delegated-work contract expressly prohibits treating generic HITL1 access as a role-bound native observation. `openspec/specs/research/research-wave-phase-content/spec.md:957-987` `openspec/specs/agent/delegated-work-units/spec.md:1763-1775` | HITL1's one generic observation cannot prove that a particular Wave role, topic, source class, or evidence route will succeed. Wave gates require submitted backing or an explicit limitation/backing root rather than a bare access assertion. `openspec/specs/research/research-wave-gate-implementation/spec.md:625-669` |

## Fixed-Target False Negative Is a Separate Concern

The current probe is intentionally fixed to `site:wikipedia.org "Internet protocol
suite"`; its binary Gate admits later phases only when the resulting observation is
`available`. `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:37-51`
`DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-hitl1-recorded.definition.json:22-28`

The bug card records a user-provided China-network context and reports that the
fixed candidate family was Wikipedia/mirrors, while other domains might be
reachable. That is a plausible target-class hypothesis from the report, but it was
not independently tested here. It is distinct from the missing adapter-root
classification: a correctly prefixed `permission_required:` could still be too
coarse to describe a destination-specific or latency-bounded failure, and an
unprefixed transport/target failure should not be falsely normalized into either
adapter root.
`_backlog/bugs/BUG-215-hitl1-probe-unavailable-reason-prefix-classification-lost.md:56-86`
`openspec/specs/engine/schema-core/spec.md:95-105`

Current behavior intentionally fails closed: unavailable access cannot add a
degraded pass or alternate Setup route. The existing Wave degradation mechanism is
narrower: only eligible quality-only roots may degrade, while structural,
provenance, queue, receipt, lifecycle, configuration, routing, and checker-owned
roots remain blocking. Therefore, allowing a Wave after partial destination-class
coverage would require an explicit new accepted entry/degradation/limitation
contract; it cannot be created by changing HITL1 advice prose.
`openspec/specs/research/pre-research-gate-implementation/spec.md:82-88`
`openspec/specs/research/pre-research-gate-implementation/spec.md:321-323`
`openspec/specs/research/research-wave-gate-implementation/spec.md:1331-1384`

## Existing Contract Coverage

| Coverage | What it proves | Gap relevant to BUG-215 |
| --- | --- | --- |
| Profile schema unit tests | A generic unavailable reason and generic no-candidate/exhausted reasons parse successfully. `tests/schema/contracts/profile.test.mjs:149-225` | No test requires a routeable classification only for known adapter-root observations. |
| Adapter helper unit tests | A `permission_required:` reason resolves to the selected fact while `network_error:` resolves to `null`. `tests/host_tools/research-access-adapter.test.mjs:55-63` | No test covers colonless, malformed, or Phase-synthetic reasons at the Gate projection boundary. |
| HITL1 Gate integration | A generic unavailable reason deliberately returns `external_action` and points at `research_access.reason`. `tests/integration/cli/check-gate-hitl1-recorded.test.mjs:330-354` | It does not require an explicit diagnostic that a known adapter root was omitted from a raw reason. |
| Adapter integration | Both known prefixes direct the hint to the adapter contract and its selected owner, while still blocking Setup. `tests/integration/cli/hitl1-research-access-adapter.test.mjs:64-92` | It covers positive routing only, not raw-reason preservation plus separately routeable classification. |
| End-to-end unavailable loop | An unavailable adapter-root observation preserves HITL1 choices, retains the direct observation, and does not leak probe output into research/evidence surfaces. `tests/e2e/hitl1-research-access-adapter.test.mjs:35-90` | It does not exercise destination-class, latency, or partial-coverage admission. |
| Markdown contract tests | The static guides contain the one-spawn, verbatim relay, synthetic `probe_agent_*` reasons, fixed query, prefix examples, and evidence boundary. `tests/integration/md/phase-hitl1-research-access.test.mjs:53-102` | Static text checks cannot prove a provider result or validate the semantic classification chosen by a weak probe model. The accepted spec similarly says fixtures cannot prove provider availability or real Agent behavior. `openspec/specs/research/research-access-adapter/spec.md:89-105` |

Focused deterministic verification was run in this workspace:

```bash
node --test tests/schema/contracts/profile.test.mjs \
  tests/host_tools/research-access-adapter.test.mjs \
  tests/integration/cli/check-gate-hitl1-recorded.test.mjs \
  tests/integration/cli/hitl1-research-access-adapter.test.mjs \
  tests/e2e/hitl1-research-access-adapter.test.mjs \
  tests/integration/md/phase-hitl1-research-access.test.mjs
```

The result was 52 passing tests and one failure. The failure is a static-string
drift in `tests/integration/cli/hitl1-research-access-adapter.test.mjs:117-124`:
it expects an older exact Chinese phrase, while the current Phase text preserves
the same no-user-run-curl/no-profile-hand-edit rule with added wording.
`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md:143`
This was observed during this research pass and was not modified.

## Requirements Implied by a Robust Change

These are source-derived requirements, not a selected implementation design.

1. **Preserve raw direct reasons.** Existing valid unavailable observations,
   legacy compatibility, no-candidate/no-legal-path outcomes, and synthetic
   Phase failures must remain representable without claiming a false adapter root.
   `openspec/specs/engine/schema-core/spec.md:60-75`
   `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:116-123`
   `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md:140-143`

2. **Make known adapter roots routeable at the return/relay boundary.** When a
   direct observation really establishes absent callable surface or selected-host
   policy denial, the durable observation presented to the Gate must carry an
   unambiguous, validated routeable fact that yields the required adapter-owned
   feedback. The storage shape and validation location remain a design choice, but
   free-text post-hoc keyword inference is not a defensible substitute.
   `openspec/specs/research/research-access-adapter/spec.md:30-53`
   `openspec/specs/research/pre-research-gate-implementation/spec.md:311-330`
   `openspec/specs/engine/gate-skeleton/spec.md:270-276`

3. **Give unclassified and synthetic failures an honest owner/repair boundary.**
   The result must not imply that an arbitrary transport, target, timeout, or
   malformed-probe result is the selected host's absent surface or permission
   policy. It must also not label a Phase relay failure as a user-solvable external
   prerequisite without an accepted owner. The exact future repair kind for those
   cases is unresolved, but the feedback contract requires one direct fact, one
   owner/boundary, and one reachable same-check action or `missing_contract`.
   `openspec/specs/engine/check-inspect-feedback/spec.md:55-71`
   `openspec/specs/engine/check-inspect-feedback/spec.md:126-160`

4. **Keep the existing authority and evidence boundaries.** The Phase remains the
   sole profile writer; the probe remains outside receipts, work units, evidence,
   and Gate execution; only a passing accepted Gate may advance to Setup. A fix may
   not introduce a retry tree, profile hand edit, provider bypass, parallel
   receipt, or implicit alternate Setup route.
   `openspec/specs/research/pre-research-phase-content/spec.md:54-80`
   `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md:138-145`
   `openspec/specs/research/pre-research-gate-implementation/spec.md:321-323`

5. **Specify capability scope before treating a probe as Wave admission.** A
   multi-target/source-class design needs a bounded, declared set of destination
   classes tied to the planned research scope; a direct per-class result that
   distinguishes search, fetch surface, qualifying content, policy denial,
   transport/target failure, and timeout-within-budget; and an evidence/storage
   boundary that does not silently turn probe material into research backing. The
   present profile expressly cannot become a full query/history/HTTP matrix, so the
   durable location for such a model requires an OpenSpec design decision.
   `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:86-127`
   `openspec/specs/engine/schema-core/spec.md:73-75`
   `openspec/specs/research/research-access-adapter/spec.md:89-105`

6. **Define legal partial-coverage behavior rather than equating it with global
   availability.** Before a Wave may proceed on partial capability coverage, an
   accepted policy must name which source classes are in scope, which Wave/role
   observations remain mandatory, how limitations are carried into evidence and
   final delivery, and which direct failures remain blocking. Existing Wave rules
   already require submitted backing or an explicit limitation/backing root; they
   do not authorize a generic access-based bypass.
   `openspec/specs/agent/delegated-work-units/spec.md:1763-1775`
   `openspec/specs/research/research-wave-phase-content/spec.md:957-987`
   `openspec/specs/research/research-wave-gate-implementation/spec.md:625-669`

7. **Test the boundaries, not just the happy prefixes.** Regression coverage
   should include: correctly routeable surface and policy roots; raw unclassified
   transport/target/content failures; `probe_agent_*` relay failures; a timeout
   treated as a bounded latency observation rather than permanent unreachability;
   target-class partial coverage; no false Setup/Wave admission; retained choices;
   and no probe leakage into evidence or receipts. The exact number of samples,
   source classes, latency budget, stability window, and allowed degradation route
   are not defined by the current accepted sources and require an explicit proposal.
   `tests/integration/cli/hitl1-research-access-adapter.test.mjs:64-124`
   `tests/e2e/hitl1-research-access-adapter.test.mjs:68-87`
   `openspec/specs/research/pre-research-gate-implementation/spec.md:82-88`

## Open Decisions and Non-Claims

- This review does not select a new prefix, enum, state file, target list,
  sampling count, timeout, retry policy, or degradation route. Those are not
  present in accepted behavior and would change the current HITL1 admission
  contract.
- The reported Wikipedia/China-network behavior is retained as user-supplied bug
  context; it is not generalized to all providers, domains, or deployments.
  `_backlog/bugs/BUG-215-hitl1-probe-unavailable-reason-prefix-classification-lost.md:56-86`
- The report's broad statement that the current fixed probe proves later research
  waves are globally usable is narrower in the accepted guidance: the probe is a
  bounded observation and does not prove future research work will be available.
  `_backlog/bugs/BUG-215-hitl1-probe-unavailable-reason-prefix-classification-lost.md:32-50`
  `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md:33-35`

## Recommended Decision Sequence

This is a recommended sequencing of future decisions, not an accepted design or
permission to implement.

1. Open a narrow proposal for structured, routeable classification and the relay
   regression only, without changing HITL1 admission semantics.
2. Run real selected-host experiments in the target network against a bounded,
   declared target set, measuring control-plane, search, fetch, content, and
   latency outcomes separately.
3. Use that evidence to propose scope-aware partial-coverage and timeout
   semantics.
4. Only then change HITL1/Wave admission and limitation behavior.
