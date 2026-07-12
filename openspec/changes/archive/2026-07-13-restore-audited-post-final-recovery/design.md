## Context

当前正常 handoff authority 只有 passed `gate_attempt(next)` 与 route-bound `load_complete`。Final 之后最新合法 handoff固定指向 `phases/phase-final.md`，`enter-phase`、gate preflight与C3 topic-state apply都正确地拒绝旧 predecessor route；缺口不是“校验太严”，而是没有一种不伪造 gate attempt 的 post-final reentry authority。

C1 已让 `check-reentry` 汇总 canonical recovery roots；C2/C3 已证明本项目采用的 crash posture是 caller retained input、prepared workspace、hash-bound exact recovery，而不是 watcher/rollback tree；C3 topic-state apply已经拥有正常 HITL2→rerun window中的 canonical add/update/migrate/layout mutation。C5只需要建立一条从最新 terminal Final lineage到现有 rerun window的窄桥。

本设计 paired-read `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md`。它不假定 Engine 能从同一 OS principal 的字符串、flag或文件中认证“谁说了这句话”。Host permission/approval仍是 framework 外部边界；Engine负责验证 request shape、bundle lineage、allowed action、transaction、event与postcondition，而不是制造一个伪 machine-authenticated human identity。

## Goals / Non-Goals

**Goals:**

- 让明确的 post-final rerun request进入现有 canonical rerun pipeline，不要求手写 status/trace或创建 addendum namespace。
- 保留 Final 的 terminal delivery history，并让每次 reopen绑定一个最新 Final lineage、request digest与新 rerun lineage。
- 复用一个 direct eligibility evaluator、一个窄 helper/CLI、一个 explicit workspace和现有 handoff/reentry/topic-state owners。
- 任意 crash后只出现三种结果：原状态未接受、exact recover可达、direct drift blocked；不做猜测性 rollback。
- 用户只决定新的 rerun semantics/risk；Agent在 host permission允许后执行 retained request、apply/recover、entry、audit与既有 rerun机械链。

**Non-Goals:**

- 不建设 generic `human-override`、`state-seed`、developer state jump、arbitrary status/file/trace patch或permission service。
- 不让 `human-directed`、`--force`、`--override`、自然语言字符串或caller自报身份成为 permission。
- 不新增 Final-owned交互循环、第三个HITL、lifecycle mode/state、background watcher、retry tree或session manager。
- 不让C5 helper直接修改 topic registry/seeds、queue/work-unit、ledger/receipt、artifact/reference/final bytes或adopt historical addendum；成功reentry后由现有C3与正常pipeline处理。
- 不承诺抵抗可任意执行命令并直接改写bundle的恶意同权限actor；该威胁属于host sandbox/approval boundary。

## Decisions

### 1. Scope is one action: `post_final_rerun`

新增 `DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs inspect|apply|recover`，由一个相邻 helper拥有全部 deterministic logic。Closed action enum只有 `post_final_rerun`；它规范化为existing HITL2 decision outcome `rerun`，再通过`transitions.chain.json`的现有`phase-hitl2.md`/`rerun` lookup解析target，并通过manifest/现有status-window helper导出`hitl2_recorded → rerun_ready`。Caller不能提供target/window，C5也不维护第二份映射。HITL2 profile current decision固定为`rerun`。

`inspect`只读；`apply --input <path>`只接受一个retained request；`recover --operation-id <id>`只消费prepared manifest。CLI不提供target node、target gate、status patch、trace payload、file list、force或generic reason-to-authority参数。该operation由独立但狭窄的 `post-final-recovery` capability（`POF-001..003`）拥有；`cli-phase-transition`只负责消费其合法handoff，不反向拥有transaction。

选择直接进入rerun而不是重新加载stop:yes HITL2：post-final request本身已经是新的human semantic decision。Engine将它记录到现有HITL2 profile语义后，Agent应立即恢复机械执行；再次询问同一决定会把用户变成co-runner。该路径仍是HITL2-mediated，因为 accepted request被规范化为HITL2 `rerun` decision，并使用现有HITL2→rerun window，而不是创建Final loop。

未选择 generic override/state-seed，因为它有不同target allowlist、环境构造与风险模型，会把一个incident fix扩成mutation platform。也未在`transitions.chain.json`中为Final添加outgoing edge：Final仍terminal；C5复用的是HITL2 rerun decision的既有routing truth，而不是把Final变成normal source node。

### 2. Direct Sources of Record remain existing owners

