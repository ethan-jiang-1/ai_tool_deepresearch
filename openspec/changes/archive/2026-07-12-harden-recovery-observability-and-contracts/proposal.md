## Why

当前 recovery/inspect surface 能分别检查 reentry、文件 provenance 和 wave 输出，但无法把 BUG-079 形状的“registry 外 durable topic、悬空 topic identity、平行 addendum namespace、不可达 repair advice”收敛成按独立 root 分组的最近合法动作或明确 missing contract；同时 BUG-077 剩余的 Wave0 metadata split、bold return-map 和 cache-leaf contract 漂移仍会迫使 Agent 读 Engine 源码或在错误 advice 中循环。现在需要先建立一个只读、root-cause-first 的恢复安全网，再进入 canonical state、post-final reentry 或 authorized repair 等后续高风险 change。

来源：`_backlog/plans/overall-recovery-canonical-state-and-delegation-roadmap.md` 的 C1、`_backlog/plans/breakpoint-recovery-persistence-model.md` 的 disk-truth recovery contract、`_backlog/plans/human-override-and-state-mutability.md` 的能力 D、`_backlog/bugs/BUG-077-subagent-api-402-and-cache-trail-schema-opaque.md` 的 contract-opacity 残余、`_backlog/bugs/BUG-078-post-final-hitl2-rerun-reentry-blocked.md` 暴露的不可达 repair advice，以及 `_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md`。

## What Changes

- 扩展现有 file observability 与 reentry diagnostics，使其能从 bundle disk truth 检测 canonical topic footprint drift：registry/seed/wave/reference/final 之间的缺失、悬空 identity、registry 外 durable topic output，以及作为唯一正式结果存在的平行 namespace。
- 让 recovery/reentry check/inspect advice 在推荐 predecessor gate、phase entry 或同一 recovery surface 的确定性 repair 动作前验证该动作在当前 handoff/status window 中是否真实可达；若 sanctioned path 缺失，直接报告 missing contract，不输出已知会被同一 preflight 再次拒绝的循环建议。
- 修复 Wave0 inspect 对带 H1 标题 reference metadata 的错误切分，使首个 H2 section 之前的 bullet metadata 被正确读取。
- 明确 return-map field 的 presentation tolerance：允许普通字段名与 Markdown bold-wrapped 字段名映射到同一 canonical field，避免仅因展示标记造成 blocking parser failure。
- 建立一个 Engine-owned cache-leaf contract projection，集中定义 required leaf files、source mapping fields 和 explicit degraded-capture 条件；submit/gate helpers 复用该 contract，Agent-facing docs 由静态一致性测试防漂移。
- 删除 `guidelines/simple-reliable-control.md` compatibility notice。Active guidance/navigation 必须只使用两条 canonical Evolution Directions；closed plans 与 archived OpenSpec 中的旧路径文字保持历史原样，通过 Git history理解，不再依靠实体 notice 文件维持当前导航。
- 更新 `openspec/config.yaml`，把 `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md` 写成所有新 proposal/design 的 paired evolution review：新增 state/check/fallback/recovery 必须说明 direct Source of Record、净简化和删除/避免的旧复杂度；用户只承担新语义/风险/权限决定，Agent 执行合法机械工作，Engine 保持确定性裁决，`human-directed` 不创造权限或缺失 capability。
- 保持所有新增 audit/inspect 路径只读，不写 status、queue、trace、ledger、artifact、cache、checkpoint 或 authority state。
- 增加 focused regression 与 incident-shaped controlled proof，覆盖 BUG-077/079 的真实失败形状和 root-cause-first diagnostics。
- 本 change 修改 `DPT_FRAMEWORK/` 可观察行为与 Agent-facing contract，版本目标为 **v0.22**；apply 时更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。
- 本 change **不**实现 crash-safe write/sweep、canonical topic identity/progress Source of Record、subagent API 402 availability fallback、post-final reentry、state-seed、human override、atomic rename/renumber 或正式 addendum path。

## Capabilities

### New Capabilities

无。现有 file observability、reentry、check/inspect、wave inspect、return-map 与 cache contract capability 已拥有所需行为边界；本 change 不新增第二套 bundle-audit capability。

### Modified Capabilities

- `file-observability`: 增加 canonical topic footprint 与 Engine-invisible durable output 的只读分类，保持诊断不授予 authority。
- `runtime-reentry-debuggability`: 增加 incident-shaped recovery consistency 汇总，并要求只凭 bundle truth 暴露 canonical drift 与缺失 sanctioned path。
- `check-inspect-feedback`: 要求 recovery/reentry advice 指向当前状态下真实可达的最近合法动作，并在路径不存在时报告 missing contract 而非循环建议。
- `cli-inspect-output-conventions`: 修正 Wave0 metadata block 的 H1/H2 boundary，并保持 finding classification 与 inspect pass/fail 一致。
- `research-return-map`: 将 Markdown bold-wrapped field labels 归一化为既有 canonical return-map fields，不让纯 presentation drift 成为隐藏 blocking contract。
- `cache-raw-web-content`: 建立 submit/gate 共用的 cache-leaf contract projection，并用静态检查保证 Agent-facing 文档与 executable contract 对齐。

## Impact

- 预计修改 `DPT_FRAMEWORK/engine/helpers/file-observability.mjs`、reentry/inspect helpers、`DPT_FRAMEWORK/cli/check-reentry.mjs`、`DPT_FRAMEWORK/cli/inspect-wave0-output.mjs`、return-map helper、cache validation/helper、相关 Zod output/cache contract 与 Agent-facing shared docs。
- 预计扩展 `tests/engine/`、`tests/integration/cli/`、`tests/integration/md/` 的 focused regression，并在现有 recovery/file-observability experiment family 中增加或更新 incident-shaped controlled case；不新增通用 runner 或实验框架。
- 预计删除 `guidelines/simple-reliable-control.md`，修改 `openspec/config.yaml` 与一个 focused static regression；closed plans 与 archived changes保持只读历史，不改变其文字或语义。
- Delta requirements 计划使用现有 capability 前缀的新 ID：`FIO-006`、`RRD-008`、`CHI-003`、`RRM-005`、`CRC-008`；Wave0 H1/H2 metadata boundary 作为现有 `IOC-001` 的修正，不另造 capability。
- Apply 时更新 `openspec/governance/req-registry.yaml`，并运行 requirement/spec governance checks。
- 不新增 npm 依赖；继续使用 Node.js ≥20、JavaScript ESM、`zod`、`yaml` 与 Node.js 内置模块。
