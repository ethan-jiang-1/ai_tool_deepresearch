## Context

当前 work-unit candidate checkpoint 已直接校验 result、runtime receipt、declared output path/role/existence、cache trail、source claim 与 queue binding，但不读取明确分配给该 attempt 的 Wave0/Wave1 artifact content。相同 artifact 的 direct facts 随后由 Wave inspect/Gate 判断，因此一个确定性不合格的 delegated output 可以先成为 submitted provenance，再由 Phase Agent 在更晚的 checkpoint 面对同一个根因。

这个 change 不是新增通用 linter。它把 `wave-contract-evaluators.mjs` 当前内联的三类 direct fact 提取为一个 Engine-internal 深模块，由 work-unit candidate validation 与 Wave inspect/Gate 两个真实 adapter 复用。Candidate checking 仍使用现有 `operate-work-unit dry-submit`、formal submit、Wave inspect 和 Gate interface；不新增 standalone linter CLI。AGQ-013 只给现有 `operate-queue repair` 增加一个窄化的 mode-repair flag 组合。

本设计 paired-read `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md`。结论是：required exact output 的 direct structure 在最早合法 decision point fail fast；phase completeness、provenance 和 cross-artifact judgment 留在 Wave checkpoint；用户不承担普通 pipeline 操作，Agent 执行获准修复，Engine 拥有确定性 verdict。

Direct Sources of Record are:

- assignment identity: registered kind plus the hash-bound queue-item snapshot's canonical Topic coordinates, closed `payload.assignment_mode`, and canonical `file:` required receipts;
- current candidate content: one bounded byte snapshot read for the current checkpoint invocation;
- historical acceptance/replay: submitted index, ledger, result hash and durable queue/status postconditions;
- current phase truth after submit: current artifact bytes plus existing Wave-wide authority surfaces.

Manifest, beacon, generated task/checklist and result schema are projections or binding surfaces. They do not independently select a contract or become an additional acceptance voter.

## Goals / Non-Goals

**Goals:**

- Resolve a closed, versioned exact-output contract before claim mutation from attempt-bound assignment facts.
- Reconstruct and verify the same contract at current-version candidate checkpoints rather than trusting manifest or actor declarations.
- Reuse one neutral target-level direct-output module and one snapshot policy from both candidate and Wave adapters.
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
evaluateDirectOutputTarget({ bundleDir, target, contractId })
// -> { passed, snapshot_meta, roots: [{ code, contract_id, coordinate, expected, observed, root_class }] }
```

The interface accepts only the active bundle root, one Engine-resolved concrete bundle-relative target, and a closed contract ID. It owns lexical/realpath checks, one-handle bounded reading, UTF-8/BOM decoding, tolerant parsing, prerequisite short-circuiting and neutral root results. Its closed root_class is only `semantic_content|contract_integrity`: a missing target is `semantic_content` because producing the assigned artifact is actor work; unsafe/non-regular/escaping paths, bounded-read/oversize failures and invalid UTF-8 are `contract_integrity`; parse/schema/required-section failures are `semantic_content`. It cannot emit submit-specific `mechanical`, inspect runtime receipts, or choose a lifecycle action. It returns only bounded size/identity diagnostics, never raw/decoded artifact bytes, so adapters cannot reparse behind the interface. It does not parse queue/manifest/result state, select a target or contract, generate submit `write_to`, produce Gate hints, mutate authority, or expose parser exceptions/artifact content without bounds. Reader/decoder/parser helpers remain private implementation seams; adapters and tests do not compose them as a second public interface.

Two adapters make the seam real:

1. Work-unit adapter reconstructs the assigned exact target/contract, calls the target-level interface, combines its roots with candidate/result, receipt, output, source/cache and Engine-binding validation, and projects existing `violations[]`, repair_scope, `write_to`, rerun and the closed candidate projection.
2. Wave adapter resolves the current per-Topic target/contract, calls the same target-level interface, and projects roots into existing findings/hints before continuing with Wave-only checks.

For Wave projection, a missing/unsafe/unreadable target root maps to the existing earliest file-existence/authority rule and masks its dependent schema/section rule. After a successful read, YAML parse/schema or Markdown semantic roots map to the existing direct rule ID. The adapter must not run a separate `exists/readFile` path that emits a second root for the same target.

The existing inline YAML/Key Findings/question-section interpretations are removed after adapter parity is proven. Tests cross the target-level interface and each adapter's observable output; they do not expose internal parser helpers as a second interface.

Rejected alternatives:

- A thin contract-ID dispatcher beside the old logic fails the deletion test and is not acceptable.
- A new linter CLI enlarges the public interface and duplicates existing checkpoints.
- Letting adapters pre-decode content risks candidate/Gate verdict drift.

### D3. Resolve exact assignments from immutable attempt facts

Choose explicit manifest transport generated by an Engine-owned resolver. The current literal is `assignment_contract_version: "work-unit.assignment.v1"`; it versions the resolver semantics and assignment binding together, so no separate resolver_version field exists. It is recorded on the Engine-owned index record. The full contract is reconstructed, not copied into the index.

Resolver flow:

```text
registered kind
  + hash-bound embedded queue snapshot
  + snapshot canonical Topic UID/current slug
  + snapshot payload.assignment_mode
  + canonical file: required_receipts
  + index assignment_contract_version
    -> strict output_contract including required_outputs[]
    -> exact equality in manifest and beacon
    -> generated task/checklist/result-schema projections
