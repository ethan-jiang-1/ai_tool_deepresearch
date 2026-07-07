## Context

本 change 来自 `_backlog/plans/formal-run-bugfix-change-split.md` 的第二个 change，覆盖 `_backlog/bugs/BUG-047`、`BUG-048`、`BUG-049`、`BUG-050`、`BUG-051`、`BUG-053`。

Change 1 已经先处理 runtime position 和 queue durability。本 change 处理 gate quality loop 本身的质量问题：gate 本来是给 Markdown Controller 提供确定性反馈的质量控制点，但当前 gate 混入了历史补丁和启发式判断。`content_dedup`、homepage/shallow URL、duplicate URL、Jaccard overlap、self-reference 这类信号一旦误报，会被 MD Controller 或未来的 AI Coding Agent 当成真实修复目标，诱导它删除 cache、手改 ledger、绕过 phase 或硬凑 reference，最终把真正的 authority surfaces 搞乱。

这里的核心原则是 KISS：gate 只阻塞 Engine 能可靠控制和解释的事实。质量控制回路本身不能依赖需要二次质量控制的猜测。

## Goals / Non-Goals

**Goals:**

- 给非 bootstrap `stop: no` lifecycle gate 增加合法、trace-durable 的 degraded handoff 出口，避免重复失败死锁。
- 明确 degraded pass 是 handoff witness，不是 clean quality pass，也不是目标 phase work completion evidence。
- 从 phase-boundary gate 和 gate feedback 中干净移除 `content_dedup` 及同类启发式：duplicate URL、homepage/shallow URL、Jaccard overlap、self-reference。
- 将仍然有价值的确定性检查留在正确边界：schema、queue、status、trace、work-unit submit、declaration ledger、provenance/hash、cache coverage/content、route-bound handoff。
- 让 gate inspect/advice root-cause-first、短而可执行，并禁止建议手改 runtime authority files。
- 保持 `stop: no` 失败路径静默：修复、换策略、合法降级、继续或静默 hold，不浮出、不跳 phase、不提前 final。

**Non-Goals:**

- 不恢复 Wave1/Wave2 research depth，这属于 `restore-wave-depth-contracts`。
- 不启用 parallel claim，这属于 `harden-run-entry-and-agent-discipline`。
- 不解决内置 `deep-research` skill / background workflow 清理；本 change 只要求 `stop: no` phase 不等待或依赖无关 workflow。
- 不重写 shared reference threshold/profile 公式；当阈值与现实不匹配且 runtime-truth 前置条件已过时，把它作为窄的 degradation-eligible quality risk 处理。
- 不把 semantic research judgment 搬进 JS gate。
- 不保留 `content_dedup` 的 diagnostic-only、warning-only、inspect-only 变体。
- 不增加 broad force flag 来绕过 schema、ledger、provenance、hash、queue、status、trace 或 handoff failures。
- 不把 JSONL authority 文件改成可手写维护的 surface。`rb_output_declarations.jsonl` 这类文件的防误修主要靠 Engine 诊断、Agent-facing guidance 和有效修复路径；不要为了写 `DO NOT EDIT` 注释破坏 JSONL 结构。
- 不把 ledger rebuild/recompute 作为新的万能修复入口。只有当现有或新增 Engine-mediated 路径能保持 hash/provenance authority 时才允许使用；否则采用 restore、retry、replacement submit、rollback 或 silent hold。

## Source Bug Coverage Audit

| Bug | 原始目的 | Absorbed by | Scope note |
|-----|----------|-------------|------------|
| `BUG-047` | Gate fatigue 后 `stop: no` 不能浮出水面、不能把无关 background workflow 当等待理由。 | `silent-wave-execution` fatigue priority chain; `gate-skeleton` fatigue/degraded contract; tasks 3.4, 5.5. | Background workflow cleanup 本身不在本 change；这里只锁定 DPT phase 行为不能等待它。 |
| `BUG-048` | Gate 重复失败时必须有合法、trace-durable 的 degraded advance path，避免死锁或手改状态。 | `gate-skeleton` degraded pass; `cli-phase-transition` degraded handoff witness; tasks 3.1-3.3, 5.4. | 只允许软质量/profile mismatch 类规则降级；runtime-truth blockers fail closed。 |
| `BUG-049` | 降级也必须沿 phase chain 继续，不能跳 Wave1/Wave2/HITL2 直接写 `final/`。 | `silent-wave-execution` no phase skip/final shortcut; `cli-phase-transition` route-bound enter-phase; proposal regression coverage; tasks 3.4, 5.5. | Wave1/Wave2 深度恢复属于后续 `restore-wave-depth-contracts`，但跳 phase 保护在本 change 保持覆盖。 |
| `BUG-050` | `content_dedup` homepage/path-depth false positive 不应阻塞 gate 或产生修复噪声。 | `gate-content-dedup` REMOVED; `research-wave-gate-implementation` RWG-015 removal; `evidence-extraction` and `rerun-topic-integration` URL parse-only rules; tasks 2.1-2.8, 5.1-5.3. | 本 change 采纳比原计划更简单的处理：直接 retire，不保留 diagnostic-only。 |
| `BUG-051` | 手改 ledger 触发级联 distrust；gate feedback 必须阻止手工修 authority files 并指向有效路径。 | `work-unit-provenance-gate` root-cause diagnostics; `gate-skeleton` manual-edit prohibition; `research-wave-gate-implementation` repair-targeted diagnostics; tasks 4.2-4.4, 5.6. | 不把 JSONL 注释头作为硬要求；避免为防手改引入无效文件格式。 |
| `BUG-053` | Provenance/cache/ledger 级联失败要分清 root cause 和 symptom；gate 自身必须 KISS，不能成为质量风险源。 | `check-inspect-feedback` root-cause-first feedback; `gate-skeleton` KISS quality loop; `work-unit-provenance-gate` cache vs ledger/hash separation; tasks 4.1-4.4, 5.6. | Rebuild/recompute 工具不是默认新增目标；只有 Engine-mediated 且 authority-preserving 时才可进入实现。 |