| Fact | Direct owner / interpretation | Writer | Invalidated by |
|---|---|---|---|
| Latest delivered Final lineage | latest legal readiness→Final passed gate attempt + route-bound Final load + current Final status coordinate + current final artifact hash inventory | existing gate/enter-phase/final pipeline | newer legal Final lineage or direct drift |
| Pending accepted recovery | `_diagnostics/post-final-recovery/<operation-id>/manifest.json` with `state: prepared` and hash-bound staged profile/event | post-final recovery helper | exact commit cleanup or direct conflict |
| Current accepted post-final request | current HITL2 profile projection plus one Engine-written `post_final_reentry` trace event bound to request/final lineage digests | post-final recovery helper | a newer legal handoff/final lineage; history remains append-only |
| Current phase coordinate/window | existing `rb_status.json#/current_node` and gate window | `enter-phase` then `advance-status`; C5 does not write status | later legal lifecycle operations |
| Topic identity/progress/layout | existing C3 registry, seeds and direct-fact projection | topic-state helper and normal pipeline | C3 sanctioned mutation |
| Rerun iteration limit | active `rerun_count_limit` rule in `gate-rerun-ready.definition.json` | framework gate definition | framework version/change updates the rule |

No second request ledger is added. The retained caller input exists until commit; after commit the request digest, normalized semantic fields and lineage are durable in trace/profile. Workspace files are recovery state, not a permanent parallel authority.

### 3. Eligibility and accepted-lineage replay use one ordered evaluator

`inspect` and `apply` SHALL call the same pure evaluator, but fresh Final eligibility is not its first branch. Otherwise a committed C5 operation would become unrecognizable as soon as legal `enter-phase` changed `current_node` away from Final. The evaluator short-circuits in this order:

1. accepted post-final recovery workspace; return only exact `recover` for exactly one workspace and block ambiguous multiple workspaces;
2. accepted artifact-persistence or topic-state workspace that owns the nearest recovery; return existing quiescent `sweep` or exact topic-state `recover`;
3. newest accepted C5 lineage replay: recognize a structurally valid event bound to its delivered Final, then project its exact current event/entry/status-sync/count/descendant stage without requiring the bundle to remain terminal;
4. fresh eligibility only when no active accepted C5 lineage owns the current run: require latest legal readiness→Final delivery, route-bound Final load, `current_node: phases/phase-final.md`, `current_gate: readiness_passed`, `next_gate: none`, required Final evidence, quiescence and remaining rerun capacity;
5. for `apply`, require request expected identity/lineage/status/profile/rule facts to equal the selected fresh Final or, for replay, require the request digest to equal the already accepted request.

A later normal handoff descended from the C5 rerun does not make the accepted request unknowable; it proves that the recovery lineage has been consumed by the existing lifecycle. A newer legal Final delivery does retire the older C5 lineage from current ownership and may become a new fresh-eligibility candidate. Different request semantics bound to the same delivered Final remain blocked until such a newer Final exists.

Canonical topic drift that C3 can repair after sanctioned rerun is reported as carried repair context, not as a reason to force an out-of-gate repair. Ambiguous control lineage, active persistence/mutation workspace, non-quiescent work or an exhausted next rerun blocks before workspace creation. The limit is read from the existing gate definition rather than duplicated as a C5 constant. Dependent symptoms are masked behind the earliest direct blocker.

The evaluator returns direct facts plus at most one structured next action. The CLI uses one Zod-validated result envelope with operation-specific verdicts: inspect `eligible|unchanged|recover_required|blocked`, apply `committed|unchanged|recover_required|blocked`, and recover `committed|cleaned|blocked`. Cross-field rules are closed: `eligible` requires request-preparation/apply guidance; `recover_required` requires exactly one operation-bound recover action; `committed|cleaned` require the next legal mechanical stage; inspect `unchanged` means an accepted active C5 lineage was projected without mutation; apply `unchanged` additionally requires the identical accepted request digest. `blocked` may carry one exact existing-owner repair or user decision boundary, but never a fabricated C5 success action. `committed` requires durable profile/event plus workspace removal and is never rerun completion; `cleaned` means recover removed only a cleanup-only workspace. `apply` does not duplicate evaluator checks.

### 4. Request input carries semantics and optimistic concurrency, not permission

The retained JSON request is Zod-validated and contains only:

