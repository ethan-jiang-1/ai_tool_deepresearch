## Context

当前 work-unit candidate checkpoint 已直接校验 result、runtime receipt、declared output path/role/existence、cache trail、source claim 与 queue binding，但不读取明确分配给该 attempt 的 Wave0/Wave1 artifact content。相同 artifact 的 direct facts 随后由 Wave inspect/Gate 判断，因此一个确定性不合格的 delegated output 可以先成为 submitted provenance，再由 Phase Agent 在更晚的 checkpoint 面对同一个根因。

这个 change 不是新增通用 linter。它把 `wave-contract-evaluators.mjs` 当前内联的三类 direct fact 提取为一个 Engine-internal 深模块，由 work-unit candidate validation 与 Wave inspect/Gate 两个真实 adapter 复用。Agent-facing interface 仍是现有 `operate-work-unit dry-submit`、formal submit、Wave inspect 和 Gate；没有新的公开 CLI。

本设计 paired-read `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md`。结论是：required exact output 的 direct structure 在最早合法 decision point fail fast；phase completeness、provenance 和 cross-artifact judgment 留在 Wave checkpoint；用户不承担普通 pipeline 操作，Agent 执行获准修复，Engine 拥有确定性 verdict。

Direct Sources of Record are:

- assignment identity: registered kind plus the hash-bound queue-item snapshot's canonical Topic coordinates and canonical `file:` required receipts;
- current candidate content: one bounded byte snapshot read for the current checkpoint invocation;
- historical acceptance/replay: submitted index, ledger, result hash and durable queue/status postconditions;
- current phase truth after submit: current artifact bytes plus existing Wave-wide authority surfaces.

Manifest, beacon, generated task/checklist and result schema are projections or binding surfaces. They do not independently select a contract or become an additional acceptance voter.

## Goals / Non-Goals

**Goals:**

- Resolve a closed, versioned exact-output contract before claim mutation from attempt-bound assignment facts.
- Reconstruct and verify the same contract at current-version candidate checkpoints rather than trusting manifest or actor declarations.
- Reuse one neutral direct-output evaluator and one byte-snapshot policy from both candidate and Wave adapters.
- Block only Wave0 source YAML schema, Wave1 non-empty Key Findings, and four non-empty Wave1 question-list semantic sections.
- Preserve tolerant Markdown presentation and existing phase-wide Wave authority.
- Make candidate feedback root-first, bounded, and actionable at the same dry-submit checkpoint.
- Preserve actor provenance by separating mechanical repair from missing research semantics.
- Keep legacy behavior explicit and marker-based, without framework-version inference or historical-bundle migration.
- Bump the framework from `v0.37` to `v0.38`.

**Non-Goals:**

- No generic lint CLI, dynamic schema/plugin registry, global path map, arbitrary schema selector, or all-output rollout.
- No artifact-byte hash authority, immutable artifact claim, atomic artifact/ledger commit, or ledger migration.
- No count floor, submitted coverage, queue drain, source URL marker, return-map lineage, depth review, cross-artifact link, phase completeness, Wave2 content, seed, reference projection, or final-output rule at candidate submit.
- No semantic quality judgment, source selection, automatic repair, retry controller, hidden fallback tree, or user-operated submit loop.
- No contract ID authored by queue, payload, Markdown, generated result, or actor.
- No inference of supplementary work from queue IDs, suffixes, prose, `writes_to`, or current mutable plan defaults.
- No native actor ownership of `dry-submit` in v1; the actor verifies exact assigned writes before `work_done`, and the Phase Agent runs the checkpoint after return.

## Decisions

### D1. Admit only direct blockers with independent candidate authority

The v1 blocker set is deliberately closed:

| Direct contract | Candidate blocker | Tolerated form | Kept at Wave only |
|---|---|---|---|
| `wave0.source-metadata-array.v1` | UTF-8 YAML decodes, top level is an array, and `ReferenceMetadataArraySchema` accepts every entry | One UTF-8 BOM is stripped before YAML parsing; ordinary YAML-equivalent serialization remains accepted | source count floor, cache/reference/index/provenance and phase completeness |
| `wave1.evidence-summary.v1` | A `Key Findings` semantic section exists and has non-empty content | Existing case/spacing/heading-level tolerant parser behavior | parseable source URL, return-map lineage, submitted coverage, source/cache novelty, depth and phase completeness |
| `wave1.question-list.v1` | All four accepted semantic sections exist and each has non-empty content | Existing heading level, case, spacing, slash and ordering tolerance | return-map lineage, question quality/count, provenance and phase completeness |

