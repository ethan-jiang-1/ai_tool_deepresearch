## 1. 修 spec

- [x] 1.1 直接修改 `openspec/specs/workflow-fsm-runtime/spec.md` Purpose 段落（非 Requirement，无 delta spec）：将 "不包含 VM 沙箱、MD 执行或依赖解析——这些属于 `workflow-chain.mjs` 的职责" 改为 "不包含 VM 沙箱或 MD 代码执行。依赖解析和 MD 加载见 `workflow-chain.mjs`"

## 2. 验证

- [x] 2.1 运行 `node openspec/governance/check-project-reqs.mjs` — PASS
- [x] 2.2 运行 `node openspec/governance/check-project-specs.mjs` — PASS
