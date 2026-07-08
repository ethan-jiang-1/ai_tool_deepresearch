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

## Goals / Non-Goals

**Goals:**

- 让 Wave0/Wave1 phase guidance 对独立 work units 使用 bounded batched claim，而不是默认 serial `--count 1`。
- 让 stop:no delegated loops 在 background Sub-agent spawn 后主动 polling work-unit result/receipt/output readiness，ready 即 submit/repair/terminalize。
- 把 Wave1 topic reference materialization 移到 Phase Agent successful-submit 后执行，源数据来自 submitted `source_claims[]`、cache trails、ledger rows、evidence summaries。
- 让 Wave2 pure synthesis path 在 concrete existing backing 存在时物化 `reference/00-cross-*.md`，同时保持 new external evidence 必须走 `wave2_targeted_evidence`。
- 修改 gate/provenance/anti-cheating 语义，区分 fetched-source delegated evidence 与 Phase-owned consumer reference projection。
- 提供 focused Markdown/static/gate tests，防止未来 guidance 回到 serial claim、passive wait、或 filesystem-only reference authority。

**Non-Goals:**

- 不修改 `operate-work-unit claim` 的 CLI 默认 `--count 1`；Phase Agent 必须显式传入计算后的 cap。
- 不新增 `operate-work-unit wait` 作为必需能力。本 change 先把 active polling 作为 Markdown/Agent loop contract；如果后续发现 CLI helper 必要，另走 change。
- 不让 Engine 做 search、fetch、reference prose writing、cross-topic synthesis judgment。
- 不允许 Phase Agent direct-search 新 Wave1/Wave2 evidence 来绕过 Sub-agent/work-unit path。
- 不允许脚本或模板批量生成 reference 文件冒充 evidence；Phase-owned references 必须由 Agent 从 submitted backing 手工物化并可追溯。
- 不新增依赖，不使用 Python，不把 tests 放进 `DPT_FRAMEWORK/`。

## Decisions

### Decision 1: Batching is an Agent strategy, not a new scheduler

`operate-work-unit claim --count N` 和 `delegated_in_flight` 多 entry 已经存在。BUG-046 的缺口是 Phase Agent strategy，不是 Engine allocation 能力缺失。

