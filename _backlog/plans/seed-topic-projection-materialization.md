---
title: Seed Topic projection materialization
status: openspec_proposed
created: 2026-07-27
source_bugs: BUG-138
related_bugs: BUG-132, BUG-134, BUG-136, BUG-137
openspec_change: fix-seed-topic-projection-materialization
---

# Seed Topic Projection Materialization

## 1. Decision

BUG-138 is a framework correctness defect, not a request to improve a few
seed-topic paragraphs. A Wave can currently finish while the current canonical
Seed Topic Documents still contain a token, a generic `WaveN submitted` line,
or entries that have no current authority identity. The reader consequently
cannot navigate from a topic to the research result, even though the bundle
contains submitted work and a completion trace.

The future implementation SHALL make one focused change with this shape:

```text
Agent judges projection meaning
  -> sends one structured Projection Packet to existing operate-topic-state apply
  -> Seed Topic State Module atomically writes the owned Appendix Slots
  -> shared pure readiness evaluator checks direct authority + rendered projection
  -> Wave inspect and formal gate reuse that result
  -> only then may normal Wave completion be recorded
```

The work is deliberately one focused OpenSpec change. This file remains the
pre-proposal decision record; the coherent proposal, design, delta specs and
tasks now live in `openspec/changes/fix-seed-topic-projection-materialization/`.
Neither document grants implementation permission before `/opsx:apply`.

## 2. Precise Problem Boundary

### Reader problem

The new working abstraction is the **Seed Topic Document**: one current,
registry-bound `seed_topics/{slug}.md` that combines research intent with a
stable appendix of reader-navigable Wave projections. It lets a future Phase
Agent or human answer one bounded question without reconstructing the ledger,
artifacts, renderer, and split guidance:

> For this current topic, which authoritative Wave results have been projected
> into which research-facing slots, and where should the reader go next?

It intentionally does **not** answer whether the research conclusion is true,
whether a source is accepted evidence, or whether the Wave has all required
coverage. Those facts remain with submitted work-unit rows, source claims,
references, artifacts, the finding index/ledger, and the existing Wave
contracts.

### Distinctions that must remain visible

The abstraction is worthwhile only if it preserves these distinctions:

| Distinction | Why it changes the answer |
| --- | --- |
| current registry topic vs historical/orphan seed | only the former is a current projection target |
| structural Appendix Slot vs Agent-authored Projection Entry | the Engine owns location/identity rules; the Agent owns research meaning |
| Wave0/Wave1 submitted work identity vs Wave2 finding identity | their direct authority and legal slot ownership differ |
| first token consumption vs later idempotent merge | a rerun must never re-inject a consumed token or duplicate an entry |
| `deferred` disposition vs absence/generic submitted prose | deferred is an honest, parseable navigation result; generic prose is not |
| projection navigation vs evidence authority | a valid seed entry cannot establish submitted coverage or create a reference |

The normal stopping point is the Seed Topic Document plus the inspect result.
Readers needing audit can follow the entry refs and identity into the existing
authority, but they do not have to reverse-engineer section names or writer
ownership to take the normal next action.

## 3. Fixed Design Decisions

### 3.1 One complete human-facing template

Replace the two complete authoring contracts
`shared-seed-topic-authoring.md` and `shared-return-map-authoring.md` with one
explicitly named `shared-seed-topic-template.md`. It is the only complete
human/Agent-facing template and contains:

1. initial skeleton and frontmatter ownership;
2. appendix slot map, exact canonical headings, tokens, Wave owners, and
   first-write/merge rules;
3. a permanent, read-only `回填卡` immediately under each canonical heading;
   each card names its writer, direct authority, `entry_id` plus five-field
   format, legal packet action, and prohibitions;
4. one canonical Projection Entry example and concrete-first ref boundary;
5. Projection Packet loop, idempotence, and recover behavior;
6. a short feedback/repair map; and
7. sanctioned rerun-direction fragment plus legacy-read boundary.

`phase-seed-topics`, `phase-rerun`, and `phase-wave0/1/2` SHALL load this same
file through `requires`. Phase bodies retain only their local authority,
queue/command sequence, and checkpoint. Generated actor tasks remain
self-contained with a short five-field cue, not a copied full template.

