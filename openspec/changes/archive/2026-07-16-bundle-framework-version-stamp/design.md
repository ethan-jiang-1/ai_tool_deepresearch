## Context

当前 bundle 不记录自己诞生时的框架版本：

- `rb_status.json` keys：`bundle / current_mode / state / current_gate / next_gate / current_node`——无版本。
- `rb_plan.md` frontmatter：只有 `topic_registry_version:"2"`——无 framework version。
- 框架版本字符串唯一存在于 CHANGELOG 最新条目 + RUN.md 横幅（VEM-001/VEM-003 已立为权威），**代码里无独立 version 常量**。

后果：跨版本偏移（BUG-090 / BUG-091）**无从知晓**——拿到一个 bundle 无法回答"它哪个版本造的"，只能从一堆格式失败反推。

约束：OpenSpec propose 阶段只改 change artifacts；apply 才动 `DPT_FRAMEWORK/`。无新 npm 依赖。严格遵守 `evolution-simple-reliable-control` 与 `evolution-helper-oriented-agent`。

## Goals / Non-Goals

**Goals:**

- bundle 创建期写入 `framework_version`（不可重建的诞生版本事实）。

**Non-Goals:**

- **不主动 surface skew**（无 advisory / 警告 / proactive 信号）——见 Decision 2。
- 不为老 artifact 提供迁移路径、migration CLI、`legacy_unbound` 语义、`--topics` delta gating。
- 不放宽/豁免/新增任何 content gate 规则。
- 不新增版本字符串权威（复用 VEM-001 的 CHANGELOG）。

## Decisions

### Decision 1: 戳写在 `rb_plan.md` frontmatter，版本取自 CHANGELOG 最新条目

- **位置**：`rb_plan.md` frontmatter（与既有 `topic_registry_version` 同处）。理由：creation manifest、语义稳定（只在 `add_topic` 等 topic 变更时重写，不像 `rb_status.json` 每 transition 重写）；既有 reader（`validate-bundle` 的 `PlanSchema`、`inspect-bundle`、reentry 的 `readBundlePlan`）都读 `rb_plan`，戳天然可被读到，不新增读取范式。
- **版本来源**：解析 CHANGELOG 最新 `## vX.Y` 条目（已核实格式确为 `## vX.Y`，如 `## v0.29`）——VEM-001 已立的权威。**不**解析 RUN.md 散文，**不**新建 version 常量（One Rule Source）。已核实代码当前无 version-reader——本 helper 是框架**首个**程序化版本读取，后续版本读取复用它，避免第二份 parser。
- **Schema**：`framework_version` 作为可选元数据由 `CanonicalPlanSchema`/`LegacyPlanSchema` 既有 `.passthrough()` 携带，**不在 `PlanBaseSchema` 显式声明**（化繁从简 + 与既有非严格元数据一致；无需动 `plan.mjs`）。代价：若日后把 schema 收紧为 `.strict()`，戳会被静默丢弃——收紧者须同步把 `framework_version` 显式声明（已记 Risks）。
- **保留（已核实自动）**：`rb_plan.md` 唯一重写者是 `canonical-topic-state.mjs`（`add_topic`）；`CanonicalPlanSchema` 为 `.passthrough()` + `buildMutation` 携带 `current` + `renderPlan=stringifyYaml` 序列化全部 key → 戳自动保留，无需改 schema。`apply-research-style.mjs` 只写 `rb_profile.yaml`。

### Decision 2: 不做 proactive skew 信号（scope 纪律）

本 change **不**发射任何 advisory/警告。理由（留痕，免得重复踩）：

1. **放对位置很难**：原想放 `check-reentry`（RRD），但经核查 **`check-reentry` 只覆盖 post-final 恢复，标准 rerun（HITL2→phase-rerun→rerun-ready gate，即 BUG-090 路径）根本不调用它**——advisory 会整个漏掉目标 bug。标准 rerun 是正常 state-machine 分支，不是 RRD 意义的 reentry。
2. **价值 marginal + 可绕过**：non-blocking advisory 不减少级联（只加上下文），且比已被绕过的 gate 还软；BUG-090 的伤害恰恰是绕过 gate，advisory 挡不住绕过者。
3. **正确触发点未定**：rerun-ready gate（覆盖标准 rerun，但 home 散在 gate-skeleton/post-final-recovery）、enter-phase（universal 但每 phase 都 emit）——各有取舍，需专门设计。