```json
{
  "schema_version": "1.0.0",
  "action": "post_final_rerun",
  "reason": "non-empty human decision summary",
  "requested_scope": "non-empty semantic adjustment summary",
  "expected_bundle_identity": {
    "status_bundle": "dpt_rb_example",
    "plan_basename": "example",
    "normalized_bundle_basename": "example"
  },
  "expected_final_lineage": {
    "final_handoff_index": 123,
    "final_load_index": 124,
    "status_sha256": "...",
    "profile_sha256": "...",
    "final_inventory_sha256": "...",
    "rerun_guard": {
      "rule_id": "rerun_count_valid",
      "definition_sha256": "...",
      "current_count": 1,
      "next_count": 2,
      "limit": 3
    }
  }
}
```

The expected identity/lineage fields come from `inspect`; the Agent prepares/retains the file after the user decision. The identity tuple reuses `rb_status.json.bundle`, matching plan/profile `plan_basename` and the accepted normalized directory-basename evaluator, while hashes/indexes prevent stale-state application. C5 adds no UUID or identity registry and does not claim to distinguish a malicious byte-identical clone whose identity and bytes were copied. The profile digest also binds the inspected rerun count; apply re-reads the active gate rule before acceptance. These fields do not authenticate speaker identity or expand host permission. The audit records execution actor surface as `phase_agent`, decision source as `explicit_post_final_request`, and the supplied reason/scope without claiming a verified personal identity.

If host policy requires an approval prompt or another non-delegable action, only that host action belongs to the user. After approval the Agent invokes apply and continues.

### 5. One prepared workspace makes profile/event mutation explicit

Workspace root is `_diagnostics/post-final-recovery/<operation-id>/`. Before `prepared` publication it contains staged request, before/after `rb_profile.yaml`, exact trace event bytes and a manifest candidate. Durable `prepared` publication is the accepted boundary.

An incomplete real directory without the canonical prepared manifest is unaccepted residue. Inspect may report it as a warning, fresh apply uses a new operation id, and recover never guesses or promotes it. Unsafe/symlink entries block the C5 root. This preserves the retained-input posture without adding a sweep mode or treating pre-acceptance bytes as authority.

The manifest records schema/action/UUID operation id, deterministic event id, request digest, logical bundle identity, Final lineage, expected-old/staged-new profile hashes, terminal status hash, final inventory digest, resolved target/window, rerun-rule facts, original trace prefix byte-length/SHA256/line-count, exact staged event-line SHA256, commit order and originally proven eligibility facts. It owns only `rb_profile.yaml` and one append-only trace event; it cannot widen its file set during recover.

Commit order is:

1. replace profile with normalized current HITL2 `status: recorded`, `user_decision: rerun`, and a deterministic existing-field `rationale` serialization of reason+requested scope, while preserving `rerun_count` and unrelated profile fields; keep the operation timestamp in the event rather than inventing a HITL2 `recorded_at` field absent from the current schema;
2. revalidate that terminal Final status bytes still equal the manifest's expected status hash;
3. run the shared evaluator in internal manifest-bound `prepared_pre_entry` stage against committed profile, unchanged terminal status and exactly this accepted workspace;
4. append the exact `post_final_reentry` event last through a narrow durable/idempotent primitive added to the existing trace writer owner;
5. fsync and remove the workspace.

The manifest records original trace prefix byte length, SHA256 and parsed line count, not the whole trace or a fixed final event index. The trace primitive opens the existing trace append surface, requires the recorded prefix bytes to hash identically, parses any appended suffix, and reuses the shared evaluator to confirm no relevant Final/control/handoff authority changed. Authority-neutral appended diagnostics are tolerated; malformed, rewritten or authority-changing suffixes block. It then writes pre-staged exact event bytes at the current tail, returns the actual parsed index, fsyncs the file and parent, and recognizes an identical existing operation/event line hash as already committed. It does not create a second general trace API.

The event is appended last because it is the new handoff authority. A partial profile write cannot authorize phase entry without the matching event. Status remains the terminal Final window until the Agent consumes the event through `enter-phase` and then runs existing `advance-status --to hitl2_recorded`. A crash after event append is idempotent cleanup.

No rollback tree is added. `recover` completes exact expected-old/staged-new bytes/event or returns one direct conflict without overwrite. This follows the project recovery posture: finish one accepted attempt or block.

The request's reason and requested scope remain separate in the event audit. The current profile uses only its existing HITL2 fields; C5 does not add a scope field or another request ledger. An identical request/event replay is `unchanged` and returns the current stage action. Different semantics cannot stack on the same Final lineage; they wait for the accepted rerun to produce a newer legal Final delivery.