This is a reader-facing contract, not a runtime parser. A static parity test
protects named structural facts, but JavaScript never discovers behavior by
parsing the Markdown.

### 3.2 One executable slot map and one writer seam

Add a small static Appendix Slot Map next to the existing canonical topic-state
renderer, preferably an exported frozen JavaScript constant rather than a new
runtime JSON schema. `renderNewSeedBody`, slot locator, writer, parser, and
readiness evaluator all consume it. The template is its readable mirror.

| slot_id | canonical heading | declared legacy base | card writer / `entry_id` | merge rule |
| --- | --- | --- | --- | --- |
| `wave0_evidence` | `## Wave0：本主题的新增来源证据` | `## 本轮新增证据` | Wave0 / `<work_id>/<positive ordinal>` | consume token once; identity upsert thereafter |
| `wave1_mechanisms` | `## Wave1：本主题的机制理解` | `## 本轮新增机制理解` | Wave1 / `<work_id>/<positive ordinal>` | same |
| `wave1_trends` | `## Wave1：本主题的趋势、难点与限制` | `## 本轮新增趋势与难点` | Wave1 / `<work_id>/<positive ordinal>` | same |
| `wave2_judgment` | `## Wave2：本主题的当前跨主题判断` | `## 当前判断` | Wave2 / exact `W2F-*` finding id | consume token once; identity upsert thereafter |
| `pending_questions` | `## 本主题的待验证问题与后续验证路径` | `## 待验证问题` | Wave1 work id, then Wave2 exact `W2F-*` append | Wave2 never replaces Wave1 entries |

The frozen map is the single executable adjustment point for heading, token,
owner, identity, action, prohibition, declared legacy base, and bounded suffix
policy. The readable template mirrors those facts under static parity. A new
seed renders each canonical heading followed by its card, then its token or
entries; the card is layout, never a Projection Entry.

```markdown
## Wave0：本主题的新增来源证据

> **回填卡（只读操作约束，不是 Projection Entry）**
> - 写入者：Wave0 Phase Agent
> - 依据：当前轮已 submitted 的 Wave0 work-unit
> - 写法：每个 `<work_id>/<ordinal>` 一条；必须含 `entry_id`、
>   `evidence_meaning`、`relationship`、`refs`、`status`、`next_hop`
> - 动作：形成 `wave_projection` / `apply_seed_projection` packet，经
>   `operate-topic-state apply` 写入 `wave0_evidence`
> - 禁止：手改本节、只写 “Wave0 submitted”、或把 artifact/cache 当唯一 consumer ref

__BACKFILL_WAVE0_EVIDENCE__
```

`## 历史摘要` is retained reader history, not a writable Wave slot. Wave0 has
no authority to write `pending_questions`. BUG-132 owns any later decision on
candidate-level Wave0 coverage; this change only guarantees that an admitted
entry reaches its correct slot.

No new `backfill-seed` CLI, generic template engine, bundle-local template
copy, raw Markdown-patch input, second writer, or second receipt authority is
allowed. `operate-topic-state { inspect, apply, recover }` remains the public
seam and existing workspace/recovery semantics remain the crash boundary.

### 3.3 Projection Packet is a bounded semantic input

`operate-topic-state apply` gains one route-bound `wave_projection` input. One
packet addresses exactly one current canonical topic and one Wave, while Wave1
may atomically update several slots it owns. It contains no file path, heading,
token, line number, append instruction, or raw Markdown.

```yaml
context: wave_projection
action: apply_seed_projection
topic_uid: tp_...
wave: wave1
updates:
  - slot_id: wave1_mechanisms
    entries:
      - source_identity: { kind: submitted_work, work_id: wu-w1-b001-example-i0001 }
        entry_id: wu-w1-b001-example-i0001/1
        evidence_meaning: "Agent-authored meaning for this topic"
        relationship: supports
        refs: [reference/01_topic-source.md, artifacts/wave1/01_topic/evidence-summary.md]
        status: supported
        next_hop: "Read the concrete reference before the evidence summary"
```

An entry uses exactly one accepted source identity: submitted work for Wave0/1,
or a finding ID for Wave2. The packet has no empty selected slot: when an owned
slot must record that no consumer projection is currently materializable, the
Agent writes an explicit `relationship: defers`, `status: deferred`, and a
concrete limitation in `next_hop`. Every newly materialized entry carries the
slot descriptor's stable `entry_id`; historical entries remain readable through
their accepted ref/metadata forms and are not rewritten just to add it. Omitted
slots are untouched.

