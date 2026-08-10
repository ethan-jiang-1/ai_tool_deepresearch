## Context

See [proposal.md](proposal.md) for motivation and the three delta specs for
requirements. Today `phase-hitl1.md` asks the Phase Agent itself to execute the
bounded adapter probe. `rb_profile.yaml#/research_access` is the current direct
observation owner, while `check-gate-hitl1-recorded.mjs` owns the deterministic
verdict. The selected adapter owns the callable native tool surface; it does
not own a bundle writer or permission bypass.

The new probe agent is deliberately not a work-unit Sub-agent. Work-unit
contracts own beacon identity, receipts, output declarations, cache trails,
ledger submission, and bundle writes. None answers the bounded HITL1 question
of whether the selected host can perform one neutral search-and-fetch sequence.

## Goals / Non-Goals

**Goals:**

- Keep the real search/fetch tool payload out of the Phase Agent context while
  retaining the exact existing observation and Gate loop.
- Give the Phase Agent one bounded return contract and one direct failure
  action, without making it invent an observation or retry tree.
- Keep real-agent evidence honest by observing the isolated probe agent rather
  than an unobservable nested sub-agent transcript.

**Non-Goals:**

- No profile-schema, Gate-definition, adapter-selection, Engine, host-policy,
  work-unit, ledger, receipt, trace, cache, evidence, or bundle migration.
- No generic sub-agent scheduler, durable probe record, automatic retry,
  provider fallback, or prompt/result protocol reusable outside HITL1.
- No claim that deterministic Markdown or fixture tests prove a provider can
  currently search/fetch.

## Decisions

### One Phase-loaded, read-only probe guide

Add `workflows/nodes/shared/shared-hitl1-capability-probe.md`. It is loaded by
HITL1 solely to construct one native spawn prompt. Its frontmatter and prose
make four facts explicit: fixed neutral query; existing serial candidate/fetch
bounds; no bundle/filesystem or evidence authority; and a final compact return
map. It is not registered as a work-unit role, Queue kind, chain node, or
Engine-dispatched actor.

The prompt contains no bundle path and instructs the probe agent to return no
page bytes, candidate list, transcript, raw tool output, analysis, receipt, or
claim of Gate success. It returns one `research_access` object only. The
existing profile schema is the shape authority after the Phase writes it; this
change adds no Zod schema or second validator.

This retains the semantic distinctions a reader needs: external observation,
profile write, and Gate verdict. A generic shared probe framework was rejected
because it would introduce a reusable actor/return authority beyond this one
fixed non-research check.

### Phase relays the sole canonical observation

The Phase displays HIU-002's notice, spawns the agent, evaluates whether the
return is one of the existing observation branches, and performs the existing
profile write. It then displays the matching result text and invokes the same
HITL1 Gate. The probe agent never writes the profile or runs a Gate.

```text
recorded HITL1 decision
  -> Phase renders notice
  -> one isolated probe agent
  -> compact observation return
  -> Phase writes rb_profile.yaml#/research_access
  -> Phase renders direct result
  -> existing hitl1-recorded Gate
       pass -> existing Setup handoff and silent exit
       fail -> existing smallest repair / same probe-and-Gate rerun
```

Return handling has no new persisted state machine. It is a one-attempt input
classification inside the existing HITL1 loop:

| Probe return | Phase action | Durable result |
| --- | --- | --- |
| Existing `available` branch | Write unchanged; render success text; run Gate | Existing profile observation and Gate attempt |
| Existing `unavailable` branch | Write unchanged; render failure text; run Gate | Existing profile observation and Gate attempt |
| Spawn failure, missing, malformed, or contradictory return | Create an honest existing unavailable branch with a direct reason; render failure text; run Gate | Existing unavailable observation and failed/repair Gate path |

The Phase Agent makes the ordinary mechanical write and rerun. The user is not
asked to approve the spawn, run `curl`, or repeat recorded semantics. Only a
genuine external host/network condition remains a user-facing boundary. The
Engine keeps its current schema/Gate verdict and gains no semantic repair role.

### Preserve the bounded native-first sequence in the probe agent

