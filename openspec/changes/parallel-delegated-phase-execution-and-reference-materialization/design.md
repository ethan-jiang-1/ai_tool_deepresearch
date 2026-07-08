## Context

Change 1 已经把 `operate-work-unit submit` 和 lifecycle handoff 的确定性边界稳住：predictable result/receipt/cache drift 可以被窄范围 canonicalize，错误 identity/path/cache/handoff 仍然 fail closed。第二个 change 不再扩大 Engine 容错，而是修 Phase Agent 如何使用这些稳定 primitive。

FOSE run 里的四个 bug 暴露了同一条运行链上的两个缺口：

1. **execution loop 没跑满**：Wave0/Wave1 的 work units 是独立的，但 Phase Agent 初始仍按 `--count 1` 串行 claim；Sub-agent spawn 后又被动等 notification/user "continue"，没有主动从 runtime bundle 检查 result/receipt 是否 ready。
2. **consumer reference 没落地**：Sub-agents 已经做了搜索/fetch/extraction，但 topic references 和 Wave2 cross references 没有稳定物化。旧 specs/guidance 又把 reference 文件同时当成 delegated output、gate coverage、consumer navigation、anti-cheating surface，导致责任边界混乱。

本项目的稳定边界仍然不变：

- Phase Agent drives Markdown control flow and owns synthesis/reference presentation.
- Sub-agent owns bounded high-I/O search/fetch/extraction.
- Engine owns claim/submit/ledger/gate/provenance authority.
- Runtime truth lives under the active bundle root.

## Requirement Ownership Map

The change intentionally touches several specs, but each spec has one primary job:

| Requirement | Primary question it answers | Must not own |
| --- | --- | --- |
| AGQ-022 | How many independent delegated work units should the Phase Agent claim now? | Work-unit ID allocation or submit authority |
| SWE-006 | What does a silent delegated loop do after background spawn? | A new blocking wait daemon or notification authority |
| RWP-015 | How do phase bodies teach the end-to-end batch-poll-submit-materialize-gate loop? | Low-level provenance classification rules |
| SNC-005 | What must Sub-agent roles return? | Canonical consumer reference presentation |
| WAI-008 | When and how are Wave1 topic references materialized? | Wave2 cross-reference policy |
| WTS-010 | When and how are Wave2 `00-cross` references materialized? | Wave1 topic-reference count or format checks |
| REF-006 / REF-008 | What format and backing semantics do reference files carry? | Gate pass/fail routing |
| WPG-003 / WPG-005 / WPG-012 | What counts as delegated output coverage vs projection backing? | Reference prose quality judgment |
| RWG-017 | How do Wave gates apply the split and report diagnostics? | Search/fetch/synthesis authority |

## Goals / Non-Goals

**Goals:**

- 让 Wave0/Wave1 phase guidance 对独立 work units 使用 bounded batched claim，而不是默认 serial `--count 1`。
- 让 stop:no delegated loops 在 background Sub-agent spawn 后主动 polling work-unit result/receipt/output readiness，ready 即 submit/repair/terminalize。
- 把 Wave1 topic reference materialization 移到 Phase Agent successful-submit 后执行，源数据来自 submitted `source_claims[]`、accepted source URL surfaces、cache/degraded-capture trails、ledger rows、evidence summaries。
- 让 Wave2 pure synthesis path 在 concrete existing backing 存在时物化 `reference/00-cross-*.md`，同时保持 new external evidence 必须走 `wave2_targeted_evidence`。
- 修改 gate/provenance/anti-cheating 语义，区分 fetched-source delegated evidence 与 Phase-owned consumer reference projection。
- 提供 focused Markdown/static/gate tests，防止未来 guidance 回到 serial claim、passive wait、或 filesystem-only reference authority。

**Non-Goals:**