### 6. `post_final_reentry` is an explicit exceptional handoff, not a gate attempt

The append-only event contains at least:

- `event: "post_final_reentry"`, top-level accepted `bundle`, UUID operation id, deterministic `event_id: post_final_reentry:<operation_id>`, schema/action and timestamp; the manifest separately hashes exact staged JSONL bytes so the event has no self-referential digest field or second random identity;
- request digest plus normalized reason/scope;
- previous Final gate/load indexes, status/profile hashes, committed after-profile hash and final inventory digest;
- `decision_checkpoint: "hitl2"`, `decision: "rerun"`;
- recorded resolved target node/status window, active rerun-limit rule id/definition digest and inspected current/next/limit counts;
- execution actor surface and no verified-human-identity claim.

The event also records its routing basis: HITL2 decision outcome `rerun`, transition-table digest and resolved target/status window. The digest records the acceptance-time routing authority; it is not a perpetual whole-file equality lock. Commit/recover and pre-rerun consumers re-resolve the relevant HITL2 `rerun` branch plus target status-window tuple and require semantic equality with the event. Unrelated transition/manifest edits that preserve that tuple do not strand the operation; a changed target/window or unresolvable route blocks. The rerun-limit rule remains stricter because count legality depends on it: until the bound increment occurs, active rule id/digest/current/next/limit must remain the recorded facts. `handoff-helpers.mjs` gains one pure structural parser for immutable event shape, deterministic identities, Final lineage and route resolution; it computes the exact raw event-line SHA256 as a returned fact. Closed stage predicates for `pre_entry`, `loaded_pending_status`, `synchronized_initial_profile` and `synchronized_count_incremented` compare load/transition hashes to that fact. This avoids the contradiction of applying terminal pre-entry status checks after legal entry or count increment. Any accepted C5 workspace, including event-committed cleanup-only state, blocks external entry until exact recover removes it. Existing gate-attempt parsing remains unchanged. The existing handoff selector is widened to order both structurally valid classes by trace index; there is no second C5 selector. `validateEnterPhaseTarget`, status audit, reentry and topic-state consume the same parsed fact object and never reinterpret arbitrary trace text as routing.

The four predicates have one closed truth table:

- `pre_entry`: no accepted C5 workspace remains; event and exact after-profile are current; terminal Final node/window remain current. No load is required. A matching load left by a failed `current_node` write does not promote the stage and the one action remains idempotent `enter-phase` retry.
- `loaded_pending_status`: a route-bound event load exists and `current_node` is rerun; either the terminal gate window remains, or the derived rerun window is already written but the exact bound `phase_transition` is absent. The one action is idempotent `advance-status --to hitl2_recorded`; any conflicting transition blocks instead.
- `synchronized_initial_profile`: event, exact after-profile, load, current rerun node, derived rerun window and exact bound `phase_transition` all match.
- `synchronized_count_incremented`: the synchronized initial facts remain attributable to the same event and the only profile delta is the event-bound `current_count → next_count` under the same active rule digest.

After a valid rerun-ready gate/handoff consumes `synchronized_count_incremented`, replay projection follows the existing normal gate/load/transition lineage to the current lifecycle owner. This is not a fifth C5 routing predicate and adds no recovery selector; it is the normal descendant chain proving that the accepted recovery was consumed. Malformed, ambiguous or discontinuous descendants block rather than falling back to fresh Final eligibility.

`enter-phase phase-rerun` writes the normal route-bound `load_complete` with additive event kind/id/index/exact-line-hash/operation binding and changes only `current_node` to rerun. If current-node write fails after the load, diagnostics keep `enter-phase` as the owner and retry it; the load alone does not expose status sync. The Agent then invokes existing `advance-status --to hitl2_recorded`; that command accepts the exceptional event+load as the semantic HITL2 rerun handoff, derives `next_gate: rerun_ready` from the existing transition/manifest truth, writes the normal `phase_transition` with exact event/load binding, and preserves the loaded current node. If status write survives but transition append does not, repeating the same command appends the missing exact transition idempotently. Initial topic-state/reentry authorization begins only after this status sync and validates event+exact after-profile+load+bound phase_transition+current rerun window. After initial topic preparation, the existing rerun owner may apply only the event-bound current→next count increment; no other profile drift is accepted. Topic-state accepts either this witness or the existing normal HITL2 gate→rerun witness. Other post-final requests remain rejected.