`source_url_present` is not admitted. `source_claims[]`, `accepted_source_urls[]`, cache mappings and submitted lineage are more direct structured authorities for candidate source claims; retaining the Markdown URL marker at Wave avoids a duplicate presentation blocker.

Preventive invariant: when an attempt is explicitly assigned an exact delegated output, first acceptance must not accept a byte snapshot that the same accepted direct contract deterministically rejects, even if a current real-Agent baseline does not reproduce the historical failure frequency.

Rejected alternatives:

- Moving all Wave rules forward would require phase-wide facts that a candidate cannot own.
- Making the checks advisory would preserve the known acceptance timing gap.
- Recreating approximate Zod/regex validators in submit would create a second truth path.

### D2. One deep direct-output module, two adapters

Add a focused Engine helper, expected at `DPT_FRAMEWORK/engine/helpers/direct-output-contract.mjs`, with one external interface conceptually equivalent to:

```js
evaluateDirectOutput({ contractId, bytes })
// -> { passed, roots: [{ code, contract_id, coordinate, expected, observed, repair_scope }] }
```

The interface accepts only a closed contract ID and bounded raw bytes. It owns UTF-8/BOM decoding, tolerant parsing, prerequisite short-circuiting and neutral root results. It does not read paths, parse queue/manifest state, select contracts, generate submit `write_to`, produce Gate hints, mutate authority, or expose parser exceptions/artifact content without bounds.

Two adapters make the seam real:

1. Work-unit adapter resolves safe exact targets, reads a fresh snapshot, invokes the evaluator, and projects neutral roots into existing `violations[]` with the assigned path, `write_to`, rerun command and repair scope.
2. Wave adapter resolves current per-Topic paths, reads through the same snapshot reader, invokes the evaluator, and projects roots into existing findings/hints before continuing with Wave-only checks.

The existing inline YAML/Key Findings/question-section interpretations are removed after adapter parity is proven. Tests cross the neutral interface and each adapter's observable output; they do not expose internal parser helpers as a second interface.

Rejected alternatives:

- A thin contract-ID dispatcher beside the old logic fails the deletion test and is not acceptable.
- A new linter CLI enlarges the public interface and duplicates existing checkpoints.
- Letting adapters pre-decode content risks candidate/Gate verdict drift.

### D3. Resolve exact assignments from immutable attempt facts

Choose explicit manifest transport generated by an Engine-owned resolver. The current assignment contract version is a closed value recorded as `assignment_contract_version` on the Engine-owned index record. The full contract is reconstructed, not copied into the index.

Resolver flow:

```text
registered kind
  + hash-bound embedded queue snapshot
  + snapshot canonical Topic UID/current slug
  + canonical file: required_receipts
  + index assignment_contract_version
    -> strict output_contract including required_outputs[]
    -> exact equality in manifest and beacon
    -> generated task/checklist/result-schema projections
```

`required_outputs[]` entries contain exactly `path`, `role`, and `direct_contract`. Paths are concrete bundle-relative paths. Cross-field Zod refinement rejects duplicate normalized paths, conflicting roles/contracts, unsafe paths, partial pairs, unsupported receipt sets and unknown closed values.

The v1 assignment matrix is:

| Kind / form | Required receipt shape | Resolved required outputs | Prior-output behavior |
|---|---|---|---|
| `wave0_source_intake` | exact `file:artifacts/wave0/<recorded-slug>/source.yaml` | `source_yaml` + `wave0.source-metadata-array.v1` | none |
| primary `wave1_topic_deepening` | exact paired `evidence-summary.md` and `question-list.md` for one recorded Topic | `evidence_summary` + `wave1.evidence-summary.v1`; `question_list` + `wave1.question-list.v1` | current pair must be declared by this attempt |
| supplementary `wave1_topic_deepening` | explicitly empty `required_receipts` | empty | may submit new source/cache facts and cite an eligible prior submitted `evidence_summary`; must not rewrite/redeclare the prior pair |
| `wave2_targeted_evidence` | existing empty receipt shape | empty | existing result/cache/source/provenance validation only |

Primary versus supplementary is expressed by the canonical required-receipt set produced under AGQ-013. It is never inferred from a queue ID, task prose, actor role, current files, or `writes_to`. `writes_to` remains an allowed write surface and may include optional/pattern targets; it cannot create a required output.

