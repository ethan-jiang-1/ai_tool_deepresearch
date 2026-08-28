## Why

`DEEP_RESEARCH_HARNESS/COMMANDS.md` 作为「想做某事就来查命令」的 Agent-facing 索引，存在一个明确的覆盖率空洞：Agent 实际最频繁使用的 `operate-queue.mjs` 生命周期（`check`/`enqueue`/`claim`/`complete`/`fail`/`preempt`/`count`/`render`/`project`/`repair`）几乎没进表，且几套「形状不对就报错」的 contract（queue result、投影包、Evidence Map 列头）只能靠读引擎源码或抄旧报告才能凑对。

这些都属于「Engine 已用 Zod `.strict()` 严格校验、但 Agent 只能靠试错发现」的 contract，应提前写进索引。触发与证据来源见
[`_backlog/plans/commands-md-cli-surface-coverage-and-copyable-contracts.md`](../../../_backlog/plans/commands-md-cli-surface-coverage-and-copyable-contracts.md)
（真实 Agent 跑完 `dpt_rb_chinese-ai-inference-chips-vs-nvidia` 的 r6 rerun 全链 CLI 实操后的复盘）。

## What Changes

只改 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 一个文件，纯文档补全，零引擎行为改动、零新命令、零新 schema 字段：

- 在 `Subagent 环境` 区补一张 `operate-queue.mjs` 生命周期行，动词只用源码实际 dispatch 的真实集（`check`/`enqueue`/`claim`/`complete`/`fail`/`preempt`/`count`/`render`/`project`/`repair`），显式标注「`complete` 吃 result.json，不是 enqueue 用的 demand/task card」，并写 queue item id 需在 active_window + terminal_history 内唯一、历史同名加 `-rN` 后缀。
- 在 COMMANDS.md 尾部新增一个 `## Copyable Contract Templates` 附录，三套模板各给最小正例：
  1. queue result（`queue_item_id`/`status:"done"`/`receipt?`/`summary`/`writes`，含 `receipt` 前缀语义与 `.strict()` 反例说明）；
  2. projection packet（wave0/wave1 `source_identity:{kind:"submitted_work",work_id}`；wave2 `{kind:"finding",finding_id}` 且 `entry_id===finding_id`、正则 `W2F-\d{3,}`）；
  3. Evidence Map 三列头（`finding id` / `declared key finding` / `submitted backing`，列名大小写不敏感，backing 必须是指向已提交 `reference/*.md` 或 `artifacts/wave1/*/evidence-summary.md` 的 markdown link）。
- 在各相关节补 gotcha one-liner：evidence-bearing 投影 entry 需 concrete ref 或 defers 处置（`projection_entry_concrete_ref_missing`）；大 stdout 需 `> file` 落盘（EAGAIN/`errno -35`）；gate 命令 `--current-node <file-ref>` 为必带参数并列出六大 gate 推进链；`persist-final-report` 目标父目录需预先存在（`target_parent_missing`）。

不改变任何 Engine 裁决行为、exit code 语义、CLI 名称、schema 字段或测试。不新增第二份 walkthrough 叙事，不新增 kebab↔snake 手写对照表（该映射仍由 `schema/enums.mjs` + `workflows/manifest.json` 单一真相源拥有）。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change only fills coverage gaps in the existing command index under
already accepted `agent-command-surface` (ACS) completeness/copyability
requirements. It declares `skip_specs: true` because no capability requirement
or observable runtime behavior changes.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md` (ACS-003 command-index completeness/copyability), `tests/engine/command-contract-docs.test.mjs` | Verify-only | 已接受 spec 已要求命令索引完整性与可复制性；本 change 只是补齐索引空洞，不新增 requirement。 |
| `agent/agentic-queue` | `openspec/specs/agent/agentic-queue/spec.md`, `DEEP_RESEARCH_HARNESS/engine/queue-manager-core.mjs` (QueueResultSchema), `DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs` | Verify-only | Queue 生命周期与 result schema 已是 Engine 严格校验的既有 contract；本 change 只把它写进索引，不改变行为。 |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md`, `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs` | Verify-only | 投影包 source_identity（wave0/wave2）与 concrete-ref-or-defers 规则是既有契约；只文档化，不改 schema。 |
| `research/final-delivery-backing` | `openspec/specs/research/final-delivery-backing/spec.md` (FDB), `DEEP_RESEARCH_HARNESS/engine/helpers/final-delivery-backing.mjs` | Verify-only | Evidence Map 恰好三列 + submitted-backing link 是既有校验；只写 copyable 正例。 |
| `bundle/artifact-persistence-recovery` | `openspec/specs/bundle/artifact-persistence-recovery/spec.md`, `DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs` | Verify-only | `persist-final-report` 目标父目录需预先存在是既有校验；只补 one-liner。 |
| `engine/cli-exit-code-conventions` | `openspec/specs/engine/cli-exit-code-conventions/spec.md`, `DEEP_RESEARCH_HARNESS/COMMANDS.md` exit-code 节 | Verify-only | 大 stdout EAGAIN 落盘提示属于 exit-code/invocation 契约；只补 one-liner。 |
| `engine/cli-phase-transition` | `openspec/specs/engine/cli-phase-transition/spec.md`, `DEEP_RESEARCH_HARNESS/cli/gates/*` | Verify-only | gate `--current-node` 必带参数是既有 invocation 契约；只补 one-liner，不改变推进链。 |

## Impact

- 唯一目标文件：`DEEP_RESEARCH_HARNESS/COMMANDS.md`（纯 Markdown 补全）。
- direct Source of Record 保持不变：queue result 以 `engine/queue-manager-core.mjs` 的 `QueueResultSchema` 为真；投影包以 `engine/helpers/canonical-topic-state.mjs` + 对应 accepted schema 为真；Evidence Map 以 `engine/helpers/final-delivery-backing.mjs` 为真。附录只做 copyable 正例，不是第二真相源。
- 最短合法闭环：Agent 想 enqueue/claim/complete 或凑 result/projection/Evidence Map 形状时，直接查索引 + 复制正例，不再读源码或抄旧报告；无新增 control layer、无 retry/recovery 分支。
- semantic-precision reflection：不引入任何具名 state、projection、command、reader-facing view 或 schema。附录的唯一「读者/有界问题」是「给出能被 `.strict()` 校验通过的最小输入」，必须保留的区别是「result 而非 task card」「wave0 vs wave2 的 source_identity kind」「concrete ref vs defers」；正常推理停止点是「照抄正例即可提交，无需理解全部 validator 内部」。
- 责任边界不变：Agent 照抄 copyable 正例后执行命令；Engine 仍拥有全部 deterministic verdict；user 不参与任何 pipeline 命令执行。
