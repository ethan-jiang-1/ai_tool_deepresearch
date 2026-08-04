## Why

BUG-192 and BUG-198 describe Agent behavior after a degraded Wave0 handoff,
but no current manifest-registered playbook observes the complete route through
the Wave2 new-evidence decision. The existing Wave2 case starts from fixture
state and has retained `NOT_RUN`, so neither it nor static guidance can prove
that the behavior is fixed or still failing.

## What Changes

- Add one manifest-registered heavy real-Agent case that establishes a current
  degraded Wave0 handoff, loads Wave1, and reaches the Wave2 new-evidence
  decision in the same preserved disposable run and one Subject session.
- Require the preserved case bundle to retain the Subject prompt, transcript,
  result, declared handoff/phase snapshots, status/trace, Gate JSON, and
  tool-call evidence. Native completion classifies `PASS`, `FAIL`, or
  `NOT_RUN` and binds its declared durable Subject evidence; the retained
  Supervisor report/audit separately classifies a pre-completion cancellation,
  error, or budget boundary. None of those outcomes becomes a production
  behavior claim.
- Add focused static integration coverage for the new case's registration,
  proof profile, legal handoff boundary, and prohibition against Playbook-Agent
  substitution for Subject evidence.
- Do not change production phase handoff wording, search policy, Engine state,
  host UI, tool interception, retry behavior, or lifecycle transitions.

The direct Source of Record for a launched observation is the retained native
completion and its declared evidence. If the Supervisor never obtains a native
completion, its retained report/audit is the Source of Record for that
pre-completion lifecycle boundary. A static test, CLI configuration, or chat
summary cannot substitute. The shortest legal loop is one declared case ->
retained terminal record -> either an honest no-reproduction disposition or a
later direct-root repair.
This adds one bounded observation surface while avoiding a watcher, controller,
interceptor, fallback provider, or speculative behavior hardening.

The new case gives a maintainer a precise bounded question: did one identified
Subject, on one preserved current-host run, issue a prohibited user choice or
direct research tool call after the legal degraded handoff? It preserves the
distinctions among host capability, Subject behavior, Engine verdict, and
native terminal outcome. The native completion is the normal reasoning stop
point; missing capability remains `NOT_RUN` rather than an inferred defect.

The user has authorized this bounded requalification objective. The Playbook
and Subject Agents execute the existing legal flow; the Engine continues to
own Gate and completion facts. No user confirmation creates a new runtime
permission or overrides a missing host capability.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research-wave-experiments`: add `RWE-013`, a real-Agent degraded-handoff
  requalification case with native evidence and an honest terminal boundary.

## Impact

- `experiments_playbook/PLAYBOOK_MANIFEST.md` and a new Wave-chain playbook.
- A case-specific Subject adapter entry and a root `tests/integration/` static
  contract test.
- `openspec/governance/req-registry.yaml` and the RWE delta spec.
- No dependencies, public APIs, `DPT_FRAMEWORK/` behavior, or version bump.