The Module validates only deterministic concerns:

- current canonical UID/slug binding and phase-route authorization;
- Wave-to-slot ownership and no cross-Wave overwrite;
- existence and current-round eligibility of submitted work, or existence of
  the admitted finding identity;
- exactly one selected target slot, using the canonical heading/card or the
  declared legacy base under the accepted bounded suffix policy;
- identity grammar/uniqueness, five required fields, ref shape, and the
  explicit-deferred exception;
- token consumption, deterministic serialization, identity upsert, atomic
  one-seed write, and post-write parse/readiness assertion.

It does not select evidence, invent a concrete reference, write
`evidence_meaning`, judge `relationship`, or turn a packet into submitted
coverage.

### 3.4 One direct readiness fact, reused at both checkpoints

Extract a pure `evaluateSeedProjectionReadiness`-style helper. Its exact name
is an implementation choice, but its contract is fixed: it reads the canonical
topic registry, the current Wave's submitted-row or finding-index authority,
and the rendered current seed sections; it produces root-first structural and
identity findings. Both `inspectSeedTopicReturnMaps` and the corresponding
formal Wave gate consume the same result. Neither phase Markdown nor a second
regex checker reimplements it.

The helper must distinguish these roots and stop before downstream noise:

1. current registry/binding or authority parent is unavailable;
2. a packet-selected slot has no unique canonical heading/card or declared
   legacy-heading target;
3. a required current authority identity has no valid entry/disposition;
4. a selected slot retains its token, generic `submitted` prose, malformed
   entry, missing canonical card, wrong identity, or invalid concrete-first ref;
5. only after those prerequisites are valid, ordinary entry coverage is
   evaluated.

The first four protect required structure, identity, provenance binding, or
user-required navigation availability. They are blocking and must be
ineligible for degraded handoff. Equivalent Markdown wrappers and whitespace
remain presentation-tolerant. A completion trace is recorded only after the
same Wave inspect passes; no additional backfill receipt or persistent status
is created.

### 3.5 Legal execution and feedback

The existing topic-state lifecycle authorization grows three narrow
`wave_projection` windows, one for each currently loaded Wave phase and its
normal pre-completion route. The accepted implementation must bind each window
to the existing handoff/status facts; it cannot treat a user request, a generic
inspect, or a post-final bundle as permission to write a seed.

The normal Agent loop is short:

1. successful submit or finding materialization exposes its existing direct
   authority;
2. Agent determines the semantic entries and retains a packet;
3. Agent calls the existing topic-state apply command;
4. Agent runs the existing Wave inspect; and
5. on a named root, repairs the packet/authority through its existing owner and
   reruns the same checkpoint.

For a legal writer root, feedback names `missing_fact`, `write_to`, and the
same inspect to rerun. For a missing writer/authority path it reports the
earliest owner or `missing_contract`; it never tells the user to edit a seed
file, fabricate a receipt, or choose among invented recovery paths. Users make
only new research/risk decisions; the Agent performs packet formation and
ordinary authorized repair; the Engine returns deterministic admission and
readiness verdicts.

## 4. Compatibility, Scope, and Non-Goals

### Compatibility rule

There is no automatic or bulk migration. Parseable historical seed documents
remain readable as history. The five old heading bases remain declared locator
aliases under the existing bounded suffix policy; they are not a second template
or packet input. A legal packet can atomically upgrade only its uniquely matched
legacy target to the canonical heading/card form while materializing its entry.
Read/inspect never cause that change, and unrelated legacy headings are left
untouched. A missing selected target returns
`seed_projection_layout_missing`; a repeated selected target returns
`seed_projection_layout_ambiguous`; neither permits the writer to guess a
heading. A future broad migration, if needed, is a separate change with its own
authority and recovery design.

Current renderer output contains the complete layout. Rerun replays of the
same accepted packet are unchanged; correcting an entry replaces only its
stable identity; later Wave2 findings append/upsert only their own W2F entries.

### Explicit non-goals

