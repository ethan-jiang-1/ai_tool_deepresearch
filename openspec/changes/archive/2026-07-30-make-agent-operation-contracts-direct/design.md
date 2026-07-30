## Context

See `proposal.md` for motivation. C1 has archived artifact/evaluator
interpretation, and C2 has implemented the effective current topic-state and
projection contracts but remains pending native archive. C3 therefore plans
against C2's final delta requirements and MUST NOT enter `/opsx:apply` until C2
archives them into the main specifications.

The affected commands already own distinct deterministic facts:

- Wave inspect owns its non-gate evaluator result and structured output envelope.
- `operate-topic-state` owns Zod input validation and its existing mutation
  authorization boundary.
- `enter-phase` owns route-bound `load_complete`; `advance-status` owns status
  synchronization.
- work-unit claim, timeout preflight, and return-map readiness already own their
  respective actor, lease, candidate, and coverage facts.

The defect is not missing research intelligence. It is that these facts reach
an executing Agent only after it has guessed command syntax, read implementation
code, or reconstructed a large dependency closure. C3 changes that delivery
shape without creating another truth path.

## Goals / Non-Goals

**Goals:**

- Give an executing Agent one direct operation contract at each selected public
  command: legal invocation, direct rejection root, existing writer/owner, and
  same-check continuation.
- Make help and invalid invocation distinguishable from a valid-bundle domain
  verdict before any evaluator or mutation runs.
- Reuse existing validators, handoff witnesses, and current-authority coverage
  facts while reducing duplicated feedback and context volume.
- Keep reader-facing Markdown and structured CLI feedback close to the point
  where an Agent decides its next legal action.

**Non-Goals:**

- No generic Agent controller, background watcher, retry tree, or persistent
  operation status.
- No change to Gate routing, topic-state authorization, submitted provenance,
  actor proof, work-unit lease/timeout policy, or required candidate coverage.
- No new host capability, user decision checkpoint, permission, or mutation
  path; a missing legal path remains an explicit owner/missing-contract result.
- No full JSON Schema subsystem, generic Markdown parser, or second return-map
  or candidate validator.

## Decisions

### 1. Direct operation contract is a reader projection, not a controller

The new semantic level is the **direct operation contract**. Its reader is an
Agent about to call one existing public command. Its bounded question is:
"What can I call now; if it does not pass, which direct fact decided that, who
can legally change it, and which existing checkpoint should I rerun?"

It must preserve distinctions that change that answer:

| Distinction | Different Agent consequence |
| --- | --- |
| static help | learn protocol; no runtime fact was evaluated |
| invocation/configuration rejection | correct command shape; code `2`; do not repair bundle content |
| parsed-domain verdict | use the existing evaluator's root/owner/same-check loop |
| field-validity rejection | correct retained input through the existing writer and rerun |
| lifecycle/owner boundary | do not hand-edit authority; use named owner or report no legal path |

The normal stop point is deliberately shallow: after the Agent sees this
projection, it can invoke, repair a legal input, rerun, or accurately report a
missing boundary without reopening Engine source. Audit remains possible by
following the projection to the existing schema, bundle, trace, or Gate.

The implementation module is a small **invocation/presentation helper**, not a
universal command dispatcher. Its interface accepts static argv/usage facts and
returns either help, a direct invocation root, or permission for the command's
existing domain code to proceed. It does not resolve lifecycle authority,
select research work, write runtime state, or transform a domain verdict. This
gives callers leverage without hiding a second controller behind a shared name.

Alternatives rejected:

- One generic `operate` controller: it would own routing, input coercion, and
  response policy across unrelated commands, creating a second authority and a
  larger failure surface.
- Documentation-only repair: it leaves normal `--help` probing able to produce
  a false domain blocker.
- One bespoke parser per command: it would repeat the same help/code-`2` drift
  that caused these incidents.

### 2. Invocation handling stops before domain evaluation

Selected commands will use the small helper only for shared static concerns:
`--help`/`-h`, strict known-option parsing, missing values, stable usage, and
code-`2` invocation/configuration output. The selected grammar is exact:

| Command | Help form | Non-help form |
| --- | --- | --- |
| `inspect-wave{0,1,2}-output.mjs` | one standalone `--help` or `-h` | exactly one `--bundle <bundle-path>` pair; no positional arguments |
| `operate-topic-state.mjs` | one standalone `--help` or `-h` | `inspect --bundle <bundle-path>`; `schema --context <context>`; `apply --bundle <bundle-path> --input <input-path>`; or `recover --bundle <bundle-path> --operation-id <operation-id>` |
| `enter-phase.mjs` | one standalone `--help` or `-h` | `--bundle <bundle-path> --node <file-ref>` with optional one `--full` |
| `advance-status.mjs` | one standalone `--help` or `-h` | `--bundle <bundle-path> --to <source-gate-enum>` |
| `plan-hostfile-sections.mjs` | one standalone `--help` or `-h` | `render-no-controls`, or `render-supplied-controls --input <snapshot-path>` |