The probe prompt carries the current literal query, maximum three actual
eligible returned candidates in order, native fetch first, and at most one
independently permitted exact same-URL curl fallback. It exits on the first real
page content or a current-candidate no-legal-path boundary. Its final map keeps
only the existing profile fields: status, timestamp, final URL when applicable,
truthful fetch outcome/surface, bounded count/ordinal, and direct reason.

This changes the execution context, not the data model. The direct Source of
Record remains `rb_profile.yaml`; no raw event is retained there. The selected
adapter's permissions remain authoritative. An adapter failure cannot authorize
curl, a provider change, or a bypass.

### Keep user copy in the existing exact-text brief

`workflows/nodes/brief/hitl1.md` remains the only user-facing text owner. It
will contain the three agreed Chinese strings. The Phase renders the notice
before spawning and the status-specific result after writing the observation,
before the same Gate. The success line describes connectivity only; silent
execution remains Gate-pass-only. The failure line uses “多数是” and keeps
recorded choices intact, without pretending that every unavailable branch is a
network failure.

Putting copy in the probe prompt was rejected: the probe has no user-facing
conversation ownership, and its raw tool exchange must not leak back into the
main conversation as a second presentation layer.

### Split deterministic and real-agent proof at the actor boundary

`tests/integration/md/phase-hitl1-research-access.test.mjs` will deterministically
check the Phase/guide/brief contract: one native spawn, fixed prompt ownership,
no Phase direct search/fetch, return-map fields, sole profile writer, ordering,
and unchanged Gate path. Runner and observer focused tests check that case-115
injects only the probe prompt and rejects an observation that conflicts with
public tool events.

case-115 becomes the `agent_flow_e2e` canary for the probe agent alone. Its
runner starts the selected generic non-bypass Subject with no bundle path or
write obligation. Its observer reads the retained public events plus final
return, validates the real one-search, returned-URL, native-first/same-URL
sequence and an honest available/unavailable map, then records the existing
native experiment outcome. It intentionally does not write profile data, run a
Gate, or infer a Phase action. This removes the old false actor attribution;
the deterministic integration test covers the Phase relay contract instead.

### Constitutional review and semantic closure

Semantic precision: the changed reader-facing concept is a transient isolated
probe return, whose bounded question ends as soon as the Phase writes the
existing observation and invokes the existing Gate. It creates no reader-facing
state or runtime projection.

Simple reliable control: the direct authority and shortest legal loop are
unchanged. This removes Phase-context tool payloads and avoids an additional
checker, persistent record, retry controller, or host bridge. The one new guide
replaces scattered inline probe instructions rather than duplicating a second
success path.

Helper responsibility: users decide research semantics only; the Phase performs
authorized relay and same-check rerun; the probe agent performs bounded external
I/O; Engine decides the existing deterministic Gate. Neither user approval nor
the probe return expands host permission.

`semantic-closure.yaml` is `not_applicable`: no catalogued deterministic fact
family changes. The profile fact, schema interpretation, Gate/status/trace
handoff, and verdict consumers are unchanged; only the Agent-facing executor
of an external observation changes.

## Risks / Trade-offs

- [Phase trusts a second-hand observation] -> Retain existing strict profile
  branches, record malformed/spawn failure as unavailable, and use real
  provider-scoped canary evidence for the probe actor. Engine still does not
  claim to independently prove an external call.
- [The spawn surface is unavailable or returns malformed output] -> One honest
  unavailable branch and the existing same-probe/Gate retry boundary; no hidden
  fallback or fabricated availability.
- [A canary omits Phase behavior] -> State this proof gap explicitly and cover
  only static Phase relay mechanics deterministically.
- [Simpler UX success text could be read as Gate success] -> Keep its
  observation-before-Gate placement and assert Gate-pass-only exit in the
  integration test.
- [Legacy bundle runs a newer framework node] -> Existing profile schema and
  persisted fields are unchanged, so the current framework node is compatible
  without migration.

## Migration Plan

1. Apply Markdown, real-canary, and deterministic test changes together.
2. Run selected deterministic checks and only a separately authorized real
   case-115 observation; retain NOT_RUN honestly if its authenticated Subject
   runtime is unavailable.
3. Publish v0.84 in `CHANGELOG.md` and `DEEP_RESEARCH_HARNESS/RUN.md`.

No data migration is needed. Rollback restores the prior Phase/brief/guidance
surfaces; existing `research_access` observations remain schema-compatible.