New queue items and payloads containing `output_contract`, `direct_contract`, `required_outputs`, `assignment_contract_version`, or an equivalent selector are rejected before work-ID allocation or mutation. This intentionally retires the current generic queue/payload output-contract override for new claims.

At submit, the Engine first verifies index/version and the embedded queue snapshot hash, reconstructs the expected contract from recorded snapshot coordinates, then requires exact equality in manifest and beacon. Current mutable plan presentation may validate that the recorded Topic still exists, but cannot remap the attempt's path. Generated task and result schema cannot select or amend contract identity.

Compatibility matrix:

| Attempt state | Marker state | Behavior |
|---|---|---|
| new claim | current known version | resolve before mutation; exact roles/direct checks apply |
| new claim | absent, unknown or conflicting | reject before mutation |
| pre-change claimed/timed-out attempt | marker genuinely absent | bounded legacy submit/late-submit semantics; no current direct blocker; existing narrow Wave1 `other -> canonical role` normalization may apply |
| any attempt | current known marker | exact role; never invoke legacy role normalization |
| any attempt | unknown, conflicting, partially removed or malformed marker | fail closed; never fall back to legacy |

Marker absence is the only legacy discriminator. Framework version, bundle timestamp and manifest shape inference are forbidden.

Rejected alternatives:

- Deriving from `writes_to` confuses permission with obligation.
- Path-regex dispatch recreates a hidden global registry.
- Copying the full contract/digest into index creates unnecessary duplicate authority.
- Trusting manifest, beacon, result role or actor input lets projections select acceptance rules.

### D4. Every acceptance checkpoint reads fresh bytes; replay does not reaccept

The checkpoint lifetime matrix is:

| Checkpoint | Reads live required-output bytes | Direct evaluator | Mutation / authority | What PASS proves |
|---|---|---|---|---|
| `dry-submit` | yes, fresh per invocation | yes for current marker | none | predictive: this invocation's snapshots satisfy candidate validation |
| claimed timeout-preflight | yes, fresh per invocation | yes for current marker | no acceptance mutation | current candidate is repairable/submittable or has named roots before timeout decision |
| first normal submit | yes, fresh after all binding checks | yes for current marker | only successful normal completion owner | this invocation's snapshots passed before success mutation |
| eligible first late-submit | yes, fresh after eligibility/binding checks | yes for current marker | audited late completion owner | this invocation's snapshots passed before late acceptance |
| same-result duplicate submit | no re-decision from mutable artifact bytes | no | idempotent postcondition verification only | recorded result/ledger/queue/status postconditions still agree |
| already-accepted late-submit replay | no re-decision from mutable artifact bytes | no | idempotent late postcondition verification only | recorded audited late postconditions still agree |
| `recover-declaration` | no | no | restores only the exact missing declaration row | prior acceptance owners reconstruct the recorded row |
| Wave inspect / Gate | yes, current files | yes plus Wave-only rules | inspect is read-only; Gate retains phase verdict | current bundle state satisfies direct and phase-wide rules |

No dry-submit PASS or cached evaluator result authorizes a later checkpoint. Formal first acceptance reads again. Conversely, replay and declaration recovery do not make historical success depend on later mutable bytes.

This design does not claim that the checked bytes are atomically committed with the ledger or immutable afterward. Existing `result_hash` and `ledger_record_hash` do not hash artifact bytes. Hardening that property requires a separate explicit data-model and migration change.

### D5. Repair follows provenance, not convenience

The neutral root includes a closed `repair_scope` used by the candidate adapter:

| Root class | Examples | Owner after actor return | Legal continuation |
|---|---|---|---|
| mechanical candidate | wrong declared role/path, safe YAML serialization, one BOM/encoding correction where meaning is unchanged, tolerated heading presentation expressed incorrectly | Phase Agent may perform/direct a meaning-preserving repair within the assigned write surface | retain work ID/candidate, rerun the same dry-submit, then formal submit |
| semantic content | missing source facts, empty/missing real findings, empty/missing real research questions | original actor only before `work_done`; after `work_done`, Phase Agent cannot author semantics under that provenance | terminalize current attempt through an existing legal terminal action, explicitly enqueue replacement demand, claim a new work ID, run a real actor, then dry-submit |
| contract/integrity | unknown marker/ID, snapshot drift, manifest/beacon mismatch, unsafe target | Engine/implementation or out-of-band maintenance decision; not actor content repair | fail closed at current checkpoint; do not mutate candidate authority or guess fallback |

