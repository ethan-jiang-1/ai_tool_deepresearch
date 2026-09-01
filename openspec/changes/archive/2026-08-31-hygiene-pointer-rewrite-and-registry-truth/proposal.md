# Proposal: hygiene-pointer-rewrite-and-registry-truth

来源：`_backlog/plans/drift-resync-locks-hygiene-and-work-unit-deepening.md`（C3，§2.4 D 类 + §2.3 C2 项 + §2.5 形状 B 判定；H5 与场景墙表格化两项按执行期裁定缓期，见 design Open Questions）。

## Why

跨 spec 复述是漂移乘数（D4 已实际漂移、D9 示例串已分叉、D2 的 registry 行与 AGO 正文口径不一）；RWP 两条 Engine-rule requirement 近逐字复述 WPG-015/WTS-012；gate-skeleton 的士气编码规则与 cli-exit-code-conventions 成对重复（规则+同名 scenario）；registry 账本有两处未注册 heading（RRM-008/CTS-012）与两个死 ID（RWP-005/008，全仓零锚点经考古证实）。C1/C2 已装好词汇锁与 checker——现在做大扫除是安全的。

## What Changes

- `research/research-wave-phase-content`（RWP，3 个 requirement 重写为 owner 指针）：
  - "Rerun action:add SHALL include full cache trail"：return-map 字段清单改为 RRM 所有权指针；no-projection 处置示例对齐 RRM 规范形（消除 D9 示例串分叉）。
  - "Work unit index record SHALL carry Engine-owned rerun_count" → WPG-015 指针（教学义务保留，字段契约不再复述）。
  - "Wave2 finding SHALL carry created_in_rerun_count" → WTS-012 指针。
- `engine/gate-skeleton`（GSK-009）：删除与 CLE-002 成对重复的士气编码规则段与同名 scenario "High-friction pass keeps pass code"（标题按 house retention 模式保留、正文改为 convention 归属），保留 gate 专属 0/1/2 映射。
- **registry 账本手术**（apply 期直编辑，无 delta）：注册 RRM-008（"Template and command guidance SHALL preserve separate Seed Topic questions"）与 CTS-012（"Canonical reference binding SHALL resolve exact UID subsets"）并补两篇 header `> req:`；RWP-005/008 标 `[DEPRECATED]` 并移出 RWP header（考古：全仓正文/phase node 零锚点）；AGO-006 registry 松散标题与 AGO 正文 "SHALL verify" 口径对齐（D2）。
- **不产出（执行期裁定，见 design Open Questions）**：场景墙表格化（RRM 59/CTS 38/RWG 23——scenario 块无表格化先例，逐例语义合并另立 explore）；H5 IOC 字段清单收敛（复核后发现三处已是"same shared finding projection"特化表述并自带指针，非逐字复述，维持现状并记录）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `research/research-wave-phase-content`：3 个 requirement 正文改为 owner 指针（教学义务保留；scenario 标题全保留）。
- `engine/gate-skeleton`：GSK-009 去重（行为所有权让渡给 cli-exit-code-conventions，gate 专属映射保留）。

### Excluded（apply 期直编辑，无 delta）

- `agent/work-unit-provenance-gate`、`research/wave2-synthesis`、`research/research-return-map`、`research/canonical-topic-state`、`agent/agent-output-declaration`：作为 owner/被指针对象，requirement 文本零变化；仅 registry 行增补/对齐。
- `openspec/governance/req-registry.yaml`、`openspec/specs/README.md`：治理账本，非 spec。

## Capability Discovery

Evidence read：五个涉改 main spec（RWP/GSK 全文、RRM/CTS/AGO 关键区域）+ `req-registry.yaml`（RWP-005/008、RRM-007、CTS-011、AGO-006 行）+ 全仓 archaeology（future expansion / gap-fill 零命中）。

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/research-wave-phase-content` | :481-566、:1054-1088 三块 + registry RWP 行 | Modify | 三个 requirement 正文指针化（requirement 级变化须走 delta） |
| `engine/gate-skeleton` | GSK-009 块 :658-695 + `cli-exit-code-conventions` CLE-002 | Modify | 去重属 requirement 正文变化 |
| `agent/work-unit-provenance-gate` | WPG-015 既有正文 | Excluded | 作为指针 owner，requirement 文本零变化 |
| `research/wave2-synthesis` | WTS-012 既有正文 | Excluded | 同上 |
| `research/research-return-map` | :879 heading + RRM-007 行 | Excluded | 仅 registry 注册 RRM-008 + header 行，requirement 文本零变化 |
| `research/canonical-topic-state` | :876 heading + CTS-011 行 | Excluded | 仅 registry 注册 CTS-012 + header 行 |
| `agent/agent-output-declaration` | AGO-006 正文与 registry :147 行 | Excluded | 仅 registry 松散标题对齐正文口径，spec 文本零变化 |

## Impact

- 2 个 main spec 的 requirement 块重写 + 2 个 header `> req:` 行 + registry 4 处；零代码。
- 文本锁测试扩展；governance:check 全绿；npm test 全绿。