Within a listed non-help form, named-option order is irrelevant, but every
required named option occurs exactly once and no other argument is legal. A
bare Wave bundle, duplicate option, help mixed with another argument, or any
other shape is a code-`2` rejection. This preserves topic-state's operation
positional grammar and the renderer's two subcommands; the shared helper does
not turn either into a generic positional dispatcher. Each command retains its
existing output envelope:

- Wave inspect builds its invocation root through the existing finding and
  `{ check, inspect, advice, hints }` projection path.
- Topic-state and phase commands retain their structured operation/status
  result shapes.
- The pure plan-controls renderer emits text on success and a direct structured
  invocation result on failure.

For an explicit bundle, validation occurs before a Wave evaluator or any
mutation. A repair command may use a resolved bundle only after it is known to
be a usable directory. Otherwise it uses a stable placeholder, never the raw
token. This removes the false `--help`-as-bundle path rather than adding a later
exception to every Wave evaluator.

### 3. Topic-state schema discovery derives from the Zod contract

`zod@3` has no supported JSON-Schema emitter in this repository. C3 will expose
a narrow pure authoring-projection visitor over the existing
`TopicApplyPlanSchema` branch graph. It handles only the Zod constructs already
present in topic-state input forms (object, array, literal, enum,
discriminated/ordinary union, optional/default, string, number, and an effect
wrapper used to reach one of those inner shapes); an unsupported or
unverifiable construct fails closed as structured framework-configuration
feedback.

The visitor may unwrap `ZodEffects` only to discover the underlying structural
branch. It SHALL NOT serialize, restate, or reimplement a refinement,
transform, or other cross-field effect. It derives context/action forms, field
paths, type/shape constraints, closed values, and a candidate example from the
same Zod objects used by `safeParse`. Before it emits a template, it MUST parse
that template through the real `TopicApplyPlanSchema`; an effect-dependent form
that cannot produce such an example returns the same bounded configuration
feedback rather than a plausible but invalid template. The visitor is not a
JSON Schema promise, a validator, or a lifecycle authorizer. `schema --context`
filters the derived forms without reading a bundle. Tests will parse every
emitted example through `TopicApplyPlanSchema` and assert that context/action
enumeration comes from the actual branches.

Zod error projection will be a separate pure mapper over `ZodIssue[]`, capped
at a small fixed count. It returns stable field paths, codes/messages, expected
shape or allowed values, and received type, but never arbitrary received
values, input bytes, paths outside the named retained input, or stack traces.
The existing `safeParse` remains the only input verdict. Authorization runs
only after a valid parse, preserving the distinction between a repairable input
shape and an unavailable writer/lifecycle window.

Alternatives rejected:

- Hand-maintained per-context examples and enum lists: they drift from the Zod
  schema and recreate the contract-lineage problem.
- Generic Zod private-structure serialization: it would claim support for
  arbitrary schema shapes outside this bounded command contract.
- Running `apply` speculatively to learn a schema: it mixes authoring discovery
  with mutation authorization.

### 4. Keep controls rendering pure and host-file writing with HITL1

The missing `plan-hostfile-sections` CLI will wrap only
`renderNoControls()` and `renderSuppliedControls()`. Its two explicit modes use
an optional snapshot file solely as input text and print the exact section. It
does not receive a bundle flag, locate a host file, write `rb_plan.md`, parse
user semantics, or establish an owner. HITL1 still writes the output to its
already authorized coordinate after resolving any material user decision.

This is intentionally a thin adapter rather than a second host-file writer.
The renderer reduces Markdown fence mistakes; it does not turn narrative
controls into Engine authority or make a command successful proof that the
snapshot is semantically correct.

### 5. Separate entry witness from bounded entry presentation

After static invocation and handoff authorization but before `assessNode()` can
append `load_complete`, `enter-phase` SHALL run a read-only framework
configuration preflight over the selected target's `## 0. Execution Brief`
through the next H2. A missing/ambiguous action core is a structured
framework-configuration failure with no `load_complete` or `current_node`
mutation; it is not an excuse to infer a phase or write a replacement. Only a
preflighted action core may reach `assessNode`, establish the route-bound load
witness, and write `current_node`. The preflight reads only the selected
framework target source; it does not call the workflow loader, resolve a
dependency closure, or emit trace/receipt events.

The default shared-file manifest is the ordered dependency plan returned by the
successful load with the target node itself removed. It contains refs only, not
their Markdown bytes. `--full` retains the complete original closure, including
the target node and its loaded content; it does not redefine the default
manifest or create another loader.