`fail` and `abandon` do not automatically requeue. The Phase Agent must explicitly enqueue replacement demand after semantic rejection, then claim it. Existing timeout and actor-spawn-unavailable branches remain the only existing automatic retry-producing paths. The design does not add a retry controller.

The native actor receives exact path/role/direct-contract projections and verifies writes before `work_done`, but v1 does not require it to own CLI invocation. The Phase Agent runs dry-submit after actor return and consumes every structured violation. The user is involved only if a new semantic/risk/permission decision is genuinely required, not for ordinary submit or repair commands.

Rejected alternatives:

- Letting the Phase Agent fill missing findings/questions after `work_done` creates misleading provenance.
- Automatically requeueing every semantic failure creates a hidden retry tree and can loop without new evidence.
- Making all direct failures advisory leaves the acceptance invariant unenforced.

### D6. Read one bounded regular-file snapshot under the bundle root

The shared reader accepts only an Engine-resolved concrete bundle-relative target and uses Node.js >=20 built-ins. Maximum decoded input is 4 MiB per required output. Apply must confirm this cap against current legitimate artifact samples before target edits; invalidating evidence pauses implementation and updates this design.

Reader policy:

1. Reject absolute, empty, dot, traversal, backslash/non-canonical and normalized-escape paths before filesystem access.
2. Resolve the active bundle realpath and target parent/target realpath; reject stable symlinks and any realpath outside the bundle.
3. Open the target once with read-only semantics suitable for rejecting observable symlink targets on supported platforms.
4. Use that same handle for `fstat` and bounded read; reject directories, non-regular/special files, oversize metadata, growth beyond the cap, short/failed reads and close errors that invalidate the snapshot.
5. Decode with fatal UTF-8 semantics; strip exactly one leading UTF-8 BOM for parsing; reject invalid UTF-8. Do not normalize the remaining bytes differently per adapter.
6. Return only the bounded byte snapshot and safe diagnostic metadata. All direct facts for an invocation evaluate those same bytes.

Threat model and residual risk:

- In scope: lexical escape, stable symlink/realpath escape, directory/special file substitution, unbounded allocation/read, ordinary replacement/read errors, and malformed encoding.
- Hardlink aliasing is not rejected by identity because a portable bundle-only ownership proof is unavailable; the opened regular file is still bounded and evaluated.
- A malicious same-host actor may race pathname checks or replace directory entries. Same-handle `fstat + read` keeps evaluation internally consistent for the opened object, but this design does not claim race-free proof that the opened inode was always bundle-owned.
- If the Node 20 spike cannot enforce the stated stable-path policy on supported platforms, or the trusted-local-actor model is insufficient, apply stops before target edits and revises the security contract rather than weakening it silently.

Candidate and Wave adapters must use this same reader for admitted direct facts. They may resolve different authorized targets, but cannot use different size, decode, BOM, or parse policy and still claim direct-verdict parity.

### Apply target manifest and net simplification

Expected production code targets:

- add/focus `DPT_FRAMEWORK/engine/helpers/direct-output-contract.mjs` for the deep evaluator and bounded reader (or split one private reader file if testing/locality requires it without enlarging the external interface);
- modify work-unit constants/schema/envelope/index/lifecycle/validation/submit/timeout-preflight and CLI diagnostics needed to resolve, bind, project and enforce the contract;
- modify queue producer/validation ownership needed by AGQ-013 to encode primary paired versus explicit supplementary receipt shapes and reject selectors;
- modify `wave-contract-evaluators.mjs` to adapt the shared evaluator and delete inline direct interpretations;
- modify focused Zod work-unit contracts and existing tests under `tests/`;
- add one registered Agent-flow playbook under `experiments_playbook/exp_evidence-extraction/` for the narrow real-actor semantic-rejection/replacement behavior;
- update only the functional production Markdown whitelist below, plus generated-task JavaScript; update `CHANGELOG.md` and only the `DPT_FRAMEWORK/RUN.md` version banner/current-release metadata for `v0.38`.

Functional production Markdown whitelist:

- `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`
- `DPT_FRAMEWORK/COMMANDS.md`

Wave phase docs and role specs remain unchanged. Runtime `_work_units/*/task.md` is generated and must never be hand-edited. Any additional Agent-facing behavior Markdown requires a design amendment before editing.

Net simplification:

