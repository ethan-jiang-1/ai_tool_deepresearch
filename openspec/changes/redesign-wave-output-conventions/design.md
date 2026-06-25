## Context

当前 DPT framework 的 wave node output 约定来自 workflow-foundation 的早期原型。原来的 reference 模型是嵌套 `<topic>/source.yaml`（thin YAML metadata 数组），设计时侧重机器可读性，但缺少人类可读的"一眼看明白"维度。实际跑完 `dpt_rb_china-reaction-world-cup-2026` 后，两个问题暴露出来：

1. **reference/ 嵌套不直观**：要看清所有 source 得钻子目录、读 YAML，人类无法快速评估证据覆盖度
2. **Wave 2 产出污染 reference/**：`reference/00_shared/source.yaml` 里是 wave 2 cross-topic scout 结果（带 W2F-xxx ID），层边界模糊

对标 `deep_research_ai_cases/topics/_reference` 的成熟实践：平铺的 rich MD（metadata block + Key Facts + Core Content + Relevance + Quotable Terms + Risks），`00-shared-*` 做共享基础，`0N-*` 做 topic 专属。`_INDEX.md` 一张表格讲清楚每条 ref 的 status。

关键约束：不新增依赖，不改变 JS/MD 边界——JS 只管 schema 校验和 gate check，产出物格式和内容归 MD/Agent 管。

## Goals / Non-Goals

**Goals:**
- 重新约定 wave 0/1/2 分别产出什么、落到哪、什么格式
- `reference/` 变成扁平目录：一个 source 一个 rich MD，`00-shared-` / `00-cross-` / `0N-` 三级命名前缀
- 新增 `artifacts/wave0/` 承载 thin YAML source 列表，与 wave1/wave2 并列
- Wave 2 合成产物不再进 `reference/`，跨 topic 发现的共享 source 以 `00-cross-*.md` 追加
- `_INDEX.md` 作为 canonical reference inventory，每个 wave 更新
- 更新 phase node、gate definition、schema、inspect-bundle 与新约定对齐

**Non-Goals:**
- 不改变 wave 的 gate 阶段数量、顺序、stop 语义
- 不改变 agentic queue 的 dispatch 机制
- 不改变 seed_topics/ 的结构和 backfill token 机制
- 不改变 transition table 和 gate routing
- 不新增 npm 依赖
- 不引入新的 gate check type（只用现有的 `file_exists`、`dir_exists`、`count_floor`、`pattern_match`、`field_non_empty`、`cross_field`、`trace_event_present`、`status_value`、`schema_valid`、`yaml_parse`）

## Decisions

### D1: reference/ 三级命名前缀

| 前缀 | 语义 | 来源 | Gate 检查 |
|------|------|------|-----------|
| `00-shared-` | 共享基础，还没深挖 topic 之前建立 | Wave 0 | gate-wave0-complete: count_floor ≥ 1 |
| `0N-`（N≥1） | Topic 专属 source，编号跟 seed topic | Wave 1 | gate-wave1-complete: count_floor ≥ 1 per topic |
| `00-cross-` | 跨 topic 比对时涌现的新共享 source | Wave 2 | gate-wave2-complete: 不做 count_floor（可空，cross source 不是每次都出现） |

**备选方案**：不区分 00-shared 和 00-cross，统一用 `00-shared-`，靠 `_INDEX.md` 里 `source_layer` 字段区分 wave。被拒绝——文件名自带语义比查 index 表更直观，符合"一眼看明白"目标。

### D2: artifacts/wave0/ 目录

原来在 `reference/<topic>/source.yaml` 的 thin YAML source 列表迁至 `artifacts/wave0/<topic>/source.yaml`。这样：
- `reference/` 专一承担"人类可读 rich MD"职责
- `artifacts/` 统一承担"按 wave 组织的结构化产物"职责
- wave0 的 thin YAML 和 wave1 的 evidence-summary 同级，层结构清晰

`artifacts/wave0/00_shared/source.yaml` 承载 wave 0 的共享 source thin YAML（如果有的话）。

### D3: _INDEX.md 格式

对标 `_reference/_INDEX.md`，使用 Markdown table，列：

| Column | 说明 |
|--------|------|
| `ref_file` | 文件名 |
| `source_type` | primary/secondary/mixed/meta |
| `trust_level` | academic/practitioner/official/caution/analyst/community |
| `tier` | Tier 1-4 |
| `related_topic` | 关联 topic |
| `source_layer` | `wave0_foundation` / `wave1_topic` / `wave2_cross`（新增，区分来源 wave） |
| `acceptance_status` | accepted / accepted ⚠️ / EXCLUDED |
| `date_landed` | 文件创建日期 |

`source_layer` 列是关键新增——文件名前缀（shared vs cross）已经区分了一部分，但 index 表提供更精确的追踪。

### D4: Gate rule 变更策略

不对 gate 机制做结构性改动（不新增 check type，不改变 gate CLl 架构）。变更方式：

- **gate-wave0-complete**：`dir_exists: reference/01_*` 系列 → `count_floor: reference/00-shared-*.md` + `file_exists: artifacts/wave0/<topic>/source.yaml`（用 `{topic}` 展开）
- **gate-wave1-complete**：新增 `count_floor: reference/0N-*.md` per topic（不含 00- 前缀），保留 artifacts/wave1/ 检查
- **gate-wave2-complete**：移除 `reference/00_shared/source.yaml` 相关 rule，保留 artifacts/wave2/ 三件套检查

wave2 gate 不做 `count_floor: 00-cross-*.md`——cross source 不是每次 run 都会出现（取决于 cross-topic scan 是否有实质发现），不应作为 gate pass 的硬条件。

### D5: Schema 变更

`schema/contracts/reference.mjs` 当前校验 `reference/<topic>/source.yaml` 的 YAML 数组。新约定下：
- thin YAML 仍在，只是搬到 `artifacts/wave0/`，ReferenceMetadataSchema 继续适用于 thin YAML
- 新增 `_INDEX.md` 的轻量校验（表头完整性、至少 1 行数据），不校验 rich MD 内部字段（内容归 Agent 管）

可选新增 rich MD 的 metadata block 字段定义（Zod schema），作为 shared-reference-template.md 的配套规范，但不作为 gate check 硬条件。

### D6: 现有 bundle 迁移

`dpt_rb_china-reaction-world-cup-2026` 需要手工迁移：
1. `reference/<topic>/source.yaml` → `artifacts/wave0/<topic>/source.yaml`
2. `reference/00_shared/source.yaml` → `artifacts/wave2/00_cross_topic_sources.yaml`（wave2 内容，不重写成 rich MD——这是已有 run 的产物，不做回填）
3. 创建 `reference/_INDEX.md`（从 `reference/index.md` 派生表格格式）
4. 创建 `reference/README.md`

迁移是 change 实现的一部分，但不 block 框架改动——框架改动先做，然后对已有 bundle 执行迁移。

## Risks / Trade-offs

- **[Risk] Wave0 gate 从 `dir_exists reference/<topic>/` 改为 `file_exists artifacts/wave0/<topic>/source.yaml` 后，已有 disposable bundle 的 wave0 实验 playbook 会 fail** → Playbook 用的 disposable bundle 每个实验重建，不受影响；已有的 exp 目录若需要可通过 `_INDEX.md` 校验保持兼容
- **[Risk] 00-shared 和 00-cross 文件名冲突** → slug 由 Agent 生成，Agent 被 phase node 指令约束为生成 unique slug；gate 不做硬去重（语义职责归 Agent）
- **[Risk] `_INDEX.md` 内容与 rich MD 文件不一致** → `_INDEX.md` 被视为 canonical inventory，phase node 指令要求 Agent 在写完/改完 reference 文件后立即更新 `_INDEX.md`；gate 不交叉校验二者（语义职责归 Agent，gate 只做结构性检查）
- **[Risk] Gate engine `count_floor` 当前只支持 YAML 文件内数组条目计数，不支持 glob 文件匹配** — Wave0 gate 需要对 `reference/00-shared-*.md` 做 count_floor，Wave1 gate 需要对 `reference/0N-*.md` 做 count_floor。→ 实现时可能需要扩展 gate checker CLI：增加 glob-based 文件计数模式（检测 target 含 `*` 时走 readdir + 文件名匹配，而非 readYamlArray）。备选方案：用 `file_exists` + `{topic}` expansion 替代（验证每个 topic 至少存在一个匹配文件，不做精确计数）。

- **[Trade-off] reference/ 纯平铺 vs 子目录分组** → 选平铺。对标 `_reference` 已有的 115 个文件在平铺下仍然可管理；topic 数量天然受限于 plan 设计（通常 5-10 个），文件名前缀本身就提供了分组信号

## Migration Plan

1. **Phase node 更新**：改 `phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`、`phase-wave2-subagent.md` 的 Expected Artifacts 节
2. **Gate definition 更新**：改 3 个 wave gate JSON
3. **Schema 更新**：改 `reference.mjs`，新增 `_INDEX.md` 轻量校验
4. **inspect-bundle.mjs 更新**：加 `artifacts/wave0/`，更新 `reference/` 检查
5. **INSTANTIATION 模板更新**：`START_FROM_HERE.md.tmpl` 反映新结构
6. **新增 shared-reference-template.md**：reference `.md` 文件标准格式
7. **现有 bundle 迁移**：`dpt_rb_china-reaction-world-cup-2026/` 执行目录重组
8. **运行验证**：`node DPT_FRAMEWORK/cli/validate-bundle.mjs` + `inspect-bundle.mjs` 对迁移后 bundle 通过

回滚策略：framework 改动都是文本改动（MD/JSON/mjs），git revert 即可。bundle 迁移在独立 commit 之后做，不与 framework 改动混在同一个 commit。

### D7: Phase-internal structural lint as three independent CLIs

新增三个独立 CLI——`inspect-wave0-output.mjs`、`inspect-wave1-output.mjs`、`inspect-wave2-output.mjs`——各自只检查自己 wave 的输出约定。关键设计决策：

- **三个独立 CLI，非一个统一工具**：不需要读 `rb_status.json` 判断 wave context，不需要继承逻辑。Agent 在 wave N 中途跑 `inspect-waveN-output.mjs`。耦合为零——改 wave 0 检查不影响 wave 1/2。
- **不重复检查**：`inspect-wave1-output.mjs` 不重复 wave 0 的检查（如需全量检查，依次跑三个 CLI）。这意味着 wave1/wave2 不检查低 wave 的约定——如果 Agent 在 wave 1 意外创建了 `00-shared-*` 文件，inspect-wave1 不会发现。反制靠 phase node 的 Anti-Cheating Rules：wave1 禁止声称产出 `00-shared-*` 前缀的文件，wave2 禁止写入 `reference/00_shared/`。如果未来需要跨 wave 污染检测，可新增一个 `inspect-reference-coherence.mjs` 做全量交叉校验。
- **无 escalation path**：inspect CLI 不是 gate——没有 3-attempt 上限或 escalation 逻辑。如果 Agent 遇到修不了的结构问题，应由 Agent 自己判断 escalation（block、defer、请求 human input）。这不会导致死循环，因为 Agent 可以在多次失败后自主决定 escalation。
- **Section header 检查大小写敏感**：精确匹配 `## Key Facts`（不是 `## Key facts`）。与 gate `pattern_match` 的 `i` flag（大小写不敏感）不同——inspect 作为 lint 工具，应强制一致格式。`shared-reference-template.md` 应使用精确的 header 名称作为正典。
- **独立 CLI，不是 gate**：gate 做 pass/fail、控制 phase 前进、写 trace。这三个工具纯反馈——输出 inspect/advice JSON，不含 routing，不写 trace。
- **实验友好**：可以单独对 wave 0 输出做单元测试，不需要构造完整的 wave 1/2 状态。

**备选方案**：把新检查类型加进每个 gate CLI。被拒绝——gate 只在 phase 边界跑，Agent 在 wave 中间需要反馈但不愿意跑完整 gate（耗时、写 trace、语义不对）。

## Open Questions

- 无——wave 输出物约定已在 plan 对话中与用户充分对齐
