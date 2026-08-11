## Why

当前两个静态 Markdown contract test 都在失败，但失败来源不是 Harness 行为
失效。BUG-216 把 Final 术语错误地要求保留在精简后的 `CONTEXT.md`；BUG-217
要求三份现有 delegated guidance 使用已接受但尚未显式出现的 `bounded top-up`
术语。前者会诱导把路由文档重新扩成第二份 glossary，后者则把既有 batch/cap
语义误报为 Queue 或 scheduler 缺陷。

本 change 依据
[`_backlog/plans/systemic-active-bug-remediation.md`](../../../_backlog/plans/systemic-active-bug-remediation.md)
收敛 BUG-216 与 BUG-217，使静态 tests 和 Agent-facing wording 回到已有的
accepted contracts，同时不改变任何运行时行为。

全量验证还发现一个同类的静态 baseline drift：commit `a5ba8d5cd` 已把
`.nvmrc` 从 20 升到 22，但 setup-preflight contract test 仍固定断言 20。它应
读取已提交的 Node baseline，而不是把旧版本当作行为要求。

同一轮验证还发现 HITL1 controls static test 仍以已改名的
`### 3b.1 Optional User Research Controls Snapshot` 作为切片起点。commit
`1cf476119` 已将该 section 正确编号为 `3b.2`，旧 selector 因而得到空字符串；
修复应只对齐测试锚点，不改写 HITL1 guidance。

## What Changes

- 修复 artifact-persistence 静态 contract test 的 authority drift：移除对
  `CONTEXT.md` 中 Final glossary 词条的断言，保留 Final Evidence Map command、
  release 和 `RUN.md` 一致性的真实覆盖。
- 在 shared Sub-agent protocol、Wave0 和 Wave1 delegated drain guidance 中以
  最小文字插入显式使用既有的 `bounded top-up` / batch-claim posture，并把概念性
  `--count <claim-count>`、`accepted/default cap`、`remaining free delegated
  in-flight capacity` 明确映射到当前 `claim_count`、有效 profile cap 与
  `remaining_free_capacity`；保留当前公式、fallback、reconstruct、
  poll/submit/repair/terminalize/materialize/gate 顺序。
- 将 setup-preflight static test 的 `.nvmrc` 期望从 20 对齐为当前已提交的 22；
  不修改 Node baseline、依赖或 Agent-facing setup 行为。
- 将 HITL1 controls static test 的两个 slice 起点从已退休的 `3b.1` 标题对齐为
  当前 `3b.2` 标题；不修改 phase guidance 或其 authority boundaries。
- 不扩写 `CONTEXT.md`，不改变 Engine、Queue、work-unit、Gate、CLI、Final
  persistence 或 runtime bundle 状态，也不新增测试 taxonomy、依赖或 version
  bump。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change repairs consumers of already accepted behavior. It declares
`skip_specs: true` because no capability requirement or observable runtime
behavior changes.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/final-delivery-backing` | `openspec/specs/research/final-delivery-backing/spec.md` (FDB-001, FDB-002), `CONTEXT.md`, and `tests/integration/md/artifact-persistence-contract.test.mjs` | Verify-only | The accepted spec owns Final key-finding declarations, Evidence Map, and submitted backing; the stale assertion wrongly assigns that ownership to `CONTEXT.md`. |
| `research/research-wave-phase-content` | `openspec/specs/research/research-wave-phase-content/spec.md` (RWP-015) and the Wave0/Wave1 guidance/test surfaces | Verify-only | The accepted requirement already requires bounded top-up batch claims and drain-before-gate; this change only restores its literal guidance anchor. |
| `workflow/shared-node-content` | `openspec/specs/workflow/shared-node-content/spec.md` and `shared-subagent-protocol.md` | Verify-only | The shared protocol is an Agent-facing guidance consumer; no shared-node behavior contract is extended. |
| `agent/agent-context-routing` | `CONTEXT.md` and commit `a1e8fa3d5` | Excluded | Context remains a non-authoritative routing surface and must not become a duplicate Final glossary. |
| `agent/agentic-queue` | `openspec/specs/agent/agentic-queue/spec.md` (AGQ-022), its bounded-claim scenarios, and current claim guidance | Verify-only | It owns the existing bounded-batch formula, profile cap, fallback, and conceptual claim-count wording; this change only makes guidance consumers name those existing distinctions. |
| `research/research-wave-gate-implementation` | accepted wave gate specification and current phase guidance | Excluded | Gate evaluation and transition behavior are unchanged. |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` and both selected `tests/integration/md/` assets | Verify-only | The two static Markdown checks are integration evidence for an existing contract; the change adds no test class or proof claim type. |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md` (ACS-002), `.nvmrc`, and `tests/engine/setup-preflight-docs.test.mjs` | Verify-only | The accepted setup path owns the Node/npm baseline; the test must follow the committed `.nvmrc` version and adds no command-surface behavior. |
| `agent/hitl-ux` | `openspec/specs/agent/hitl-ux/spec.md`, current `phase-hitl1.md`, and `tests/integration/md/topic-research-emphasis-guidance.test.mjs` | Verify-only | The test consumes the existing optional-controls guidance and its authority boundaries; it must use the current section coordinate without changing HITL1 behavior. |

## Impact

Apply is limited to three existing integration Markdown contract tests, one
existing unit setup-preflight test, and three existing Agent-facing Markdown
guidance files. The direct Sources of Record remain the accepted Final-backing,
Agentic Queue, wave-phase, command-surface, and HITL UX specifications plus the
committed Node baseline. The shortest legal repair loop is therefore to correct
those consumers, not to add another glossary, policy source, Queue path, or
runtime control layer.

No named state, projection, command, reader-facing view, schema, or lifecycle
transition is introduced or materially changed. The semantic-precision review
therefore has no new concept to define; simple reliable control is preserved by
removing a false authority assertion and making one existing instruction easier
to recognize. The Agent receives the corrected guidance and runs normal
verification; the Engine retains all existing deterministic verdict ownership.

Because `DEEP_RESEARCH_HARNESS/` changes are wording-only and do not change its
behavior, this change requires no version bump, `CHANGELOG.md` update, or
`RUN.md` banner update.
