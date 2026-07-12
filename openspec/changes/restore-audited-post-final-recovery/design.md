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

### 3. Eligibility uses one pure evaluator and short-circuits

`inspect` and `apply` SHALL call the same pure evaluator. It checks in order:

1. no accepted post-final recovery workspace; if one exists, return only exact `recover`;
2. no accepted artifact-persistence or topic-state workspace that already owns the nearest recovery; return existing quiescent `sweep` or exact topic-state `recover`;
3. latest legal delivery is readiness→Final with route-bound Final load, `current_node: phases/phase-final.md`, `current_gate: readiness_passed`, `next_gate: none`, and required Final delivery evidence;
4. no later legal handoff/reentry event supersedes that Final lineage;
5. queue/work-unit/control surfaces are quiescent enough to establish a new rerun attempt;
6. current `rerun_count` plus the phase-rerun increment will still satisfy the active gate-definition `rerun_count_limit` rule;
7. request expected lineage/status/profile hashes equal inspect facts.

Canonical topic drift that C3 can repair after sanctioned rerun is reported as carried repair context, not as a reason to force an out-of-gate repair. Ambiguous control lineage, active persistence/mutation workspace, non-quiescent work or an exhausted next rerun blocks before workspace creation. The limit is read from the existing gate definition rather than duplicated as a C5 constant. Dependent symptoms are masked behind the earliest direct blocker.

The evaluator returns one of `eligible|unchanged|recover_required|blocked` and at most one structured next action for inspect. The CLI uses one Zod-validated result envelope with operation-specific verdicts: inspect `eligible|unchanged|recover_required|blocked`, apply `committed|unchanged|recover_required|blocked`, and recover `committed|cleaned|blocked`. `committed` is only profile/event durability, never rerun completion. `apply` does not duplicate evaluator checks.

### 4. Request input carries semantics and optimistic concurrency, not permission

The retained JSON request is Zod-validated and contains only:

```json
{
  "schema_version": "1.0.0",
  "action": "post_final_rerun",
  "reason": "non-empty human decision summary",
  "requested_scope": "non-empty semantic adjustment summary",
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

The expected lineage fields come from `inspect`; the Agent prepares/retains the file after the user decision. They prevent stale replay and wrong-bundle application. The profile digest also binds the inspected rerun count; apply re-reads the active gate rule before acceptance. They do not authenticate speaker identity or expand host permission. The audit records execution actor surface as `phase_agent`, decision source as `explicit_post_final_request`, and the supplied reason/scope without claiming a verified personal identity.

If host policy requires an approval prompt or another non-delegable action, only that host action belongs to the user. After approval the Agent invokes apply and continues.

### 5. One prepared workspace makes profile/event mutation explicit

Workspace root is `_diagnostics/post-final-recovery/<operation-id>/`. Before `prepared` publication it contains staged request, before/after `rb_profile.yaml`, exact trace event bytes and a manifest candidate. Durable `prepared` publication is the accepted boundary.

The manifest records schema/action/operation id, request digest, final lineage, expected-old/staged-new profile hashes, terminal status hash, exact target path, trace prefix/index, event id/digest, commit order and originally proven eligibility facts. It owns only `rb_profile.yaml` and one append-only trace event; it cannot widen its file set during recover.

Commit order is:

1. replace profile with normalized current HITL2 `status: recorded`, `user_decision: rerun`, operation `recorded_at`, and a deterministic existing-field `rationale` serialization of reason+requested scope, while preserving `rerun_count` and unrelated profile fields;
2. revalidate that terminal Final status bytes still equal the manifest's expected status hash;
3. run the shared evaluator in `prepared_pre_entry` stage against committed profile, unchanged terminal status and the prepared manifest;
4. append the exact `post_final_reentry` event last through a narrow durable/idempotent primitive added to the existing trace writer owner;
5. fsync and remove the workspace.

The manifest records the expected trace prefix digest/event index. The trace primitive opens the existing trace append surface, rechecks that prefix, writes pre-staged exact event bytes, fsyncs the file and parent, and recognizes an identical existing operation/event as already committed. It does not create a second general trace API.

The event is appended last because it is the new handoff authority. A partial profile write cannot authorize phase entry without the matching event. Status remains the terminal Final window until the Agent consumes the event through `enter-phase` and then runs existing `advance-status --to hitl2_recorded`. A crash after event append is idempotent cleanup.

No rollback tree is added. `recover` completes exact expected-old/staged-new bytes/event or returns one direct conflict without overwrite. This follows the project recovery posture: finish one accepted attempt or block.

The request's reason and requested scope remain separate in the event audit. The current profile uses only its existing HITL2 fields; C5 does not add a scope field or another request ledger. An identical request/event replay is `unchanged` and returns the current stage action. Different semantics cannot stack on the same Final lineage; they wait for the accepted rerun to produce a newer legal Final delivery.

### 6. `post_final_reentry` is an explicit exceptional handoff, not a gate attempt

The append-only event contains at least:

- `event: "post_final_reentry"`, schema/action/operation id and timestamp;
- request digest plus normalized reason/scope;
- previous Final gate/load indexes, status/profile hashes, committed after-profile hash and final inventory digest;
- `decision_checkpoint: "hitl2"`, `decision: "rerun"`;
- recorded resolved target node/status window, active rerun-limit rule id/definition digest and inspected current/next/limit counts;
- execution actor surface and no verified-human-identity claim.

The event also records its routing basis: HITL2 decision outcome `rerun`, transition-table digest and resolved target/status window. `handoff-helpers.mjs` gains one pure parser for this event class. Before entry it re-resolves that outcome through the existing transition table/manifest helpers and validates prior Final lineage, event self-contained operation/request digests, exact committed pre-entry status/profile shape, non-supersession and resolved target; if a workspace still exists, its manifest/event digest SHALL also match. Existing gate-attempt parsing remains unchanged. `validateEnterPhaseTarget` consumes the latest legal handoff across the two explicit classes; it never reinterpret arbitrary trace text as routing.

`enter-phase phase-rerun` writes the normal route-bound `load_complete` referencing the exceptional event identity and changes only `current_node` to rerun. The Agent then invokes existing `advance-status --to hitl2_recorded`; that command accepts the exceptional event+load as the semantic HITL2 rerun handoff, derives `next_gate: rerun_ready` from the existing transition/manifest truth, writes the normal `phase_transition`, and preserves the loaded current node. Initial topic-state/reentry authorization begins only after this status sync and validates event+exact after-profile+load+phase_transition+current rerun window. After initial topic preparation, the existing rerun owner may apply only the event-bound current→next count increment; no other profile drift is accepted. Topic-state accepts either this witness or the existing normal HITL2 gate→rerun witness. Other post-final requests remain rejected.

### 7. History and repeat calls are lineage-bound

Apply includes the prior HITL2 profile semantic fields and Final inventory hashes in the event before replacing the current profile projection. Existing gate attempts, load events, final artifacts, evidence, ledger, receipts and paths are not edited by C5.

An identical request for an already committed operation returns verdict `unchanged` with reason code `already_committed` and the next `enter-phase`, `advance-status`, reentry or topic-state action for the current stage. A request bound to an older Final lineage is stale and blocked. A second post-final rerun becomes eligible only after the rerun pipeline legally delivers a newer Final lineage; it creates a new operation id and lineage edge.

### 8. Reentry diagnostics stay read-only and owner-directed

`check-reentry` consumes the post-final recovery inspect result. Immediately after legal rerun entry the correct existing checkpoint target is `hitl2_recorded`, because rerun is still in its incoming source-gate window; `phase-rerun` / `rerun_ready` would mean the rerun phase itself has already passed.

- eligible terminal Final + no request: root status `reachable`, next action exact recovery inspect/apply preparation;
- prepared workspace: exact `recover` only;
- committed handoff not yet loaded: exact `enter-phase phase-rerun`;
- route-bound load with unsynchronized terminal gate window: exact `advance-status --to hitl2_recorded`;
- loaded rerun with canonical topic drift: existing C3 inspect/apply/recover action;
- ambiguous/stale/nonterminal shape: `missing_contract` or one direct repair owner, never impossible predecessor-gate advice.

It does not execute recovery, persist intent or create a global repair strategy.

The existing phase-status audit SHALL also consume the workspace/event stages. An accepted prepared workspace short-circuits partial profile symptoms to exact recover; after event commit but before load it classifies terminal status/current Final node as `post_final_reentry_pending_load`; after route-bound load but before status sync it classifies `current_node: rerun` plus terminal gate window as `post_final_reentry_pending_status_sync`; after existing `advance-status` writes the derived rerun window and `phase_transition`, it passes. It SHALL not require a synthetic gate attempt or misclassify accepted recovery stages as manual bypass.

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
- **[Trace event exists but workspace cleanup crashes]** → Event id/digest and target bytes make recover idempotently return committed/cleaned.
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
