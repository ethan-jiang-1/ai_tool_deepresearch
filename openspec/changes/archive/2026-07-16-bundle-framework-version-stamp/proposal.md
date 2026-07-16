## Why

BUG-090 与 BUG-091 经核查均为 **cross-version skew（跨版本偏移）产物**，当前版本不复现（详见已归档的 BUG-090/091 + memory `bug-090-091-version-skew-closure`）。

诊断它们时暴露一个**底层缺口**：**bundle 不记录自己诞生时的框架版本**。`rb_status.json` 无版本；`rb_plan.md` frontmatter 只有 `topic_registry_version:"2"`。于是跨版本偏移**无从知晓**——拿到一个 bundle，无法回答"它是哪个框架版本造的"，只能事后从一堆格式失败里反推。

本 change 只补这一件**最窄、最确定**的事：**记录 bundle 诞生时的框架版本**（一个不可重建的 provenance 事实）。

**明确不做什么（诚实边界）**：
- **不主动 surface skew**——不发射 advisory/警告/proactive 信号。原设计的 reentry advisory 经核查**放错位置**（`check-reentry` 只覆盖 post-final 恢复，不覆盖标准 rerun=BUG-090 路径），且 non-blocking advisory 价值 marginal、可被绕过。**主动 skew 信号需要"该在哪触发"的专门设计，不在本 change**；先把不可重建的事实落下作地基。
- 不建迁移机器、不放宽 gate（老 bundle 由人决定重跑）。

## What Changes

- **bundle 创建期盖 `framework_version` 戳**：`instantiate-run-bundle` 在创建 bundle 时把 `framework_version` 写入 `rb_plan.md` frontmatter（挨着既有 `topic_registry_version`），取自 `version-management` 已立的 CHANGELOG 版本权威（VEM-001），**不另立版本字符串**。
- 戳经 `rb_plan` 重写（如 rerun `add_topic`）自动保留（`CanonicalPlanSchema` 是 `.passthrough()`，已核实）。

就这样。无 advisory、无新 CLI、无新 gate 规则、无迁移。

**价值定位**：provenance 地基——任何读 `rb_plan` 的既有工具（`validate-bundle` 的 `PlanSchema`、`inspect-bundle`、reentry 的 `readBundlePlan`）都能看到该 bundle 的诞生版本；未来"正确放置的 skew 信号"建立在此之上。本 change **不声称**让 skew 被主动看见或预防 bypass。

**Version bump**：**v0.30**（修改 `instantiate-run-bundle.mjs` 创建行为；按 VEM-002 更新 CHANGELOG、VEM-003 同步 RUN.md 横幅）。

## Capabilities

### New Capabilities

（无。bundle 创建已有 `cmd-bundle-instantiation`。）

### Modified Capabilities

- `cmd-bundle-instantiation`：新增——`rb_plan` 模板 SHALL 在创建期盖 `framework_version` 戳（挨着既有 `topic_registry_version`），取自 VEM-001 的 CHANGELOG 版本权威（不可重建的诞生版本事实）。

> 放置理由：版本**字符串**权威属 `version-management`（被引用、不新增 requirement）；盖戳是创建动作 + 模板契约，属 `cmd-bundle-instantiation`（CMI-006 已有"模板 SHALL include 字段"先例）。

## Impact

**Direct Source of Record**

- CHANGELOG 最新条目（VEM-001 已立）：**当前框架版本权威**。
- `rb_plan.md` frontmatter 的 `framework_version`：**该 bundle 诞生版本**的不可重建事实（irreplaceable provenance）。

**净简化**

- 补一个本就该有、却缺失的不可重建事实；**不新增 validator / gate / advisory / CLI / migration / 第二成功路径**。
- 删除"跨版本偏移无从知晓"的盲区；不引入任何新控制复杂度。
- 通过 `evolution-simple-reliable-control` 的 Simplicity Admission Test 与 Complexity Burden（见 design.md）。

**Affected surfaces（实现期）**

- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` + `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl`：创建期把 `framework_version` 写入 `rb_plan.md` frontmatter。
- 版本读取：从 CHANGELOG 最新 `## vX.Y` 条目解析当前版本（复用 VEM-001 权威）。
- `CHANGELOG.md` / `RUN.md` → **v0.30**（VEM-002 / VEM-003）。
- `openspec/governance/req-registry.yaml`：登记 **CMI-007**（实现前写入；编号已查无冲突：现 max 为 CMI-006）。
- focused test：戳在创建期写入等于 CHANGELOG-latest；经 `add_topic` 重写后保留。