```

`required_outputs[]` entries contain exactly `path`, `role`, and `direct_contract`. Paths are concrete bundle-relative paths. Cross-field Zod refinement rejects duplicate normalized paths, conflicting roles/contracts, unsafe paths, partial pairs, unsupported receipt sets and unknown closed values.

The v1 assignment matrix is:

| Kind / form | Assignment mode | Required receipt shape | Resolved required outputs | Prior-output behavior |
|---|---|---|---|---|
| `wave0_source_intake` | absent/not applicable | exact `file:artifacts/wave0/<recorded-slug>/source.yaml` | `source_yaml` + `wave0.source-metadata-array.v1` | none |
| primary `wave1_topic_deepening` | `primary` | exact paired `evidence-summary.md` and `question-list.md` for one recorded Topic | `evidence_summary` + `wave1.evidence-summary.v1`; `question_list` + `wave1.question-list.v1` | current pair must be declared by this attempt |
| supplementary `wave1_topic_deepening` | `supplementary` | exactly empty | empty | may submit new source/cache facts and cite an eligible prior submitted `evidence_summary`; must not rewrite/redeclare the prior pair |
| `wave2_targeted_evidence` | absent/not applicable | existing empty receipt shape | empty | existing result/cache/source/provenance validation only |

Primary versus supplementary is expressed by closed `payload.assignment_mode` and must agree with the canonical required-receipt set produced under AGQ-013. `primary + pair` and `supplementary + empty` are the only current shapes. This prevents an accidentally empty primary receipt set from silently becoming supplementary. Mode is assignment intent, not a direct-contract selector: the Engine still derives roles and contract IDs. It is never inferred from a queue ID, task prose, actor role, current files, or `writes_to`. `writes_to` remains an allowed write surface and may include optional/pattern targets; it cannot create a required output.

Field lifecycle:

| Fact | Owner/writer | Reader | Persistence and compatibility |
|---|---|---|---|
| `payload.assignment_mode` | Wave1 queue producer or AGQ-013 unclaimed-mode repair under WAI-007 | new-enqueue/repair admission and work-unit claim resolver | retained inside the queue item and hash-bound embedded snapshot; not copied as a separate index field; generic queue storage parsing keeps it optional so historical terminal rows and repairable live cards remain loadable |
| `assignment_contract_version: work-unit.assignment.v1` | work-unit claim Engine | dry-submit, timeout-preflight, first submit/late-submit, replay binding checks | top-level index/manifest/beacon marker and resolver-semantics version; absence selects legacy only after claim, never on an unclaimed card; no separate resolver_version |
| `required_outputs[]` | Engine resolver merged with the validated kind contract | generated projections and first-acceptance reconstruction | manifest/beacon output contract only; reconstructed rather than copied into index or actor result |

Operation-specific admission, not generic queue storage parsing, requires assignment_mode for every newly enqueued/current claimed `topic_deepening` item and validates mode/receipt parity. Thus old queue files remain readable for explicit repair, while no old live item can be claimed through intent inference. When claim plans a batch, it resolves and validates every candidate in the planned contiguous batch before allocating any work ID, opening a batch, moving queue entries, or writing any envelope; one invalid later item rejects the whole planned mutation.

Existing queue/payload `output_contract` customization remains available only for its current result-field, allowed-role, source-claim and cache-adjacent kind semantics, and is strictly validated before use. The closed reserved selector-key set is `required_outputs`, `direct_contract`, `direct_contract_id`, `assignment_contract_version`, `resolver_version`, and `contract_id`; enqueue, mode repair and claim reject any occurrence at the queue-item root or recursively under payload/output_contract. Other unknown payload fields are never resolver inputs and cannot select behavior merely by prose or naming. The Engine merges the validated legacy kind contract with resolver-owned `required_outputs` and then reconstructs the same merged expected value at submit. This avoids an unrelated breaking removal while keeping direct-contract selection Engine-owned.

At submit, the Engine first verifies index/version and the embedded queue snapshot hash, reconstructs the expected contract from recorded snapshot coordinates, then requires exact equality in manifest and beacon. Current mutable plan presentation may validate that the recorded Topic still exists, but cannot remap the attempt's path. Generated task and result schema cannot select or amend contract identity.

Compatibility matrix:

| Attempt state | Marker state | Behavior |
|---|---|---|
| new claim | current known version | resolve before mutation; exact roles/direct checks apply |
| new claim | absent, unknown or conflicting | reject before mutation |
| any unclaimed Wave1 card | missing/unknown assignment mode | reject as ambiguous; repair queue demand explicitly before claim |
| pre-change claimed/timed-out attempt | marker genuinely absent | bounded legacy submit/late-submit semantics; no current direct blocker; existing narrow Wave1 `other -> canonical role` normalization may apply |
| any attempt | current known marker | exact role; never invoke legacy role normalization |
| any attempt | unknown, conflicting, partially removed or malformed marker | fail closed; never fall back to legacy |

Marker absence is the only legacy discriminator. Framework version, bundle timestamp and manifest shape inference are forbidden.

AGQ-013 owns the executable repair for a mode-absent live `topic_deepening` card: `operate-queue repair <bundle> --queue-item-id <id> --set-assignment-mode <primary|supplementary>`. The ID selects exactly one queued `topic_deepening` item in `active_window` or `refill_pool` whose `payload.assignment_mode` is genuinely absent; the flag is the queue owner's explicit assignment-intent authority. A card with an existing mode is not reclassifiable through this operation. The Engine preserves queue location/order, `created_at`, producer rule, kind, canonical Topic UID/slug, delegation target, lineage and all non-selector contract customization. It changes only `payload.assignment_mode`, `required_receipts`, `updated_at`, and, for primary, ensures the two canonical paired paths are included in `writes_to` while preserving other valid allowed writes. Primary derives the exact Topic-bound pair; supplementary derives an empty receipt set and leaves `writes_to` otherwise unchanged because permission is not obligation. One complete queue save occurs only after the repaired item passes canonical Topic, assignment-mode/receipt-shape, direct-selector, kind-contract and queue-schema admission. Success emits a structured `queue_assignment_mode_repaired` trace/audit event with queue ID, Topic coordinates, prior receipt shape, selected mode, derived receipt shape and preserved location; the event is evidence of the repair, not assignment authority independent of `rb_queue.json`. Missing, already-classified, duplicate-location, wrong-producer, non-queued, delegated-in-flight or terminal IDs reject with no queue mutation or success event. This is not a whole-card replacement, JSON patch or generic state editor. The existing QIV-004 `repair --remove-stale` behavior and requirement remain unchanged; this producer-specific repair does not broaden stale detection.

Rejected alternatives:

- Deriving from `writes_to` confuses permission with obligation.
- Treating empty receipts alone as supplementary confuses missing producer data with accepted intent.
- Making the field globally required in persisted queue history would trade assignment safety for bundle unreadability; operation-specific admission keeps repair possible.
- Hand-editing `rb_queue.json`, replacing the whole card, overloading stale-card removal, or adding an arbitrary patch command would bypass immutable assignment identity or create a broad queue mutation interface.
- Path-regex dispatch recreates a hidden global registry.
- Copying the full contract/digest into index creates unnecessary duplicate authority.
- Trusting manifest, beacon, result role or actor input lets projections select acceptance rules.
- Rejecting all existing kind-contract customization would widen this change beyond the direct-output problem; only selector-bearing customization is prohibited.

### D4. Every acceptance checkpoint reads fresh bytes; replay does not reaccept

The checkpoint lifetime matrix is:

| Checkpoint | Reads live required-output bytes | Direct evaluator | Mutation / authority | What PASS proves |
|---|---|---|---|---|
| `dry-submit` | yes, fresh per invocation | yes for current marker | none | predictive: this invocation's snapshots satisfy candidate validation |
| claimed timeout-preflight | yes, fresh per invocation | yes for current marker | no acceptance mutation | current candidate is submittable, mechanically repairable, semantically blocked/replacement-bound, or has integrity roots before timeout decision |
| first normal submit | yes, fresh after all binding checks | yes for current marker | only successful normal completion owner | this invocation's snapshots passed before success mutation |
| eligible first late-submit | yes, fresh after eligibility/binding checks | yes for current marker | audited late completion owner | this invocation's snapshots passed before late acceptance |
| same-result duplicate submit | no re-decision from mutable artifact bytes | no | idempotent postcondition verification only | recorded result/ledger/queue/status postconditions still agree |
| already-accepted late-submit replay | no re-decision from mutable artifact bytes | no | idempotent late postcondition verification only | recorded audited late postconditions still agree |
| `recover-declaration` | no | no | restores only the exact missing declaration row | prior acceptance owners reconstruct the recorded row |
| Wave inspect / Gate | yes, current files | yes plus Wave-only rules | inspect is read-only; Gate retains phase verdict | current bundle state satisfies direct and phase-wide rules |

No dry-submit PASS or cached evaluator result authorizes a later checkpoint. Formal first acceptance reads again. Conversely, replay and declaration recovery do not make historical success depend on later mutable bytes.

This design does not claim that the checked bytes are atomically committed with the ledger or immutable afterward. Existing `result_hash` and `ledger_record_hash` do not hash artifact bytes. Hardening that property requires a separate explicit data-model and migration change.

### D5. Repair follows provenance, not convenience

The candidate adapter assigns a closed `repair_scope` across the complete dry-submit root set. The scope is about legal repair ownership, not whether a fact is syntactically simple:

| Root class | Examples | Owner after actor return | Legal continuation |
|---|---|---|---|
| mechanical candidate | a parseable candidate omits an envelope-const identity/schema projection with one unambiguous expected value; or the exact assigned target passes while `result.json` omits/misdeclares its required path/role | Phase Agent may repair only those deterministic candidate declaration fields; artifact, receipt, source and cache facts remain unchanged | retain work ID/candidate, rerun the same dry-submit, then formal submit |
| semantic content | result/receipt/required target absent or unparseable; target YAML/sections invalid; missing or invalid actor-owned receipt, source claim, accepted URL, cache trail/content/meta or research fact; any artifact/receipt/source/cache fact change needed to pass | selected actor before `work_done`; after `work_done`, Phase Agent cannot author/reshape those facts under that provenance | before `work_done`, return to the selected actor; after `work_done`, fail -> explicit same-obligation replacement enqueue -> new actor/work ID -> dry-submit |
| contract integrity | conflicting non-empty work/queue/kind/nonce/actor identity; unknown marker/ID; snapshot/index/manifest/beacon/queue/ledger/hash disagreement; unsafe/non-regular/escaping/unreadable/oversized/invalid-UTF8 path; ambiguous prior submitted authority | Engine/implementation or out-of-band maintenance decision; not actor content repair | fail closed at current checkpoint; do not mutate candidate authority or guess fallback |

Mechanical insertion is allowed only for an absent/defaultable declaration whose expected value comes from the already-verified envelope; a conflicting supplied identity is integrity, not a value to overwrite. A parse failure cannot be called mechanical because rebuilding JSON may reconstruct actor meaning. Missing or malformed lifecycle receipt facts, source/cache claims and URLs remain actor-owned semantic facts even when the textual edit would be small. This keeps provenance-based ownership stable across every existing dry-submit validator.

For a post-`work_done` semantic rejection, the one normal path is `operate-work-unit fail` with normalized reason `semantic_contract:<primary_root_code>`, explicitly enqueue a replacement demand with a new queue ID but the same canonical Topic and assignment intent, then claim it. The code comes directly from the Engine projection; the reason must not use `actor_spawn_unavailable:` or another accepted automatic-retry trigger. The replacement `queue_item_id` must be fresh across `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`; only the new work-unit attempt receives a new `work_id`. A failed primary assignment therefore produces a `primary + paired receipts` replacement; it must not be weakened into supplementary empty-output work or reuse the failed queue identity. `abandon` remains available only for its pre-existing cancellation semantics and is not offered as a competing semantic-replacement action. Ordinary `operate-work-unit fail` does not automatically requeue. Existing timeout and actor-spawn-unavailable branches remain the only existing automatic retry-producing paths. The design does not add a retry controller.

The candidate adapter combines neutral roots with Engine-validated lifecycle receipt state and returns one non-persistent `recommended_action` plus `primary_root_code`. One closed Engine schema SHALL own this projection and validate it before return; formal rejection and timeout mapping SHALL import that owner rather than redeclare strings. `primary_root_code` is null for submit; otherwise it is the first violation in stable collection order among the highest-precedence scope present, so the Agent never selects a reason code from prose:

| Condition | `recommended_action` |
|---|---|
| no roots | `submit` |
| any contract_integrity root | `inspect_contract` |
| any semantic_content root and `work_done` observed | `fail_and_replace` |
| any semantic_content root before `work_done` | `return_to_actor` |
| mechanical roots only | `repair_same_candidate` |

Precedence is the table order after `submit`: integrity masks unreliable downstream action; semantic outranks independent declaration cleanup. The projection does not mutate state or perform the action. Formal-submit rejection reuses the same action derivation and still points to dry-submit for re-evaluation where applicable. Markdown explains how to execute the named existing operations but does not derive the action itself.

Timeout-preflight keeps its accepted coarser action vocabulary. When it actually evaluates a candidate, it also returns the exact shared candidate projection as `candidate_projection`; when prerequisites prevent candidate evaluation, that field is null. It maps candidate actions deterministically: `submit -> submit`, `repair_same_candidate -> repair`, `return_to_actor -> repair` with actor-owned advice, `fail_and_replace -> block` with the explicit fail/replacement boundary, and `inspect_contract -> inspect|block`. It must not discard primary_root_code, invent a candidate projection, collapse post-work_done semantic failure into Phase Agent same-candidate repair, or use any candidate action as timeout eligibility by itself.

The native actor receives exact path/role/direct-contract projections and verifies writes before `work_done`, but v1 does not require it to own CLI invocation. The Phase Agent runs dry-submit after actor return and consumes every structured violation. The user is involved only if a new semantic/risk/permission decision is genuinely required, not for ordinary submit or repair commands.

Rejected alternatives:

- Letting the Phase Agent fill missing findings/questions after `work_done` creates misleading provenance.
- Automatically requeueing every semantic failure creates a hidden retry tree and can loop without new evidence.
- Making all direct failures advisory leaves the acceptance invariant unenforced.

### D6. Read one bounded regular-file snapshot under the bundle root

The target-level module accepts only an Engine-resolved concrete bundle-relative target and uses Node.js >=20 built-ins. Maximum raw input is 4 MiB per required output. Apply must confirm this cap against current legitimate artifact samples before target edits; invalidating evidence pauses implementation and updates this design.

Reader policy:

1. Reject absolute, empty, dot, traversal, backslash/non-canonical and normalized-escape paths before filesystem access.
2. Resolve the active bundle realpath and target parent/target realpath; reject stable symlinks and any realpath outside the bundle.
3. Open the target once with read-only semantics suitable for rejecting observable symlink targets on supported platforms.
4. Use that same handle for `fstat` and a read capped at `4 MiB + 1 byte`; reject directories, non-regular/special files, initial or observed content beyond the cap, and read errors. If the opened file shrinks after `fstat`, accept the shorter EOF snapshot; do not require bytes read to equal stale metadata. A close error is diagnostic after a complete read, not grounds to pretend the snapshot was never evaluated.
5. Decode with fatal UTF-8 semantics; strip exactly one leading UTF-8 BOM for parsing; reject invalid UTF-8. Do not normalize the remaining bytes differently per adapter.
6. Keep the bounded bytes private, return only safe bounded snapshot metadata and roots, and evaluate all direct facts for an invocation from those same bytes.

Threat model and residual risk:

- In scope: lexical escape, stable symlink/realpath escape, directory/special file substitution, unbounded allocation/read, ordinary open/read errors, concurrent growth beyond the cap, and malformed encoding.
- Hardlink aliasing is not rejected by identity because a portable bundle-only ownership proof is unavailable; the opened regular file is still bounded and evaluated.
- A malicious same-host actor may race pathname checks or replace directory entries. Same-handle `fstat + read` keeps evaluation internally consistent for the opened object, but this design does not claim race-free proof that the opened inode was always bundle-owned.
- If the Node 20 spike cannot enforce the stated stable-path policy on supported platforms, or the trusted-local-actor model is insufficient, apply stops before target edits and revises the security contract rather than weakening it silently.

Candidate and Wave adapters must call this same target-level operation for admitted direct facts. They may resolve different authorized targets, but cannot access bytes or substitute different size, decode, BOM, or parse policy and still claim direct-verdict parity.

### Apply target manifest and net simplification

Expected production code targets:

- add/focus `DPT_FRAMEWORK/engine/helpers/direct-output-contract.mjs` for the target-level deep module (a private reader file is allowed only as an internal seam and must not enlarge the interface used by adapters/tests);
- modify work-unit constants/schema/envelope/index/lifecycle/validation/submit/timeout-preflight and CLI diagnostics needed to resolve, bind, project and enforce the contract;
- modify queue producer/enqueue/claim validation ownership needed by AGQ-013 to encode `payload.assignment_mode`, require its parity with primary paired versus supplementary empty receipt shapes, preserve strictly validated non-selector kind customization, and reject missing mode/direct selectors;
- extend AGQ-013's `topic_deepening` queue ownership with one `repair --queue-item-id --set-assignment-mode` operation that preserves card identity/contract fields, derives only mode-owned receipts/write permissions, reuses current admission, rejects wrong-producer/in-flight/terminal targets, and does not expose replacement/patch semantics;
- modify `wave-contract-evaluators.mjs` to adapt the target-level module, map read roots to existing earliest file rules, and delete duplicate existence/read/direct interpretations for admitted targets;
- modify focused Zod work-unit contracts and existing tests under `tests/`;
- add one registered Agent-flow playbook under `experiments_playbook/exp_evidence-extraction/` where setup stops before claim and one independent real Subject Agent acts as Phase Agent across three bounded turns: first child + saved dry-submit rejection, fail/fresh-ID replacement claim, then second child + submit. Between turns the harness retains first-attempt result/receipt/source/cache refs and hashes canonical outputs before and after fail/re-enqueue, so later overwrite by the second real child cannot erase the provenance check. Both children perform real bounded search/fetch and own their source/cache/output. A deterministic postcheck reads native CLI JSON, subject/child evidence and hashes, then appends case-owned `check` events to runtime trace; it does not fabricate production lifecycle events or acceptance authority;
- update only the functional production Markdown whitelist below, plus generated-task JavaScript; update `CHANGELOG.md` and only the `DPT_FRAMEWORK/RUN.md` version banner/current-release metadata for `v0.38`.

Functional production Markdown whitelist:

- `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`
- `DPT_FRAMEWORK/COMMANDS.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` (only the primary/supplementary queue-card authoring fields and semantic-replacement enqueue instruction)

Other Wave phase docs and all role specs remain unchanged. Runtime `_work_units/*/task.md` is generated and must never be hand-edited. Any additional Agent-facing behavior Markdown requires a design amendment before editing.

Net simplification:

- delete three inline Wave direct-fact interpretations after moving them behind one evaluator interface;
- retire `other -> canonical role` for current attempts while bounding it to truly marker-absent legacy attempts;
- replace manifest self-trust/queue override ambiguity with one closed resolver and exact reconstruction path;
- replace empty-receipt supplementary inference with one explicit bounded assignment fact and shape parity;
- remove Agent guesswork about exact required path/role/direct contract through generated projection;
- avoid a new CLI, registry, state stack, artifact hash, second validator, auto-repair branch, or phase-wide submit logic.

The new persisted marker earns its place because resolver semantics cannot be reconstructed safely from mutable framework defaults. It replaces version guessing and does not duplicate the full contract.

## Risks / Trade-offs

- [The 4 MiB cap rejects an unforeseen legitimate artifact] -> Run a pre-target size/type audit, retain bounded diagnostics, and update the design before implementation if current legitimate samples invalidate the cap.
- [Resolver classification breaks supplementary Wave1] -> Lock `assignment_mode + receipt shape` in unit and integration tests; empty receipts alone are never supplementary authority.
- [One invalid candidate partially mutates a batch] -> Resolve all planned candidates before opening the claim transaction or allocating the first work ID; assert zero mutation on mixed-validity batches.
- [Legacy compatibility becomes an indefinite second path] -> Marker absence is the sole narrow discriminator; all new claims require the current marker; tests reject unknown/conflicting markers and current-attempt role normalization.
- [Manifest/beacon projections drift] -> Reconstruct from hash-bound assignment facts and compare both exactly before content read; generated parity tests cover task/schema projections.
- [Candidate and Wave outputs expose different messages] -> Share neutral roots, not presentation text; adapter parity asserts stable root codes/coordinates while candidate alone combines receipt state into one closed action.
- [Semantic blocker leaves a completed actor attempt unusable] -> Preserve provenance through explicit fail and same-obligation replacement; do not add hidden retries or transfer authorship.
- [Fresh reads allow bytes to change after dry-submit or submit] -> State the snapshot-only proof honestly; current-file drift remains visible at Wave inspect/Gate. Artifact immutability is out of scope.
- [Filesystem checks are mistaken for complete hostile-host isolation] -> Document hardlink and concurrent replacement residuals; same-handle reads guarantee one bounded opened-object snapshot, not universal inode provenance or pathname immutability.
- [Queue override rejection affects callers] -> Baseline current production producers before target edits; update sanctioned producers in the same change and reject only new claim selectors, preserving marker-absent in-flight compatibility.
- [The shared module becomes shallow indirection] -> Delete old inline logic and test through the evaluator interface; if no complexity moves behind it, merge it into the actual owning helper rather than retaining a facade.

## Migration Plan

1. Before any target edit, create `implementation-evidence.md` in this change and validate `verification-plan.yaml` in plan mode.
2. In a fresh disposable bundle, run the current production path to establish the submit-then-Wave timing baseline. Record native files/trace/CLI evidence, not console confidence.
3. Run the Node 20 reader spike and legitimate artifact size/type sample audit. Confirm the 4 MiB policy, same-handle snapshot behavior, stable symlink/realpath/special-file rejection, UTF-8/BOM behavior and residual risks.
4. Run the selected independent real Subject Agent baseline/canary when real child-actor plus search/fetch capability is available, or record native `NOT_RUN`. Setup may create only Topic/queue prerequisites and stops before claim; it must not write either actor's result, receipt, output, source/cache, ledger, or trace. Run the same Subject Agent across three bounded turns with pauses after saved first dry-submit rejection and after fail/fresh-ID replacement claim. Retain exact Subject/child evidence plus first-output hashes at both pauses before the second child may overwrite canonical paths. The first child produces its own search/fetch/cache evidence and controlled invalid candidate; the second independently owns replacement search/fetch/cache semantics. Case-owned deterministic checks may project those native facts into trace `check` events but cannot invent dry-submit or lifecycle events. This evidence may classify compliance but cannot replace the preventive invariant.
5. Stop before target edits and revise proposal/design/specs/tasks if baseline evidence shows the direct failure is only version skew, legitimate workflow requires post-submit Phase completion, the resolver cannot distinguish required from optional outputs, the reader contract is infeasible, or the preventive invariant is false.
6. Add failing focused tests for resolver/schema/target-level module, then integration tests for enqueue/unclaimed-mode repair/claim projection, all first-acceptance checkpoints, replay, legacy/current roles, supplementary reuse and Wave parity.
7. Implement the strict assignment marker/schema/resolver and generated projections; then add the target-level direct-output module and candidate adapter.
8. Migrate Wave adapters and delete their inline direct checks. Preserve all Wave-only rules and confirm current-file behavior.
9. Update only approved Markdown/release surfaces, run the registered Agent-flow canary, full regressions, verification assets, governance and strict OpenSpec validation.

No historical runtime bundle is rewritten automatically. Existing marker-absent claimed attempts remain legacy. A queue owner may explicitly select intent for a pre-change unclaimed Wave1 card through AGQ-013's narrow mode repair; claim never guesses intent from receipt shape. Rollback removes current-version claim creation, unclaimed-mode repair and candidate enforcement while retaining backward-readable extra projection fields only if needed for a staged code rollback; because no artifact bytes or ledger schema are migrated, rollback requires no bulk data rewrite. Before release, rolling back must also restore the `v0.37` release metadata. After new current-version attempts exist, a code rollback must either retain their reader/resolver support or explicitly refuse them; it must not reinterpret them as legacy.

## Open Questions

No blocking design questions remain. Apply evidence gates are falsification checks, not deferred design choices. A failed gate requires an explicit change-artifact revision before target work continues.