Default output order is:

1. continuation cue;
2. exact source-gate `advance-status --to ...` command derived from the
   accepted handoff (not executed automatically);
3. target action core; and
4. loaded shared-file manifest.

`--full` explicitly adds the complete existing dependency closure after this
visible entry material. Both forms use the same preflighted load result; neither
moves status synchronization into `enter-phase`. The status command continues
to validate its trace witness itself, so its help/invocation preflight is
likewise side-effect-free while valid failure semantics remain unchanged.

### 6. Project work-unit reasons from existing selected branches

Claim's existing actor policy and timeout preflight's existing selected
candidate/progress/lease/integrity branch will each gain a small pure response
projection:

- claim exposes the planned role, primary supplied-field conflict, bounded
  field conflicts, exact legal tuple vocabulary, and same claim rerun;
- timeout preflight exposes the selected branch source and direct facts behind
  its existing recommendation.

The projections consume already computed facts. They do not change which tuple
is legal, make an actor available, extend an idle lease, create an attempt,
authorize forced timeout, or select a different candidate root. The generated
Completion Contract reuses the same actor vocabulary rather than growing a
task-only copy; archived DEW-021 remains the owner of cache/completion facts.

### 7. Batch only homogeneous return-map presentation findings

The return-map evaluator continues to establish each required
`<work_id>/<ordinal>` coverage fact. After direct parent roots have masked
dependent omissions, it will group only omissions that share the canonical
topic, Wave0 writable Seed Topic family, repair kind, and Projection Packet
coordinate. The group emits one current omission finding with the complete,
stable ordered identity list. Different topics, Waves, parent roots, or writer
coordinates remain separate.

Grouping happens inside the existing pure evaluator before both inspect and
formal Gate consume its result. This removes a wall of equivalent messages and
avoids one duplicate batcher in a Gate or CLI. It does not relax coverage,
modify ledger authority, or make an incomplete packet pass.

### 8. Simplicity and responsibility review

The shortest legal loop is:

```text
direct schema / lifecycle / evaluator fact
  -> existing checker or writer
  -> bounded operation projection
  -> same existing checkpoint
```

C3 avoids or removes complexity rather than adding a new layer of control:

- one narrow parser helper replaces repeated help/error special cases;
- one Zod-derived authoring view replaces source-reading and hand-maintained
  field lists;
- one default entry view replaces forced full-closure consumption;
- one evaluator-level candidate group replaces many equivalent findings;
- existing claim/timeout branches become visible instead of spawning a new
  diagnosis policy.

User decisions remain limited to new research semantics, risk, and unavailable
host permission. The Agent executes legal invocation, retained-input repair,
host-file writing at its existing coordinate, and same-check retry. The Engine
continues to decide schema validity, authorizations, route witnesses, timeout
eligibility, and coverage. A missing writer remains an honest boundary, not an
invitation for the Agent or user to hand-edit authority.

## Risks / Trade-offs

- [Zod v3 representation changes] -> Keep the authoring visitor narrow and
  local, unwrap effects only for structural discovery, test every supported
  form/example against the actual schema, and fail closed for an unsupported or
  unverifiable construct rather than emitting fiction.
- [C2/C3 delta overlap] -> C3 uses C2's effective `CTS-004` and `RRM-007`
  baselines, but apply is blocked until C2 native archive; re-read the archived
  main requirements before implementation.
- [Exit-code compatibility] -> Limit code-`0` help/code-`2` invocation changes
  to named public commands, document them in `COMMANDS.md` and CLI README, and
  state the breaking shell-visible behavior in the release note.
- [Action-core extraction leaves a durable false entry witness] -> Preflight
  the target action core before `assessNode()` writes `load_complete`; make
  `--full` explicit and retain an ordered, target-excluding shared-file manifest
  rather than silently discard cached content.
- [Batching hides work quantity] -> Preserve every identity in stable
  `missing_candidate_ids[]` and group only one writer-owned family.
- [Feedback accidentally claims repair authority] -> Test no-side-effect help,
  invocation rejection, schema discovery, and blocked owner boundaries against
  real temporary bundles.

## Migration Plan

1. Archive C2 after its final review; rebase C3 implementation assumptions on
   the newly accepted `CTS-004` and `RRM-007` requirements.
2. Add pure invocation, schema/error, entry-presentation, and feedback
   projection helpers beside their current owners; then wire selected CLIs and
   Markdown/docs in dependency order.
3. Run focused unit and CLI integration regressions before updating the command
   index and `v0.63` release notes.
4. Rollback is code/documentation-only: restore the previous framework release
   if a public presentation regression is found. C3 introduces no persistent
   state or runtime bundle migration, so no data rollback or reconciliation is
   required.