本 change 要求 Wave0/Wave1 phase docs 显式计算 bounded cap 并调用：

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase waveN --count <cap>
```

cap 来源顺序：

1. explicit runtime/profile parallelism setting if accepted by existing profile surface;
2. current independent eligible delegated demand count from queue/claim diagnostics;
3. conservative documented cap, default no higher than 5 when no explicit value exists.

`--count 1` 仍可用于 single remaining item、repair task、dependency-blocked front item、or constrained profile cap = 1，但不能作为独立 topic drain 的 normal strategy。

Alternative considered: change CLI default from `1` to active-window count. Rejected because CLI defaults are broad runtime behavior; explicit phase guidance is safer, easier to review, and keeps existing scripts/tests predictable.

### Decision 2: Active polling stays in the Phase Agent loop

After spawn, Phase Agent should keep a small in-memory/ref list of claimed `work_id`, `task_ref`, `runtime_receipt_ref`, candidate result path, and deadline. It then loops:

1. inspect work-unit directories or run `operate-work-unit inspect <bundle>`;
2. if result/receipt/declared outputs are ready, submit immediately;
3. if submit rejects, repair same attempt when possible;
4. if expired/unrecoverable, call `fail`, `timeout`, or `abandon`;
5. claim more only when cap has room and independent demand remains;
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

Reference materialization is not new delegated authority. It is a consumer-facing projection that must cite submitted evidence/cache/work-unit surfaces. If the Phase Agent wants to include a source URL absent from submitted source claims/cache trails, it must enqueue supplementary `wave1_topic_deepening` rather than invent the reference.

Alternative considered: add `reference/{topic}-*.md` to required Sub-agent receipts. Rejected because it pushes exact rich Markdown formatting into the noisiest actor and creates more submit/gate friction without improving provenance authority.

### Decision 4: Wave2 `00-cross` files need explicit backing semantics

There are two legal Wave2 reference paths:

- **existing-backed cross reference**: Phase Agent writes `reference/00-cross-*.md` from concrete submitted Wave0/Wave1 backing and Wave2 ledger/index/synthesis refs. It does not require a new Wave2 work-unit row because no new external evidence was fetched.
- **new fetched-source cross reference**: Phase Agent or Sub-agent promotes a new source found through `wave2_targeted_evidence`. It requires submitted Wave2 work-unit coverage and cache trails.

The gate/provenance layer must distinguish these instead of treating every `00-cross` file as delegated targeted evidence. The distinction should be represented through reference metadata and/or deterministic refs to `finding-index.yaml` / submitted source claims, not through chat memory.

Alternative considered: keep `00-cross` only for targeted evidence and never write it during pure synthesis. Rejected because BUG-065 is precisely the consumer-path gap for pure synthesis findings with concrete existing backing.

### Decision 5: Gate checks validate backing, not prose insight

Wave gates should continue to be deterministic:

- They may check that references exist, follow metadata/section format, have parseable URLs, appear in `_INDEX.md`, and bind their source URLs/backing refs to submitted source claims/cache trails or explicit Wave2 targeted evidence rows.
- They must not judge whether the reference prose is insightful.
- They must not count filesystem-only files as delegated evidence.
- They must not flag legitimate Phase-owned references as delegated bypass when they are backed by existing submitted evidence.

This likely requires small changes in provenance helpers and gate definition selectors: output coverage should target delegated outputs, while Phase-owned projection checks should verify backing refs and metadata.

### Decision 6: Anti-cheating rules become more precise

The old blanket "Phase Agent MUST NOT generate `reference/*.md`" rule prevented fake delegated evidence, but now blocks the desired Phase-owned projection path. It should be rewritten to prohibit:

- script/template batch generation;
- filesystem-only references that claim delegated evidence;
- references using unsubmitted source URLs/cache trails;
- pure synthesis references that pretend to be newly fetched source evidence.

It should allow Phase Agent to materialize references manually from submitted source claims/cache/ledger rows and Wave2 ledger/index backing.

## Risks / Trade-offs

- **Risk: batch claim increases simultaneous Sub-agent load** -> Mitigation: bounded cap, profile/runtime override, conservative default cap no higher than 5, and explicit terminalization for expired attempts.
- **Risk: polling loop becomes noisy or infinite** -> Mitigation: bounded interval, deadline awareness, `inspect`/submit feedback, terminal commands, and tests that forbid waiting on user/task notification as continuation.
- **Risk: Phase-owned references become unsourced summaries** -> Mitigation: require concrete submitted backing refs, index updates, cache/source-claim mapping, and gate diagnostics for unbacked source URLs.
- **Risk: Gate changes accidentally weaken delegated provenance** -> Mitigation: keep fetched-source delegated evidence ledger-first; only Phase-owned projections from already submitted backing avoid new Wave2 ledger requirement.
- **Risk: Existing tests expect Sub-agent reference output** -> Mitigation: update tests to check Sub-agent submitted source claims/cache and Phase Agent post-submit materialization separately.
- **Risk: More spec surfaces are touched than code diff seems to need** -> Mitigation: this is intentional because current specs conflict across reference format, provenance gate, phase content, and anti-cheating guidance.

## Migration Plan

1. Add/adjust Markdown/static tests for Wave0/Wave1 batched claim guidance and active polling language.
2. Update shared Sub-agent protocol and silent execution guidance before changing phase nodes so phase text has a common loop contract to point at.
3. Update Wave1 phase and `dpt-evidence-extractor` role guidance to move topic reference materialization to Phase Agent after submit.
4. Update Wave2 phase and `dpt-topic-scout` role guidance to distinguish existing-backed `00-cross` projections from new targeted evidence.
5. Update anti-cheating/reference template/shared schema wording.
6. Update gate definitions/provenance helpers/inspectors/file observability where needed so Phase-owned projections do not trigger delegated bypass while unbacked fetched evidence still fails.
7. Add focused gate/provenance tests for Wave1 Phase-owned topic refs and Wave2 pure-synthesis `00-cross` refs.
8. Update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to `v0.10`.
9. Run targeted `node:test` suites and OpenSpec governance checks.

Rollback strategy: batching/polling guidance can be reverted independently of reference provenance if load proves too high. Reference materialization should not be partially reverted without also restoring old WPG/RWG semantics, because mixed wording would reintroduce responsibility gaps.

## Open Questions

- Should Phase-owned references use an explicit metadata key such as `materialization_role: phase_owned_projection` or rely on existing fields plus backing refs? Recommended default: use the smallest parser-compatible metadata/ref convention that gate helpers can check deterministically.
- Should `reference/_INDEX.md` include a column that distinguishes fetched-source references from existing-backed projections? Recommended default: keep `source_layer` and add prose/metadata guidance unless gate implementation needs a structured column.
- Should a later change add `operate-work-unit wait`? Recommended default: defer until after this guidance-first change has been applied and observed.
