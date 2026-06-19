## Context

`fix-workflow-chain-md-agent-readable` 已实现——workflow-chain.mjs 不再做 VM 沙箱执行。`workflow-fsm-runtime` spec 的 Purpose 里仍写着 "VM 沙箱、MD 执行属于 workflow-chain.mjs 的职责"，需要清理。

## Goals / Non-Goals

**Goals:**
- 修 `workflow-fsm-runtime/spec.md` Purpose 段落一句过时引用

**Non-Goals:**
- 不改 Requirements
- 不改代码
- 不改 registry

## Decisions

**选择**：去掉 "不包含 VM 沙箱、MD 执行或依赖解析——这些属于 `workflow-chain.mjs` 的职责"，改为 "不包含 VM 沙箱或 MD 代码执行。依赖解析和 MD 加载见 `workflow-chain.mjs`。"

保留指向 workflow-chain 的引用（依赖解析和 MD 加载仍然是它的职责），只去掉 VM 沙箱/MD 执行那段。

## Risks / Trade-offs

无——纯文字修正。