### 7. History and repeat calls are lineage-bound

Apply includes the prior HITL2 profile semantic fields and Final inventory hashes in the event before replacing the current profile projection. Existing gate attempts, load events, final artifacts, evidence, ledger, receipts and paths are not edited by C5.

An identical request for an already committed operation returns verdict `unchanged` with reason code `already_committed` and the next `enter-phase`, `advance-status`, reentry/topic-state, rerun-ready gate, or current descendant lifecycle-owner action for the proven stage. `inspect` over that same active lineage also returns `unchanged` without pretending it received or authenticated request input. A request bound to an older Final lineage is stale and blocked. A second post-final rerun becomes eligible only after the rerun pipeline legally delivers a newer Final lineage; it creates a new operation id and lineage edge.

### 8. Reentry diagnostics stay read-only and owner-directed

`check-reentry` consumes the post-final recovery inspect result. Immediately after legal rerun entry the correct existing checkpoint target is `hitl2_recorded`, because rerun is still in its incoming source-gate window; `phase-rerun` / `rerun_ready` would mean the rerun phase itself has already passed.

- eligible terminal Final + no request: root status `reachable`, next action exact recovery inspect/apply preparation;
- prepared workspace: exact `recover` only;
- committed handoff not yet loaded: exact `enter-phase phase-rerun`;
- route-bound load with unsynchronized terminal gate window: exact `advance-status --to hitl2_recorded`;
- synchronized initial rerun profile/window: existing C3 inspect/apply/recover checkpoint, including its unchanged result before phase-rerun continues;
- event-bound rerun count already incremented: existing rerun-ready gate;
- proven later normal descendant handoff: current existing lifecycle-owner action;
- ambiguous/stale/nonterminal shape: `missing_contract` or one direct repair owner, never impossible predecessor-gate advice.

It does not execute recovery, persist intent or create a global repair strategy.

The existing phase-status audit SHALL also consume the workspace/event stages. Any accepted workspace, including event-committed cleanup-only state, short-circuits to exact recover. After cleanup, event-only or load-written/current-node-still-Final state is `post_final_reentry_pending_load` with exact enter retry. Completed rerun current-node plus terminal gate window is `post_final_reentry_pending_status_sync`; the same outcome applies when the derived status window exists but the exact event/load-bound transition is absent and no conflicting transition exists. Exact bound transition plus current rerun window passes; conflicting bindings remain drift. It SHALL not require a synthetic gate attempt or misclassify accepted recovery stages as manual bypass.

### 9. Helper responsibility and simplicity admission

The only user decision is whether to reopen the delivered run and what scope/risk change is intended. The only potentially non-delegable action is a host approval required by host policy. After that, the Agent owns request file preparation, inspect/apply/recover, phase entry, audit, C3 mutation and the normal rerun pipeline.

Complexity burden:

| Question | Answer |
|---|---|
| Failure not covered by current direct check | A terminal Final has no legal handoff to rerun; existing checks can only report `missing_contract`. |
| Source of Record | Existing Final gate/load/status/final inventory, one prepared workspace, one Engine-written lineage event. |
| Why existing checkpoint is insufficient | Normal handoff requires a source gate pass, but no post-Final gate exists and adding one would create a Final loop. |
| Old complexity removed/avoided | Removes impossible predecessor advice and need for hand-written status/trace/addendum; avoids generic override, second Final loop and second topic authority. |
| One failure action | Recover exact operation, resolve the named owner conflict, or retain/fix the request and rerun the same apply. |
| Control-path proof | Focused crash-point, rerun-limit, entry-stage and C2/C3 owner regressions plus an incident-shaped disposable Final→rerun→canonical topic case. |

### 10. Apply target manifest

Apply SHALL keep this control-surface budget explicit:

| Surface | Apply disposition |
|---|---|
| Post-final capability | **Add** one narrow `post-final-recovery` spec/module with `inspect|apply|recover` and closed action `post_final_rerun` |
| Durable recovery state | **Add** one operation-scoped prepared workspace owning profile/one event only |
| Bundle identity | **Extract/reuse** the setup gate's existing basename normalizer as one pure helper; combine it with status bundle and matching plan/profile basename, with no UUID or identity registry |
| Routing/handoff | **Reuse** existing HITL2 `rerun` transition lookup and status derivation; **modify** the handoff helper only to consume one explicit exceptional event class |
| Trace append | **Modify** the existing trace writer owner with one exact durable/idempotent append primitive; no parallel writer |
| Topic mutation | **Modify** only the existing authorization adapter; retain the same C3 helper/CLI/workspace/actions |
| Status synchronization | **Reuse/modify** existing `advance-status` owner to consume event+load and derive the normal rerun window |
| Reentry/status diagnostics | **Modify** existing root and phase-status projections to consume the new workspace/event/load/status-sync stages |
| Final interaction | **Delete/replace** impossible predecessor-gate advice and any documented implication that the user must repeat the decision or hand-edit authority |
| Parallel success paths | **Reject** `_cache/addendum/`, `final/addendum/`, hand-written status/trace and direct post-final topic edits as success authority |
| Generic override/state-seed | **Do not add**; remains a separately justified future capability |
| Authentication subsystem | **Do not add** token store, signer, daemon or caller-identity claim; host permission remains external |
| Lifecycle/model state | **Do not add** a mode, gate, phase, queue schema, progress ledger, second Final loop or second topic owner |

If apply requires a caller-supplied target node/gate/status patch, a C5-local action→node table, a Final outgoing chain edge, a second workspace, a long-lived authorization token, a new lifecycle state or C5-owned topic mutation, the implementation has exceeded the approved design and SHALL return to explore rather than silently expanding scope.

## Risks / Trade-offs

- **[Same-principal caller identity is not cryptographically proven]** → State the threat model explicitly; never call request metadata a permission token or verified identity; keep action closed and rely on host sandbox/approval for permission. Generic human override remains out of scope.
- **[Profile current decision changes from proceed to rerun]** → Preserve prior HITL2 semantic fields and exact profile hash in the append-only recovery event; C5 never edits old trace/gate/final evidence.
- **[Crash between profile replacement and trace append]** → Prepared workspace remains the only recovery owner; without the event no handoff is legal; exact recover completes or blocks.
- **[Existing rerun limit is already exhausted]** → Read the active gate rule and account for the pending increment before acceptance; block C5 early and escalate only the new-bundle decision instead of opening an unpassable rerun.
- **[Pending C2 persistence makes Final inventory unstable]** → Return the existing quiescent sweep action before lineage hashing; C5 never adopts or cleans C2 state.
- **[Entry and status sync are two steps]** → Diagnostics expose exactly one action per stage: enter-phase after event, then existing advance-status after load; topic mutation remains blocked until both are complete.
- **[Trace event exists but workspace cleanup crashes]** → Deterministic event id, exact event-line SHA256 and target profile bytes make recover idempotently return cleaned.
- **[Canonical topic drift exists in the historical incident]** → Carry one C3 repair root into the newly sanctioned rerun; C5 does not adopt or mutate topics itself.
- **[Exceptional handoff could become a second generic routing system]** → Closed action maps only to existing HITL2 outcome `rerun`; target/window are resolved by existing transition/manifest helpers; no caller-supplied or C5-local node/gate/status mapping.
- **[C5 could duplicate transition truth]** → Map the closed request to existing HITL2 outcome `rerun`, resolve through `transitions.chain.json`/manifest, and reject any local/hardcoded target or Final outgoing edge.
- **[New Final delivery may later replace final filenames]** → C5 preserves old files until the existing legal Final writer acts and records the prior inventory digest; versioned historical final storage is a separate concern.

## Migration Plan

1. Add delta contracts and requirement implementation mappings without changing existing bundles.
2. Implement pure eligibility/request/event schemas and focused unit tests.
3. Implement workspace apply/recover and crash-point integration tests.
4. Extend handoff consumption, topic-state authorization and reentry projection using the same evaluator results.
5. Update Agent-facing Final/rerun/command guidance so the user supplies only the semantic/risk decision and the Agent resumes execution.
6. Run incident-shaped controlled case from legal Final through post-final recovery, C3 canonical mutation and normal rerun handoff; verify no addendum namespace or authority rewrite.
7. Bump framework to `v0.27`, run full regression/governance/spec validation, then archive.

There is no rollback branch. Before a `post_final_reentry` event, exact workspace recovery rolls the accepted operation forward or blocks on drift. After an event is committed, do not delete history; repair forward through the same operation/reentry contracts or create a newer legal lineage.

## Open Questions

None for this change. Cryptographically authenticated human identity, generic maintenance/debug state-seed, and versioned preservation of superseded Final file bytes are intentionally deferred rather than left as apply-time choices.
