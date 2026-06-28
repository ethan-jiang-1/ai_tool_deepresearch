## Why

当前 HITL1/HITL2 把用户交互当成线性问卷来做——用户要逐一回答 5 个开放式问题，敲大量文字，没有简单的字母选择，没有"我不确定"的优雅降级路径。V12 用字母菜单（A/B/C）+ 一句话 must-answer + 可选偏好带例子的方式把交互打磨得很轻量，但这个设计在当前框架中完全丢失了。更进一步，HITL 的本质不是问卷——是一个用户可以打转、探索、问 BTW 问题、得到帮助后再做出决定的**环**（loop）。当前实现和 V12 都没有做到这点。

更根本的 UX 问题是：整个研究运行中，用户只应该在 3 个点感知到系统——2 个交互式决策点（HITL1、HITL2）+ 1 个交付点（Final）。其余阶段（尤其是长程 wave0/1/2）必须完全静默自主，绝不浮出水面。当前系统没有明确这个契约——系统可能在 wave 中间莫名其妙停下来等人说"我知道了，继续"，用户不在就永远卡在那。用户的核心期望很简单：**"别问我，直接干完就好。"**

来源：`_backlog/todo-hitl-ux.md`

在注册 HIU-* 和 SWE-* 时暴露出一个基础设施问题：`req-registry.yaml` 有 19 个合成组头不映射 spec 目录、8 个前缀的 ID 碎片化在 3-4 处——以至于 `silent-wave-execution` 起初被混入 `hitl-ux` spec，因为两个都被笼统归为 "UX 相关"。根因是项目缺少 capability 边界测试和 registry 自文档化机制。这个治理问题会在任何新 capability 上重演——本 change 是最好的修复切入点。

## What Changes

- 定义整体 UX 愿景：3 个浮出水面点——2 个交互式决策点（HITL1、HITL2）+ 1 个交付点（Final），其余全部静默自主
- 定义静默阶段的 Agent 行为契约：wave0/1/2 绝不浮出水面，遇错自动重试/降级/记 trace 继续，用户可关终端（独立 capability `silent-wave-execution`）
- 设计 HITL 出口语模板：HITL1 出口告知用户即将进入静默自主阶段（时长不定、可关终端、下次见面是 HITL2）；HITL2 出口告知用户即将生成最终报告
- 创建 `shared-agent-ux-guidance.md`：定义 HITL 环的交互模型（入口 → 环内行为分类 → 出口条件 → 防无限环轻推策略）+ HITL 对话约定（中文优先、字母菜单、enum 不可见、"我不确定" 路径、BTW 问题处理）
- 创建 `shared-silent-execution.md`：定义静默阶段不浮出水面纪律（降级优先级链、repair escalation 冲突覆盖、降级期间 state 规则、用户主动消息处理规则）——与 HITL 环 UX 分属两个文件，wave phase 只加载此文件，HITL phase 只加载 UX guidance
- 创建 `brief/` 目录（`nodes/brief/`）：`hitl1.md` + `hitl2.md`——每个 HITL 的精确用户 prompt 文本（标注模板 vs Agent 动态填入部分）+ 出口语模板。不共享，各 phase 按需读取
- 更新 `phase-hitl1.md`：requires 添加 `shared-agent-ux-guidance`，suggested_context 指向 `brief/hitl1.md`，§3b 替换 "见下方 checklist" 为引用 brief + 环的行为指引
- 更新 `phase-hitl2.md`：requires 添加 `shared-agent-ux-guidance`，suggested_context 指向 `brief/hitl2.md`，加入语境叙事生成指引、A/B/C/D/E 字母映射、展示前写 durable state 指令，修正 "4 个选项" 计数错误
- 更新 `phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`：requires 添加 `shared-silent-execution`，正文加入显式静默提醒，Actions 节加入 `search_preference` 下游使用指引
- 修正 `shared-profile.md` 中的字段名 drift
- 更新 `manifest.json`：注册两个新 shared 文件
- 改进 `openspec/governance/req-registry.yaml` 组织：添加 `prefixes:` 自文档化缩写映射，重组为单 capability 单组（吸收 delta、归位孤立 ID），字母序排列
- 在 `openspec/config.yaml` 中固化 capability 边界测试和 registry 组织约定——防止未来 capability 边界再次模糊

## Capabilities

### New Capabilities
- `hitl-ux`: HITL 对话环的 UX 约定与 prompt 模板——定义入口展示、环内行为、出口条件、防无限环策略、用户 prompt 的精确文本、以及 HITL 出口语。
- `silent-wave-execution`: 静默自主执行合同——Agent 在 wave0/1/2 阶段绝不浮出水面，遇错自行重试/降级，用户可关终端从 durable state 恢复。wave phase MD 通过 `requires` 加载行为纪律。
- `requirement-traceability`: 需求追踪基础设施的治理契约——`prefixes:` 自文档化缩写映射、单 capability 单组、边界测试、排序与废弃规则、check 脚本硬性 gate。本 capability 的 requirement 在本次 change 中同步实现（config.yaml + req-registry.yaml 重组）。

### Modified Capabilities
无已有 capability 的 requirement 被修改。本 change 新增 3 个 capability 的 delta spec（`hitl-ux`、`silent-wave-execution`、`requirement-traceability`），不修改已有 spec。

## Impact

- 新增文件：`DPT_FRAMEWORK/workflows/nodes/shared/shared-agent-ux-guidance.md`、`DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md`、`DPT_FRAMEWORK/workflows/nodes/brief/hitl1.md`、`DPT_FRAMEWORK/workflows/nodes/brief/hitl2.md`
- 新增 delta spec：`specs/hitl-ux/spec.md`（HIU-001..006）、`specs/silent-wave-execution/spec.md`（SWE-001）、`specs/requirement-traceability/spec.md`（RET-001..006）
- 修改文件：`phase-hitl1.md`、`phase-hitl2.md`、`phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`、`phase-seed-topics.md`、`shared-profile.md`、`manifest.json`（wave MDs 新增 `requires: shared-silent-execution` + `search_preference` 下游使用指引）
- 治理文件：重组 `openspec/governance/req-registry.yaml`（新增 `prefixes:` 映射块、解散合成组、注册 HIU-*/SWE-*/RET-*）+ 固化 `openspec/config.yaml` capability 边界约定
- 不影响 profile schema、gate rule、CLI、apply-research-style.mjs——`search_preference` 作为 `rb_profile.yaml` 的 informal YAML key 存储（不经 Zod 校验），Agent 直接读写。正式的 schema 支持留待后续 change
- UX 层面建立整体契约：整个系统只有 3 个浮出水面点（2 个交互 + 1 个交付），用户预期从"随时可能被问问题"变成"给你输入，去干活，回来找我确认"
