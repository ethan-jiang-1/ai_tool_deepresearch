## Why

当前 HITL1 让用户选了研究画像（快速事实 / 探索地图 / 说法验证），写入了 `rb_profile.yaml`，gate 也验证了它不为 `not_selected`——**但选了画像之后什么都没变**。不管选什么画像，Wave 0 gate 要求 1 条 reference，Wave 1 gate 要求 1 条 reference，不卡质量，不追踪核心问题。画像选了等于没选，研究"几圈就跑完"。

V12 原版用三个研究画像定义了"跑到什么程度算够"——不同画像对应不同的 reference 数量要求、质量门槛、搜索深度和交付姿势（详见 `_backlog/done/_old_topics/_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/specs/RESEARCH_PROFILES.md` 的画像 floor 公式和 `METHODOLOGY.md` 的 Stop Conditions + 证据质量阶梯）。这是非常好的 UX 设计：用户不需要理解公式，只需要说"我想验证说法"，系统就知道该挖多深。

本 change 把 V12 的研究画像概念落地到当前框架——不用公式，用具体参数值；用 JSON 文件做 JS 读取的单一数据源。

## What Changes

- 建立 4 种研究风格，每种一个 JSON 文件（`DPT_FRAMEWORK/schema/research-styles/`），定义具体参数：Wave 0/Wave 1 floor、topic-unique ratio、counterexample 搜索、交叉验证、P0/P1 独立来源数、质量门槛等
- **debug**（对用户隐藏）——极低要求，开发测试用；**quick_factual** / **exploratory_map** / **claim_verification**（对用户可见）——从 V12 公式反推的默认参数值
- Profile schema 扩展，支持存储画像对应的参数集（`rb_profile.yaml` 新增 `research_style_params` section）
- HITL1 流程更新：用户选画像后，Agent 运行 `apply-research-style.mjs` 把对应 JSON 风格文件的参数写入 `rb_profile.yaml`
- Gate CLI（wave0-complete、wave1-complete）读 profile 里的动态阈值，替代硬编码 `threshold: 1`
- Phase MD（wave0、wave1）明确引用画像的具体数字和 Stop Conditions checklist
- `gate-helpers.mjs` 新增 `readBundleProfile()` 公共函数
- Rerun 路径：HITL2 rerun → `phase-rerun` 调整 topic → 重跑 `apply-research-style.mjs` 确保参数与 topic_count 一致（同一种 style，同一个 CLI，参数路径贯通）

另外在实施后的实际运行中发现：Wave1 Count-Floor Re-Fill Loop 产出大量占位符 reference（`source_url: example.com`），排查时想回看 Sub-agent 的原始网络抓取内容来诊断——但 `_cache/` 完全是空的。网络获取内容很昂贵（搜索限速、多级降级链），原始页面是诊断 reference 质量、排查幻觉的唯一依据，必须系统化保存。

## Capabilities

### New Capabilities
- `research-styles`: 研究风格体系——JSON 定义的风格参数文件，Profile 作为单点真相传递参数，Gate CLI 和 Phase MD 各自读取
- `cache-raw-web-content`: 网络原始内容缓存——`_cache/` 标准化目录结构（wave/batch/scope/source 四级），spawn prompt 机制传递路径，source-slug 与 reference 文件可互查

### Modified Capabilities
- （无。不改变已有 spec 的需求——profile、gate、phase MD 的现有行为只是**增加**画像依赖的参数读取，不修改已有 requirement 的语义。）

## Impact

- `DPT_FRAMEWORK/schema/research-styles/`（新增 4 个 JSON）
- `DPT_FRAMEWORK/schema/contracts/profile.mjs`（ProfileSchema 加 `research_style_params`）
- `DPT_FRAMEWORK/schema/enums.mjs`（ResearchProfile enum 加 `debug`）
- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json`（count_floor rule 加 `threshold_source`；新增 `no_example_com_shared_ref_url` rule）
- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json`（count_floor rule 加 `threshold_source`；新增 `no_example_com_ref_url` rule）
- `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs`（新增 `readBundleProfile()`；`resolveThreshold()` 函数）
- `DPT_FRAMEWORK/engine/subagent-relay.mjs`（`buildSpawnPrompt()` 加 `cacheDir` 参数）
- `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`（count_floor 用动态阈值；新增 `pattern_match` 处理器含 glob 支持）
- `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs`（同上；`pattern_match` 加 glob 支持）
- `DPT_FRAMEWORK/cli/inspect-wave0-output.mjs`（新增占位符 source_url 检测；修复 `parseMetadataBlock` YAML frontmatter 解析）
- `DPT_FRAMEWORK/cli/inspect-wave1-output.mjs`（同上）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`（HITL1 流程加参数抄写）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`（引用画像的具体 floor 数字；suppl task card 加占位符禁令和 cache 路径）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`（同上 + Stop Conditions checklist；suppl task card 加占位符禁令、post-drain 检测、cache 路径）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`（task card action 加 cache 路径）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0-subagent.md`（cache 路径说明更新）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1-subagent.md`（同上）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2-subagent.md`（同上）
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`（`_cache/` 目录结构更新为新设计）
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`（`_cache/` 条目更新）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md`（topic 变更后重算参数）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`（rerun-aware 模式同步 topic_registry）
- `DPT_FRAMEWORK/rb_templates/rb_profile.yaml.tmpl`（模板加默认 `research_style_params` section）
- `DPT_FRAMEWORK/rb_templates/_cache/README.md.tmpl`（新增：cache 结构自解释模板）
- `DPT_FRAMEWORK/rb_templates/_logs/README.md.tmpl`（新增：logs 结构自解释模板）
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`（template copy list 加 `_cache/README.md` 和 `_logs/README.md`）
- `experiments_playbook/exp_wff_wave-gates/case-125-light-dynamic-threshold.md`（实验：动态阈值边界验证）
- `experiments_playbook/exp_wff_wave-gates/case-126-light-style-switch.md`（实验：style switch 证明阈值驱动 gate 行为）
