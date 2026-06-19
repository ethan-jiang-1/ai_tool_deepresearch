## Why

`fix-workflow-chain-md-agent-readable` 去掉 VM 沙箱后，`workflow-fsm-runtime` spec 的 Purpose 里 "VM 沙箱、MD 执行——这些属于 `workflow-chain.mjs` 的职责" 这句话不成立了——workflow-chain 也不做 VM 沙箱了。需要清理这句 stale reference，避免混淆。

## What Changes

- `workflow-fsm-runtime` spec 的 Purpose 文字：移除 "VM 沙箱、MD 执行归 workflow-chain" 的过时引用

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无——Purpose 文字修正是非规范性清理，不改任何 Requirement。无 delta spec。）

## Impact

- `openspec/specs/workflow-fsm-runtime/spec.md` — Purpose 段落修一句话
- 不影响代码、不影响 registry