- 不修改 `operate-work-unit claim` 的 CLI 默认 `--count 1`；Phase Agent 必须显式传入计算后的 claim count。
- 不新增 `operate-work-unit wait` 作为必需能力。本 change 先把 active polling 作为 Markdown/Agent loop contract；如果后续发现 CLI helper 必要，另走 change。
- 不让 Engine 做 search、fetch、reference prose writing、cross-topic synthesis judgment。
- 不允许 Phase Agent direct-search 新 Wave1/Wave2 evidence 来绕过 Sub-agent/work-unit path。
- 不允许脚本或模板批量生成 reference 文件冒充 evidence；Phase-owned references 必须由 Agent 从 submitted backing 手工物化并可追溯。
- 不新增依赖，不使用 Python，不把 tests 放进 `DPT_FRAMEWORK/`。

## Decisions

### Decision 1: Batching is an Agent strategy, not a new scheduler

`operate-work-unit claim --count N` 和 `delegated_in_flight` 多 entry 已经存在。BUG-046 的缺口是 Phase Agent strategy，不是 Engine allocation 能力缺失。

本 change 要求 Wave0/Wave1 phase docs 显式计算 bounded claim count 并调用：

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase waveN --count <claim-count>
```

cap 来源顺序：

1. explicit runtime/profile parallelism setting if accepted by existing profile surface;
2. current independent eligible delegated demand count from queue/claim diagnostics;
3. conservative documented cap, default no higher than 5 when no explicit value exists.

The effective claim count is a top-up, not a firehose: it is no greater than independent eligible demand, the accepted/default cap, and the remaining free delegated in-flight capacity for that wave. After submissions or terminalization free capacity, the Phase Agent can claim another bounded batch. It does not repeatedly claim new work while the current in-flight count is already at cap.

`--count 1` 仍可用于 single remaining item、repair task、dependency-blocked front item、or constrained profile cap = 1，但不能作为独立 topic drain 的 normal strategy。

Alternative considered: change CLI default from `1` to active-window count. Rejected because CLI defaults are broad runtime behavior; explicit phase guidance is safer, easier to review, and keeps existing scripts/tests predictable.

### Decision 2: Active polling stays in the Phase Agent loop

After spawn, Phase Agent may keep a small scratch list of claimed `work_id`, `task_ref`, `runtime_receipt_ref`, candidate result path, and deadline. That scratch list is convenience only. The authoritative in-flight set must be reconstructable from runtime bundle truth such as queue delegated-in-flight state, work-unit directories, work-unit indexes/manifests, and `operate-work-unit inspect` output. The loop therefore survives chat truncation, task notification loss, or a Phase Agent reentry into the same node.

The Phase Agent then loops:

1. inspect work-unit directories or run `operate-work-unit inspect <bundle>`;
2. if result/receipt/declared outputs are ready, submit immediately;
3. if submit rejects, repair same attempt when possible;
4. if expired/unrecoverable, call `fail`, `timeout`, or `abandon`;
5. claim more only when reconstructed in-flight count is below cap and independent demand remains;
6. run gate only after unclaimed delegated count is zero and in-flight count is zero.

This remains Markdown-driven Agent Flow. JS/CLI supplies deterministic feedback; it does not become a daemon, watcher, workflow walker, or notification system.

Alternative considered: implement a blocking `operate-work-unit wait`. Deferred because BUG-062 can be fixed by explicit Agent polling guidance and tests; a wait helper would be a separate API surface.

### Decision 3: Wave1 references are Phase-owned consumer projections

Wave1 Sub-agent output should be bounded around noisy I/O:

- `evidence-summary.md`
- `question-list.md`
- structured `source_claims[]`
- `accepted_source_urls[]`
- cache trails
- lifecycle receipt and result JSON

The Phase Agent, after successful submit, materializes `reference/{topic_slug}-<source-slug>.md` from submitted backing. This avoids repeating BUG-060 by adding another formatting-heavy required receipt to Sub-agent tasks.

Reference materialization is not new delegated authority. It is a consumer-facing projection that must cite submitted evidence/cache/work-unit surfaces using body refs or links that gates/inspectors can scan. If the Phase Agent wants to include a source URL absent from submitted source claims, verified cache trails, accepted source URL surfaces, or explicit degraded-capture backing, it must enqueue supplementary `wave1_topic_deepening` rather than invent the reference.

Alternative considered: add `reference/{topic}-*.md` to required Sub-agent receipts. Rejected because it pushes exact rich Markdown formatting into the noisiest actor and creates more submit/gate friction without improving provenance authority.

### Decision 4: Wave2 `00-cross` files need explicit backing semantics

There are two legal Wave2 reference paths:

- **existing-backed cross reference**: Phase Agent writes `reference/00-cross-*.md` from concrete submitted Wave0/Wave1 backing plus Wave2 ledger/index/synthesis refs. Any intermediate reference, evidence summary, question list, or synthesis artifact is only a locator unless it resolves to submitted source/cache/degraded-capture/work-unit backing. It does not require a new Wave2 work-unit row because no new external evidence was fetched.
- **new fetched-source cross reference**: Phase Agent or Sub-agent promotes a new source found through `wave2_targeted_evidence`. It requires submitted Wave2 work-unit coverage and cache trails.

The gate/provenance layer must distinguish these instead of treating every `00-cross` file as delegated targeted evidence. The distinction is represented through existing reference metadata plus deterministic refs to `finding-index.yaml`, `cross-topic-ledger.md`, submitted source claims, accepted source URL surfaces, degraded-capture records, cache trails, output declarations, and work-unit rows, not through chat memory.

For an accepted consumer-facing `W2F-xxx` finding that appears in synthesis, seed-topic backfill, or final-report evidence maps and has concrete prior submitted backing, the Phase Agent materializes a `00-cross` reference unless it records why the finding is process-only, deferred, not source-backed enough, or intentionally not consumer-facing. This keeps pure synthesis from becoming invisible while avoiding reference spam for internal notes.

Because the flat reference format currently has a single required `source_url`, an existing-backed `00-cross` reference uses a primary already accepted backing source URL in that metadata field. Additional source/backing refs appear in the reference body as bundle-relative refs or Markdown links to Wave0/Wave1 evidence, cache trails, work-unit rows, `finding-index.yaml`, and `cross-topic-ledger.md`. If no primary accepted source URL exists, the Phase Agent repairs backing records, splits the finding into source-backed references, or records a limitation instead of inventing a synthetic URL.

Alternative considered: keep `00-cross` only for targeted evidence and never write it during pure synthesis. Rejected because BUG-065 is precisely the consumer-path gap for pure synthesis findings with concrete existing backing.

### Decision 5: Gate checks validate backing, not prose insight

Wave gates should continue to be deterministic:

- They check that references exist when required, follow metadata/section format, have parseable URLs, appear in `_INDEX.md`, and bind their source URLs/backing refs to submitted source claims, accepted source URL surfaces, verified cache trails, explicit degraded-capture records, work-unit rows, or explicit Wave2 targeted evidence rows.
- They must not judge whether the reference prose is insightful.
- They must not count filesystem-only files as delegated evidence.
- They must not flag legitimate Phase-owned references as delegated bypass when they are backed by existing submitted evidence.

This requires provenance helpers and gate definition selectors to separate two checks: output coverage targets delegated outputs, while Phase-owned projection checks verify backing refs, metadata, index rows, and classification diagnostics.

### Decision 6: Anti-cheating rules become more precise

The old blanket "Phase Agent MUST NOT generate `reference/*.md`" rule prevented fake delegated evidence, but now blocks the desired Phase-owned projection path. It should be rewritten to prohibit:

- script/template batch generation;
- filesystem-only references that claim delegated evidence;
- references using unsubmitted source URLs/cache trails;
- pure synthesis references that pretend to be newly fetched source evidence.

It allows Phase Agent to materialize references manually from submitted source claims, accepted source URL surfaces, verified cache trails, explicit degraded-capture records, ledger rows, and Wave2 ledger/index backing.

### Decision 7: Reference classification uses existing bundle surfaces and fails closed

This change will not introduce a new required reference metadata key such as `materialization_role`, nor a required new `_INDEX.md` column. The existing reference metadata block and `_INDEX.md source_layer` remain consumer/navigation surfaces; they are useful hints but not authority by themselves.

Gate/provenance classification should be derived from existing deterministic bundle surfaces:

1. reference path and existing metadata fields, especially `source_url`, `evidence_role`, `acceptance_status`, and `related_topic`;
2. `_INDEX.md` row presence and `source_layer`;
3. submitted source claims, accepted source URLs, degraded-capture records, cache trails, output declarations, and work-unit ledger rows;
4. Wave2 `W2F-xxx` refs in `finding-index.yaml` and `cross-topic-ledger.md`;
5. concrete bundle-relative refs or Markdown links in the reference body to prior Wave0/Wave1 backing when the reference claims existing-backed synthesis.

Classification is two-step:

- **Bind the source/backing**: every reference source URL or `W2F-xxx` claim must bind to submitted/prior accepted bundle evidence.
- **Classify the authority path**: backed Wave1 topic references and existing-backed Wave2 `00-cross` files are Phase-owned projections; references that claim newly fetched public evidence require submitted delegated work-unit coverage.

Ambiguity is not success. If a reference cannot be deterministically classified from bundle files, gates and inspectors must fail closed or report repair-targeted backing drift. Chat memory, console summaries, and file presence alone are never classification authority.

Optional parser-compatible metadata may be added later if it proves useful, but this change should first use the smallest existing-surface convention that can be checked deterministically.

## Risks / Trade-offs

- **Risk: batch claim increases simultaneous Sub-agent load** -> Mitigation: bounded cap, profile/runtime override, conservative default cap no higher than 5, and explicit terminalization for expired attempts.
- **Risk: polling loop becomes noisy or infinite** -> Mitigation: bounded interval, deadline awareness, `inspect`/submit feedback, terminal commands, and tests that forbid waiting on user/task notification as continuation.
- **Risk: Phase-owned references become unsourced summaries** -> Mitigation: require concrete submitted backing refs, index updates, source/cache/degraded-capture mapping, and gate diagnostics for unbacked source URLs.
- **Risk: Gate changes accidentally weaken delegated provenance** -> Mitigation: keep fetched-source delegated evidence ledger-first; only Phase-owned projections from already submitted backing avoid new Wave2 ledger requirement.
- **Risk: reference classification becomes another schema migration** -> Mitigation: do not add required metadata keys or `_INDEX.md` columns in this change; derive classification from existing metadata, index rows, ledgers, cache trails, and Wave2 finding refs.
- **Risk: Existing tests expect Sub-agent reference output** -> Mitigation: update tests to check Sub-agent submitted source/cache/degraded-capture backing and Phase Agent post-submit materialization separately.
- **Risk: More spec surfaces are touched than code diff seems to need** -> Mitigation: this is intentional because current specs conflict across reference format, provenance gate, phase content, and anti-cheating guidance.

## Migration Plan

1. Add/adjust Markdown/static tests for Wave0/Wave1 batched claim guidance and active polling language.
2. Update shared Sub-agent protocol and silent execution guidance before changing phase nodes so phase text has a common loop contract to point at.
3. Update Wave1 phase and `dpt-evidence-extractor` role guidance to move topic reference materialization to Phase Agent after submit.
4. Update Wave2 phase and `dpt-topic-scout` role guidance to distinguish existing-backed `00-cross` projections from new targeted evidence.
5. Update anti-cheating/reference template/shared schema wording.
6. Update gate definitions/provenance helpers/inspectors/file observability that classify references so Phase-owned projections do not trigger delegated bypass while unbacked fetched evidence still fails.
7. Add focused gate/provenance tests for Wave1 Phase-owned topic refs and Wave2 pure-synthesis `00-cross` refs.
8. Update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to `v0.10`.
9. Run targeted `node:test` suites and OpenSpec governance checks.

Rollback strategy: batching/polling guidance can be reverted independently of reference provenance if load proves too high. Reference materialization should not be partially reverted without also restoring old WPG/RWG semantics, because mixed wording would reintroduce responsibility gaps.

## Settled Questions

- Phase-owned references do not require a new `materialization_role` metadata key in this change.
- `_INDEX.md` does not require a new authority-classification column in this change; `source_layer` remains a navigation label and one input to deterministic classification.
- A blocking `operate-work-unit wait` helper remains out of scope. Active polling is an Agent loop contract for this change.
- A prior reference, evidence summary, question list, or synthesis artifact can help locate Wave2 backing only when the chain resolves to submitted source/cache/degraded-capture/work-unit evidence.
