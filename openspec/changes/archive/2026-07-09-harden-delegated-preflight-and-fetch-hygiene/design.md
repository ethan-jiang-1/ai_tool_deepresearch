## Context

前两个 martin-fowler 相关 changes 已经把“Agent 看错合同”和“gate 判断层漂移”收束掉。本 change 不再扩大那些合同面，而是在同一条 delegated work-unit loop 上补两个卫生缺口：

```text
claim -> Sub-agent writes result/receipt/output/cache -> dry-submit -> repair -> submit -> ledger/gate
                                      |
                                      v
                         fetch multiple URLs efficiently
```

这里的性能目标很窄：

- dry-submit 减少正式 submit 失败后多轮读源码/试错。
- multi-URL fetch guidance 减少单个 Sub-agent 对多个 URL 顺序抓取的 wall-clock。
- floor+margin guidance 减少无依据超射抓取。

本 change 不改变 evidence quality threshold，不改变 gate pass/fail，不允许 Engine 替 Agent 搜索或写作。

## Goals / Non-Goals

**Goals:**

1. 增加只读 `operate-work-unit dry-submit`，让 Agent 在正式 submit 前得到批量结构化诊断。
2. 让 dry-submit 复用正式 submit validator 和 reason-code 语义，避免新建一套“差不多”的 preflight checker。
3. 保证 dry-submit 不写 ledger、不完成 queue、不改变 work-unit terminal/claimed 状态、不持久化 canonicalization、不记录 `last_submit_rejection`。
4. 更新 Sub-agent role docs：per-URL fallback chain 与 multi-URL small-batch / bounded-parallel fetch 是两层策略。
5. 将 active Sub-agent guidance 中的 Python fallback 替换为 JS/Node-first fetch fallback。
6. 更新 Wave0/Wave1 phase docs：默认 source candidate target 从 profile floor + small margin 推导，禁止无 profile 绑定的 hard-coded aim。
7. 增加 focused tests / hygiene guard 防止回归。
8. 发布为 framework `v0.14`。

**Non-Goals:**

- 不修改 formal submit 成功语义。
- 不改 gate definitions、count floors、source novelty floors、reference navigation policy。
- 不新增 ledger amend、metadata-only relabel、历史坏 row 修复。
- 不实现 Engine-owned JS/browser fetcher，不把 search/fetch 编排搬进 Engine；JS/Node-first fetch tier 只作为 Sub-agent guidance。
- 不新增 npm 依赖，不使用 Python。
- 不要求 disposable real-Agent E2E 作为本 change 的通过条件；回归和 controlled fixture 验证即可。

## Decisions

### Decision 1: dry-submit 是 submit validator 的只读投影

Implementation SHALL expose a dry validation path that calls the same underlying result/receipt/output/cache/source/queue/index validation logic as formal submit wherever possible. If current submit code mixes validation and mutation, apply SHALL extract a shared validation plan/helper before adding CLI behavior.

The helper boundary matters: dry-submit SHALL NOT be implemented as formal submit with rollback, and it SHALL NOT call helper branches that write during validation. The known example is cache leaf canonicalization: formal submit may materialize `page.md` from `page-content.md`, but dry-submit must only report that planned normalization. If a validator currently performs this write as part of validation, apply SHALL add an explicit read-only mode or split the read/check/plan step from the persist step before wiring dry-submit.

Read-only does not mean weaker validation. When formal submit would validate canonicalized data, dry-submit SHALL validate an in-memory virtual canonical view. For example, a cache leaf with only `page-content.md` that formal submit would materialize into `page.md` should be evaluated as the same content for preflight diagnostics while leaving `page.md` absent on disk.

dry-submit output SHOULD include:

- `ok: boolean`
- `work_id`
- `reason_codes: string[]`
- `violations[]` with code, message, path/ref when available, and repair target
- `normalizations[]` describing canonicalizations formal submit would perform
- `side_effects: false` or equivalent explicit no-mutation marker
- no `tx_id`, submit-success trace handle, ledger handle, or status mutation handle
- failed preflight diagnostics on stdout as structured JSON, not stderr-only thrown errors

