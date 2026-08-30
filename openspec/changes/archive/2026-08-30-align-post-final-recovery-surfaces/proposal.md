## Why

`_backlog/plans/spec-semantic-drift-remediation.md`（2026-08-30 深挖）指出 post-final 恢复链路是全库表面清晰度最低的链路（spec / playbook / phase / CLI 四面深度悬殊）。本 change propose 期逐项核实后，收敛出两处真实缺口：

1. **A2 exit-code 契约裂缝（已证实）**：`research/post-final-recovery` spec 已明文规定 "Exit codes remain … `2` only for invalid invocation or inability to construct the validated envelope. Selected-bundle runtime contract failures SHALL use blocked exit `1`"（spec L201-204），但 `DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs:53-60` 的 catch-all 把一切未捕获异常（含 bundle 状态损坏等运行时契约失败）打成 exit `2` `operation_failed`——代码违背既有 spec。
2. **B1' check-reentry 入口语义孤本（已证实）**：ReopenResearchPass entry/status 同步后 reentry 诊断的正确目标检查点是 `hitl2_recorded`、`--at phase-rerun` 读作 "rerun_ready 已通过"、`--at` 接受 gate enum 或 phase ref——这些 post-final 特定入口语义只存在于 `command_playbook/post-final-recovery.md` 末段（L116），spec 对 `check-reentry` 零覆盖（grep 0 命中）。

propose 期同时修正了深挖报告的两处误判（详见 design D2）：dig-list intake 规则**不是**孤本（spec L622-657 已有完整 requirement）；ReopenResearchPass 命名无变体（无需统一）。

## What Changes

- **A2（代码对齐既有 spec）**：`operate-post-final-recovery.mjs` catch 分类修复——`ZodError`（envelope 构造失败）保留 exit `2` `invalid_configuration`；其余未捕获运行时失败收敛为 closed blocked verdict（`verdict: 'blocked'`、`reason_code: 'operation_failed'`、`reason` 携带错误消息）+ exit `1`。inspect/apply/recover 的合法 verdict 语义、参数校验失败（`fail` → exit `2`）、无参数调用（exit `2`）全部不变。
- **B1'（孤本回灌 + 投影指针化）**：spec 新增 ADDED requirement（POF-006）"Post-final rerun entry diagnostics SHALL target the derived incoming checkpoint"，承载 check-reentry `--at` 双形式（gate enum / phase ref）、`--at phase-rerun` 的读法、以及 entry/status 同步后正确目标为 `hitl2_recorded`；`command_playbook/post-final-recovery.md` §1.5 的规范性内容收敛为对既有 spec requirement（L622-657）的指针（保留操作命令清单），§4 末段同理收敛为对 POF-006 的指针。
- **不产出**：不改 inspect/apply/recover 的合法 verdict 集合与 `next_action` 形状；不改 `engine/helpers/post-final-recovery.mjs`（A2 只动 CLI 薄层）；不改 `check-reentry.mjs` 本身的 `--at` 机械语义（其 owner 是 `engine/runtime-reentry-debuggability` 契约）；无 ReopenResearchPass 改名（无变体）；不触碰 dig-list 合同。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/post-final-recovery` | spec 全文 657 行 + `command_playbook/post-final-recovery.md` 全文 + `cli/operate-post-final-recovery.mjs` 全文 + `engine/helpers/post-final-recovery.mjs` L1-120/结构扫描 | Modify | A2 的 exit 契约 owner（spec L201-204）与 B1' 的 ADDED requirement（POF-006）落点 |
| `engine/cli-exit-code-conventions` | spec grep "post-final" 零命中——该 spec 不管辖此 CLI | Excluded | operate-post-final-recovery 的 exit 契约 owner 是 post-final-recovery spec 自身，无该 spec delta |
| `engine/runtime-reentry-debuggability` | check-reentry `--at` 机械语义 owner | Excluded | 本 change 只回灌 post-final 特定的目标选择规则，不改 `--at` 解析机制 |
| `research/content-delivery-phase-content` | phase-final 交付/refinement 边界 | Excluded | A2/B1' 不触碰交付与 presentation 路径 |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `research/post-final-recovery`: 新增 ADDED requirement POF-006（reentry 入口诊断目标语义，含 2 个 scenario）；spec 头部 `> req:` 索引补入 POF-006。CLI 运行时失败 exit 行为对齐该 spec 既有规定（无新 requirement）。

## Impact

- `openspec/specs/research/post-final-recovery/spec.md`：+POF-006（约 40 行）。
- `openspec/governance/req-registry.yaml`：+POF-006（Apply 期同步）；`openspec/governance/semantic-fact-families.yaml`：+1 个新 fact family（`lifecycle.reentry-checkpoint-targeting`，POF-006 建立的事实无既有家族覆盖）。
- `DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs`：catch 块分类修复（唯一代码改动）。
- `DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md`：§1.5/§4 末段指针化（约 -30 行）。
- `tests/integration/cli/post-final-recovery.test.mjs`：新增运行时失败 → exit 1 blocked 用例。
- 责任边界：Engine 裁决语义（verdict 集合、eligibility、lineage 证明）零改动；`check-reentry.mjs` 零改动；A2 只是把 CLI 的异常出口收敛到 spec 已声明的 closed verdict 形状。

## Design Notes（proposal 级）

- Source of Record：exit 契约 = `research/post-final-recovery/spec.md`（L201-204 既有文本）；`--at` 机械语义 = `engine/runtime-reentry-debuggability` 契约；POF-006 = post-final 入口的目标选择规则（spec 直接建立）。
- 最短合法闭环：A2 改 CLI 薄层（61 行文件的 catch 块）而非 helper 全量防御性改造；B1' 用聚焦 ADDED requirement 而非复制 100+ 行巨型 requirement。
- net simplification：playbook 规范性内容收敛到 spec 单一权威面（约 -30 行投影），CLI 异常出口从"裸错误 exit 2"收敛进既有 closed verdict 形状——不新增控制层、不新增状态。
- 责任边界：Engine 拥有确定性裁决（blocked verdict 形状不变）；Agent 拥有按 `reason`/`next_action` 的修复执行；用户决策面（新 bundle 决定等）不变。