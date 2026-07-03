## 0. Requirement Traceability

- [x] 0.1 在 `openspec/governance/req-registry.yaml` 中注册 `run-entry` capability（RUE-001、RUE-002、RUE-004；RUE-003 标记为迁移到 VEM 的 deprecated ID）和 `version-management` capability（添加 `VEM` prefix 映射，分配 VEM-001 到 VEM-004）
- [x] 0.2 确认 delta spec 文件头部包含对应的 `> req:` 行（`run-entry`: RUE-001, RUE-002, RUE-004；`version-management`: VEM-001, VEM-002, VEM-003, VEM-004）

## 1. RUN.md — 版本横幅 + Section 0

- [x] 1.1 在 RUN.md 标题后插入版本横幅 `> **DPT_FRAMEWORK v0.1**` @impl RUE-001
- [x] 1.2 将 RUN.md 顶部顺序整理为：标题 → 版本横幅 → `## 0. 禁用内置捷径（最高优先）` → 原 trigger-context blockquote → 原 Section 1 @impl RUE-001, RUE-002
- [x] 1.3 在 Section 0 中使用条件-动作句式，指示 agent 若存在 `deep-research` skill 或等价 research shortcut 则不要调用，并继续走 Section 2 的 DPT_FRAMEWORK flow；文案不声称平台级 tool 禁用 @impl RUE-002

## 2. 同步强化 CLAUDE.md / AGENTS.md / README.md

- [x] 2.1 强化 `DPT_FRAMEWORK/CLAUDE.md` 第一优先 block：将"默认走框架"改为明确的内置 research shortcut 覆盖指令 @impl RUE-004
- [x] 2.2 同步 `DPT_FRAMEWORK/AGENTS.md`：与 CLAUDE.md 保持一致的 skill 禁用措辞 @impl RUE-004
- [x] 2.3 强化 `DPT_FRAMEWORK/README.md` 触发规则部分：引用 RUN.md Section 0 的 skill 禁用指令 @impl RUE-004

## 3. CHANGELOG.md

- [x] 3.1 在项目根目录创建 `CHANGELOG.md`，以简洁格式记录 `## v0.1`（版本号 + 一两句说清改了什么，不枚举文件/ID/细节） @impl VEM-001
- [x] 3.2 确认 RUN.md 版本横幅与 CHANGELOG 最新版本条目一致 @impl VEM-003

## 4. OpenSpec workflow guidance

- [x] 4.1 更新 `openspec/config.yaml` proposal rules：修改 `DPT_FRAMEWORK/` 行为的 change 必须声明是否需要 version bump；需要时声明 target version @impl VEM-004
- [x] 4.2 更新 `openspec/config.yaml` tasks rules：修改 `DPT_FRAMEWORK/` 行为且需要 version bump 时，必须包含 CHANGELOG 更新步骤；更新 CHANGELOG 时同步检查 RUN.md banner @impl VEM-002, VEM-003

## 5. 收尾检查

- [x] 5.1 运行 `openspec validate harden-run-entry --strict`，确认 change artifact 仍然 valid
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs`，确认 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs`，确认 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader
- [x] 5.4 用 `rg` 或等价检查确认 RUN.md、CLAUDE.md、AGENTS.md、README.md 均包含对应版本/覆盖指令，RUN.md 顶部顺序符合 RUE-001/RUE-002，CHANGELOG.md 符合 VEM-001 简洁格式，`openspec/config.yaml` 包含 VEM-002/VEM-004 的 proposal/tasks 提示