→ 与其第四次挪 placement 硬塞一个 fragile 信号，**先把不可重建的事实落下作地基**；主动 skew 信号留给一个专门做"该在哪触发"的后续 change。这最符合化繁从简 + "搞对了再做"。

### Decision 3: 不建迁移机器

老版本 bundle：人若想推进，自行重跑 fresh。框架不提供自动迁移、不保留"老格式也合法"的第二成功路径（`simple-reliable-control` Anti-Patterns + Default Rejection Triggers）。

### Capability 归属

仅 `cmd-bundle-instantiation` **ADD CMI-007**（盖戳是创建动作 + 模板契约；CMI-006 已有"模板 SHALL include 字段"先例）。版本字符串权威属 `version-management`（被引用、不新增 requirement）。经核查 genuinely additive（CMI 现仅 CMI-001..006 不含创建版本戳）。

## Guideline Admission Tests（apply 前必答）

### Simplicity Admission Test（`evolution-simple-reliable-control`）

1. **最短合法闭环 + 直接 Source of Record**：创建期写 `framework_version`（SoR = CHANGELOG 最新条目，VEM-001）。直接事实 = 戳字段 + CHANGELOG 版本。无下游动作。
2. **删除/合并/避免了哪份复杂度**：补一个不可重建事实（诞生版本无法从 artifact 反推）；**不新增任何控制复杂度**（无 validator/gate/advisory/CLI/migration）。是"不可避免的确定性底线"——该事实缺失即盲区。

### Complexity Burden Of Proof（新持久字段 `framework_version`）

1. **捕获哪个现有 direct check 无法捕获的真实故障**：跨版本偏移的可诊断性——content gate 只查内容，不查 provenance-version；偏移目前只能事后反推。
2. **读取/拥有哪个 Source of Record**：该 bundle 诞生时的框架版本。
3. **为何不能复用现有 checkpoint**：无任何现有记录该事实；这是 provenance 维度，content gate 不覆盖。
4. **删除/合并/降级了哪份旧逻辑**：把"事后从 N 条格式失败考古诞生版本"的隐性诊断，降级为"读一个字段"。
5. **失败时给 Agent/人的唯一最近动作**：N/A——戳是 Engine 创建期写入，无 failure 路径（CHANGELOG 不可解析时写 `"unparseable"`，不阻断创建）。
6. **哪个 focused test 证明不会误阻塞**：N/A——戳是 inert provenance、非 control，不参与任何 gate/阻断，by construction 无 mis-block 风险；耐久性（重写后保留）由 test 3.2 证明。

### Helper Direction Review（`evolution-helper-oriented-agent`）

本 change **不引入任何 Agent/user 动作**（纯 Engine 创建期写一个字段，无 advisory、无 escalation）。因此 Helper Review 平凡满足：无机械工作被推给人，无越权，无新 decision boundary。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `rb_plan.md` 在 `add_topic` 等场景被重写时丢戳 | **已核实非风险**（机制见 Decision 1）：canonical-topic-state passthrough 自动保留；apply-research-style 只写 profile。test 3.2 防回归 |
| CHANGELOG 解析版本脆弱（格式漂移） | 解析最新 `## vX.Y` heading（已核实格式）；解析失败时戳写 `"unparseable"`，不阻断创建 |
| 戳当前无 proactive reader（"unused state" 之嫌） | 非问题：戳是 irreplaceable provenance（非 derived），且被既有 `rb_plan` reader（validate/inspect/readBundlePlan）读到；是地基，主动信号是独立后续 change |
| 未来有人把 `CanonicalPlanSchema` 收紧为 `.strict()` 会静默丢戳 | 已在 Decision 1 记录 passthrough 依赖；收紧者须同步声明 `framework_version` |

## Migration Plan

1. Propose：本 design + delta + tasks（只读 `DPT_FRAMEWORK/`）。
2. Apply：`instantiate-run-bundle.mjs` + `rb_plan.md.tmpl` 写戳 → focused tests → CHANGELOG/RUN.md v0.30 → registry。
3. 老 bundle（无戳）：无行为变化（无 advisory、无阻断）；其诞生版本保持未知，符合"老 bundle 不管"立场。

## Open Questions

1. `framework_version` 字段名 vs 复用更广义的 `created_under_framework_version`？（默认：**`framework_version`**，简短且与 RUN.md 横幅语义一致。）