- delete three inline Wave direct-fact interpretations after moving them behind one evaluator interface;
- retire `other -> canonical role` for current attempts while bounding it to truly marker-absent legacy attempts;
- replace manifest self-trust/queue override ambiguity with one closed resolver and exact reconstruction path;
- remove Agent guesswork about exact required path/role/direct contract through generated projection;
- avoid a new CLI, registry, state stack, artifact hash, second validator, auto-repair branch, or phase-wide submit logic.

The new persisted marker earns its place because resolver semantics cannot be reconstructed safely from mutable framework defaults. It replaces version guessing and does not duplicate the full contract.

## Risks / Trade-offs

- [The 4 MiB cap rejects an unforeseen legitimate artifact] -> Run a pre-target size/type audit, retain bounded diagnostics, and update the design before implementation if current legitimate samples invalidate the cap.
- [Resolver classification breaks supplementary Wave1] -> Lock the primary/supplementary matrix in unit and integration tests; empty receipts are explicit supplementary assignment facts, never suffix inference.
- [Legacy compatibility becomes an indefinite second path] -> Marker absence is the sole narrow discriminator; all new claims require the current marker; tests reject unknown/conflicting markers and current-attempt role normalization.
- [Manifest/beacon projections drift] -> Reconstruct from hash-bound assignment facts and compare both exactly before content read; generated parity tests cover task/schema projections.
- [Candidate and Wave outputs expose different messages] -> Share neutral roots, not presentation text; adapter parity asserts stable root codes/coordinates while allowing surface-specific advice.
- [Semantic blocker leaves a completed actor attempt unusable] -> Preserve provenance by explicit terminalization and replacement; do not add hidden retries or transfer authorship.
- [Fresh reads allow bytes to change after dry-submit or submit] -> State the snapshot-only proof honestly; current-file drift remains visible at Wave inspect/Gate. Artifact immutability is out of scope.
- [Filesystem checks are mistaken for complete hostile-host isolation] -> Document hardlink and concurrent replacement residuals; same-handle reads guarantee snapshot consistency, not universal inode provenance.
- [Queue override rejection affects callers] -> Baseline current production producers before target edits; update sanctioned producers in the same change and reject only new claim selectors, preserving marker-absent in-flight compatibility.
- [The shared module becomes shallow indirection] -> Delete old inline logic and test through the evaluator interface; if no complexity moves behind it, merge it into the actual owning helper rather than retaining a facade.

## Migration Plan

1. Before any target edit, create `implementation-evidence.md` in this change and validate `verification-plan.yaml` in plan mode.
2. In a fresh disposable bundle, run the current production path to establish the submit-then-Wave timing baseline. Record native files/trace/CLI evidence, not console confidence.
3. Run the Node 20 reader spike and legitimate artifact size/type sample audit. Confirm the 4 MiB policy, same-handle snapshot behavior, stable symlink/realpath/special-file rejection, UTF-8/BOM behavior and residual risks.
4. Run the selected real Subject Agent baseline/canary when the runtime is available, or record native `NOT_RUN`. This evidence may classify frequency but cannot replace the preventive invariant.
5. Stop before target edits and revise proposal/design/specs/tasks if baseline evidence shows the direct failure is only version skew, legitimate workflow requires post-submit Phase completion, the resolver cannot distinguish required from optional outputs, the reader contract is infeasible, or the preventive invariant is false.
6. Add failing focused tests for resolver/schema/reader/evaluator, then integration tests for claim projection, all first-acceptance checkpoints, replay, legacy/current roles, supplementary reuse and Wave parity.
7. Implement the strict assignment marker/schema/resolver and generated projections; then add the shared reader/evaluator and candidate adapter.
8. Migrate Wave adapters and delete their inline direct checks. Preserve all Wave-only rules and confirm current-file behavior.
9. Update only approved Markdown/release surfaces, run the registered Agent-flow canary, full regressions, verification assets, governance and strict OpenSpec validation.

No historical runtime bundle is rewritten. Existing marker-absent attempts remain legacy. Rollback removes current-version claim creation and candidate enforcement while retaining backward-readable extra projection fields only if needed for a staged code rollback; because no artifact bytes or ledger schema are migrated, rollback requires no data rewrite. Before release, rolling back must also restore the `v0.37` release metadata. After new current-version attempts exist, a code rollback must either retain their reader/resolver support or explicitly refuse them; it must not reinterpret them as legacy.

## Open Questions

No blocking design questions remain. Apply evidence gates are falsification checks, not deferred design choices. A failed gate requires an explicit change-artifact revision before target work continues.