Alternative considered: implement dry-submit as “run submit and rollback.” Rejected because rollback against ledger/queue/cache writes is exactly the class of side effect this preflight is meant to avoid.

Invalid dry-submit SHALL return structured JSON through the dry preflight path. It SHALL NOT call the formal submit rejection recorder, because that path updates `last_submit_rejection`, status files, trace, and run logs by design.

### Decision 2: dry-submit reports canonicalization but never persists it

Formal submit currently performs narrow canonicalization for predictable LLM-shaped drift. dry-submit MAY simulate and report those normalizations so the Agent understands whether formal submit would accept the candidate. It SHALL NOT write the canonical result, receipt, cache leaf alias, ledger row, queue terminal history, trace success event, or `last_submit_rejection`.

Invalid dry-submit SHALL not make a claimed attempt terminal. Valid dry-submit SHALL not reserve success or block later formal submit. Formal submit remains the only authority.

dry-submit SHALL mirror formal submit's candidate path semantics. A candidate result may come from a temporary or caller-provided path when formal submit would allow it. The assigned work-unit directory containment rule remains narrow: it only controls whether result/receipt nonce normalization is allowed, matching the existing submit canonicalization contract.

The expected read-only proof is a before/after snapshot over bundle authority surfaces, including at least `_work_units/_index.json`, `_work_units/_transactions/`, `rb_queue.json`, `rb_output_declarations.jsonl`, the assigned result/status/runtime-receipt files, relevant cache leaf files such as `page.md`, `rb_trace.jsonl`, and run log files. Tests may compare exact bytes, file existence, directory entries, and ledger row counts rather than relying on console output.

### Decision 3: all violations are better than first failure

The preflight value is that Agent can repair multiple problems at once. The dry validation helper SHALL accumulate independently evaluable violations rather than returning only the first failure. Where a later check depends on an earlier parse succeeding, it may skip dependent checks and include a dependency diagnostic.

Reason-code semantics SHOULD reuse the current submit rejection taxonomy where practical. New reason codes may be added only for genuinely new preflight-only grouping, not to rename existing failures.

### Decision 4: fetch hygiene remains Agent guidance

Sub-agent roles perform search/fetch with available tools. Engine does not fetch pages. The docs SHALL teach:

- use fallback chain inside one URL attempt;
- process different candidate URLs in small batches, or concurrently only when the native tool/runtime already supports bounded parallel operations;
- bound parallelism conservatively and respect site/tool limits;
- write complete cache trails for every accepted source;
- record honest access failure only after all allowed JS/Node-first tiers fail for that URL;
- never substitute search snippets for fetched content.

Because the repo forbids Python, active guidance SHALL replace Python fallback with JS/Node-first fetch guidance. This is not only wording cleanup: `subagent-dpt-source-intake.md` currently lists `Python urllib.request` as a fetch fallback, which violates repo policy and points the Agent at the wrong technology stack. Apply SHALL replace that tier with Node.js `fetch` or an equivalent JavaScript-native fetch path, SHALL keep built-in page-fetching tools / browser fetch as preferred tiers when available, SHALL keep `curl` only as an existing CLI fallback, SHALL keep `subagent-dpt-evidence-extractor.md` free of Python fetch tiers, and SHALL avoid replacing it with Python one-liners, `.py` scripts, or any other Python-based fetch workaround. If a future environment wants Python, it needs a separate accepted change that revisits the repo-wide hard rule.

### Decision 5: floor+margin is a planning heuristic, not a gate change

Wave0/Wave1 phase docs SHALL tell the Phase Agent and Sub-agent to derive the initial candidate target from explicit profile/runtime floors:

- Wave0: use `wave0_per_topic_source_floor` and shared-reference target surfaces as the floor basis.
- Wave1: use `wave1_per_topic_ref_floor`, `topic_unique_ratio`, and depth-review new-source floor semantics as the floor basis.

The default target is `floor + small margin`, where the margin is conservative and exists only to absorb failed fetches, duplicates, and non-countable sources. It does not reduce or raise gate floors. If more evidence is needed after gate/inspect, repair/refill uses supplementary work units.