- No repair of the cited production bundle by deleting tokens or adding prose.
- No evidence authority, source claim, ledger, receipt, or reference creation
  from a projection packet.
- No semantic quality gate for research meaning, relationship, or next hop.
- No candidate-level Wave0 proof; that stays with BUG-132.
- No resolution of BUG-134's synthesis-ledger classification beyond preserving
  strict seed-slot checks.
- No dependency on BUG-136/137 before defining the writer; packets use concrete
  references when those are available through their own accepted authority.
- No new lifecycle state, controller, watcher, background retry, or user
  interaction point.

## 5. Impact Map

| Area | Planned change |
| --- | --- |
| `canonical-topic-state.mjs` and `operate-topic-state.mjs` | packet schema, Wave lifecycle admission, static slot map, atomic render/merge/recover result |
| `return-map.mjs` and Wave inspect CLIs | shared direct readiness evaluator and root-first feedback |
| Wave gate definitions/CLIs and degradation policy | consume the shared structural result; structural roots cannot degraded-pass |
| shared template and phase nodes | replace split complete contracts; all relevant phase `requires` point to one template and one legal command loop |
| topic-state playbook and schemas guidance | show packet invocation and repair map, not hand-edit guidance |
| `tests/` | unit, CLI integration, deterministic e2e, and static parity assets described below |
| release metadata | next framework version, `CHANGELOG.md`, `RUN.md`, requirement registry/spec deltas, verification plan |

The likely modified capabilities are `canonical-topic-state`,
`seed-topic-materialization`, `research-return-map`, and
`research-wave-phase-content`. The active proposal assigns its modifications to
existing requirement IDs and targets v0.53; this plan does not create a new
capability or implementation helper ID.

## 6. Verification Plan

The active change's `verification-plan.yaml` classifies assets before target
edits. Minimum evidence:

| Class | Proof |
| --- | --- |
| `unit` | slot-map/template/card parity; exact heading and `entry_id` rules; packet shape/ownership; current identity admission; first token replacement; cards never parse as entries; targeted legacy upgrade with suffix preservation; deferred disposition; no partial Wave1 write; crash/recover safety |
| `integration` | `operate-topic-state apply` in each legal Wave window; exact blocked roots for wrong slot, stale work id, absent W2F, non-current topic, missing/ambiguous target heading; no read-time migration; inspect and gate share the same root classification |
| `deterministic_e2e` | disposable bundle runs Wave0 -> Wave1 -> Wave2 packets, records completion only after each inspect, rejects generic prose/token paths, and proves structural failure cannot use degraded handoff |
| `agent_flow_e2e` | a real disposable bundle where a Phase Agent follows the single template, forms a semantic packet from actual submitted/finding authority, invokes the writer, consumes inspect feedback, and leaves native evidence; this proves Agent usability, not semantic truth |

Negative tests must demonstrate short-circuiting: missing registry/authority
parents return their parent root rather than a wall of token and field errors.
Fixture tests prove only Engine behavior. Any Agent-flow claim requires native
case evidence and must not be fabricated from a seeded result.

## 7. OpenSpec Proposal Commitments

The active proposal/design/specs/tasks SHALL preserve all of the following
without adding speculative machinery:

1. The Seed Topic Document answers the bounded navigation question in section
   2, and Appendix Slots/Projection Packets preserve the listed distinctions.
2. The direct Source of Record is named for registry identity, Wave0/1 work,
   Wave2 findings, document layout, and rendered projection; Markdown is not
   promoted to authority.
3. The shortest legal loop is packet -> existing writer -> same inspect ->
   normal gate, with no new CLI or retry tree.
4. The change deletes or consolidates two complete templates, phase-local
   manual token replacement, and duplicated projection checker behavior rather
   than layering a controller on top.
5. User decision, Agent execution, and Engine verdict are separately stated;
   user intent does not create a mutation path.
6. The legacy layout boundary is honest: read compatibility is not a hidden
   migration or a second success path; only a uniquely matched target can be
   upgraded during an otherwise legal packet transaction.

## 8. Closure Conditions

This plan has moved to the focused OpenSpec proposal
`fix-seed-topic-projection-materialization`. BUG-138 is not closed until that
change is implemented through `/opsx:apply` and the real reproduction no longer
permits Wave completion with a missing or generic current seed projection.