## Decisions

### Gate KISS principle is load-bearing

Blocking gate checks must be deterministic, low false-positive, independently explainable, and repairable through accepted Engine or Agent workflow paths. Good gate blockers include schema failures, malformed status/queue state, missing route-bound trace witnesses, missing submitted work-unit ledger rows, hash/nonce drift, invalid cache trail mapping/content, and filesystem-only artifacts trying to count as authority.

Bad gate blockers are broad guesses that need the Controller to interpret intent: homepage-looking URL, duplicate-looking URL, shallow path, Jaccard overlap, self-referential prose, or any content heuristic whose repair advice is likely to make the Agent hard-craft outputs instead of following authority paths.

Alternative rejected: keep brittle checks as diagnostic-only advice. Gate feedback directly drives MD Controller behavior; noisy advice is not harmless. If the signal is too unreliable to block, and likely to produce wrong repair behavior, it should not be emitted from the phase-boundary gate.

### Retire content_dedup, do not patch it again

`gate-content-dedup` is treated as a historical patch capability. Apply should remove active helper exports, gate definition entries, CLI dispatch branches, positive tests, current docs, current playbooks, runner entries, health checks, schemas, fixtures, JSON/YAML metadata, and current planning/backlog guidance that present it as current proof.

`GAC-*` IDs remain in `openspec/governance/req-registry.yaml` only if required by RET-005's no-delete registry rule. If retained, they are tombstones: every `GAC-*` entry is marked `[DEPRECATED]`, the `GAC` prefix is marked `no spec directory`, and there is no current main spec, implementation, test, playbook, health check, schema/fixture/runner metadata, current backlog guidance, or Agent-facing guidance that treats `gate-content-dedup` as active.

Alternative rejected: move `checkContentDedup()` to an inspect command. That would keep the historical patch alive as a source of MD Controller repair pressure and make future regressions easier.

### Move deterministic concerns to their proper owners

Removing `content_dedup` does not mean accepting fake references. It means the pass/fail reasons come from precise surfaces:

- filesystem-only reference cannot count: ledger/provenance/file-observability checks;
- missing submitted work: work-unit submission presence and queue lifecycle checks;
- post-submit drift: result/ledger/index/manifest/receipt/beacon/output/cache hash and nonce checks;
- unrecoverable evidence trail: cache coverage and cache content checks;
- malformed reference/source files: schema and section/metadata checks;
- phase bypass: trace-bound gate attempt, load_complete, status window, and phase audit checks.

### Degraded handoff is narrow and trace durable

Degraded handoff is legal only after deterministic runtime-truth preconditions pass. It may carry accepted soft profile thresholds or quality-risk rules forward, but it must never degrade through structural/provenance/hash/status/queue/handoff failures.

The gate result and trace event must preserve `degraded: true`, `degraded_reason`, `degraded_rules`, source/target binding, and normal `next`. If the trace write is not durable, the gate fails closed.

### Feedback should repair root causes, not symptoms

Gate output should separate root causes from cascade symptoms. For example, cache coverage drift should be named as cache coverage drift; it should not make every submitted row look absent. Manual ledger drift should be named as ledger/hash drift and route the Agent through restore, retry, replacement submit, rollback, or Engine-mediated repair, not hand edits.

## Risks / Trade-offs

- Removing heuristics may allow some low-quality prose through a phase gate -> accepted trade-off; semantic quality belongs to Agent workflow and later depth contracts, while gate remains deterministic.
- Degraded pass can be mistaken for clean quality pass -> preserve `degraded: true` in trace/inspect/status consumers and test downstream behavior.
- Retiring `content_dedup` touches many stale docs/tests/playbooks -> add static/hygiene coverage so no current surface still teaches it as proof.
- Reference countability change may increase counts for shallow-looking URLs -> acceptable because cache/source recoverability and provenance checks are the real authority.
- Registry deprecation can create governance churn -> keep `GAC-*` IDs in their original group, mark `[DEPRECATED]`, and run governance checks before archive.

## Migration Plan

- Remove `content_dedup` from Wave0/Wave1 gate definitions and gate CLI dispatch.
- Delete or stop exporting `checkContentDedup()`, Jaccard helpers, homepage/self-reference helper paths when no longer used by current accepted contracts.
- Update reference countability to require present/parseable `source_url`, not homepage/shallow URL classification.
- Remove current playbook/runner/health expectations that require `content_dedup` evidence.
- Remove current non-code metadata and fixtures that require or demonstrate `content_dedup`, duplicate URL, homepage/shallow URL, Jaccard, self-reference, or `source_url_article_level` as current proof.
- Update Agent-facing docs that currently promise `content_dedup` will catch template-generated or duplicate references; replace with work-unit submit, cache, ledger, and provenance authority guidance.
- Mark retired requirement IDs as deprecated tombstones and remove the active `gate-content-dedup` main spec during apply/archive per OpenSpec governance.
- Update repo-root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to target `v0.7`.

## Open Questions

None for this proposal. During apply, any newly discovered gate heuristic that emits duplicate URL, homepage/shallow, Jaccard, self-reference, or equivalent guess-based repair advice should be removed from the quality loop rather than patched.