Docs SHALL avoid numeric hard-coded aims such as “always fetch 12” unless the number comes from an explicit profile/runtime value or an example clearly states the floor and margin derivation.

The margin SHALL remain intentionally qualitative in specs. Implementation docs may give examples only when the example names the active floor and derives the target from that floor. The margin is not a new profile field, gate parameter, quality threshold, or hidden over-fetch policy.

### Decision 6: hygiene can be pattern-based for obvious drift

Static hygiene does not need semantic NLP. It should catch obvious active-surface regressions:

- Python fallback or Python fetch workaround in active Sub-agent fetch sections.
- `aim N`, `fetch N`, or similar hard-coded numeric target in Wave0/Wave1 fetch guidance when not adjacent to profile floor / margin wording.
- wording that makes fallback chain sound like all URLs must be processed serially.

False positives should be managed by scoping to active Wave0/Wave1 phase and Sub-agent role docs, not by weakening the guard globally.

## Verification Strategy

- Unit / integration tests for dry-submit:
  - ok candidate returns ok without appending ledger or completing queue.
  - invalid candidate reports multiple independent violations.
  - candidate that formal submit would canonicalize reports normalizations but leaves files unchanged.
  - after dry-submit, formal submit still succeeds or fails according to the unchanged candidate/bundle state.
- Markdown/static tests:
  - Wave0/Wave1 phase docs mention profile floor + small margin and do not hard-code unbound aim values.
  - Sub-agent fetch sections state fallback chain is per URL and multi-URL work should use small batches, with bounded parallelism only when the native tool/runtime supports it.
  - active guidance uses JS/Node-first fallback and contains no Python fallback.
- Hygiene CLI test if hygiene is extended:
  - fixture with Python fallback / Python fetch workaround or unbound hard-coded aim fails.
- Governance:
  - `node openspec/governance/check-project-reqs.mjs`
  - `node openspec/governance/check-project-specs.mjs`

## Implementation Evidence Shape

During apply, create and maintain `implementation-evidence.md` in this change directory. It SHALL include:

- scope readback: proposal/design/tasks/specs read, archived changes consulted, and explicit exclusions confirmed;
- dry-submit mutation audit: validation helpers touched, write-capable helpers identified, and how each write path is kept out of dry-submit;
- before/after no-side-effect proof: exact surfaces snapshotted for passing, failing, and canonicalization-reporting dry-submit cases;
- fetch/floor guidance audit: active docs changed, JS/Node-first fallback added, Python fallback/workaround removed, bounded batching wording added, floor+margin wording added, and unbound hard-coded aims removed;
- test/governance ledger: command, PASS/FAIL, and failure classification;
- OpenSpec validation result when available, or the exact unavailable CLI outcome when it is not installed;
- residual risks and deferred findings, including any unrelated governance baseline drift if it reappears.

Governance baseline note: the archived `2026-07-09-align-gate-contracts-and-reference-navigation` orphan IDs `AGO-007`, `WPG-013`, `GSK-011`, `RWP-016`, `RWG-018`, `IOC-005`, and `RRM-004` were already present as requirement bodies in main specs but were missing from the main spec `> req:` headers. That traceability cleanup is separate from this change's functional scope; final apply/archive still requires governance PASS.

## Risks / Trade-offs

- Sharing submit validation may require refactoring mutation-heavy submit code. Keep extraction narrow: validation plan first, mutation only in formal submit wrapper.
- Accumulating all violations can overreach if checks are deeply ordered. Prefer partial accumulation with dependency diagnostics over unsafe fake continuation.
- dry-submit normalizations could confuse Agent into thinking work is complete. Output and docs must repeatedly state no side effects and formal submit still required.
- Parallel fetch guidance could overload tools/sites if too broad. Keep wording to small batches, tool/runtime limits, and no coverage reduction.
- floor+margin wording can accidentally become a new hidden numeric policy. Keep it heuristic and bound to explicit profile/runtime floors.
