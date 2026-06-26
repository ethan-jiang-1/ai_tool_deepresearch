# 01 — 核心架构：Run Bundle 与五文件控制面

## Run Bundle 结构

```
RUN_DIR/
  _framework/                     ← 只读框架快照
    specs/                        ← 共享规范权威
      CONSTANTS.md                ← 版本、枚举、字段名
      CHARTER.md                  ← Source-of-Record 模型、不变量、投影映射
      WORK_DIRECTORY_LAYOUT.md    ← 规范目录布局
      GATES.md                    ← Gate 索引和原则
      gates/*.md                  ← 每个 Gate 的详细 pass/fail 规范
      RESEARCH_PROFILES.md        ← 研究模式预设
      METHODOLOGY.md              ← 证据方法、探索/利用、artifact 生命周期
      QUEUE_CONTRACT.md           ← Queue 对象契约
    flows/                        ← 流程定义（非规范，是策略）
      execution-flow.md           ← 执行协议
      queue-agentic-flow.md       ← Queue 驱动的执行循环
      instantiation-flow.md       ← 实例化协议
      reference-artifact-backfill.md ← 参考/artifact/回填规则
      source-intake-flow.md       ← 源获取策略
    output_templates/             ← 可复制的控制文件骨架（仅作创建源）
      PROFILE.md, PLAN.md, STATUS.md, QUEUE.md, TRACE.md
      RUN_ROOT_AGENTS.md, RUN_ROOT_CLAUDE.md
    command_playbooks/            ← 命令剧本
    cli_tools/                    ← 只读 CLI 诊断工具
    COMMANDS.md                   ← 命令索引
    AGENT-GUIDE.md                ← Agent 操作指南

  <PLAN_BASENAME>.profile.md      ← 用户意图、研究模式、HITL决策 (Source of Record)
  <PLAN_BASENAME>.plan.md         ← 话题设计、gate目标、蓝图 (设计时)
  <PLAN_BASENAME>.status.md       ← 当前状态、gate审计、差距、计数器 (运行时)
  <PLAN_BASENAME>.queue.md        ← 可执行工作队列 (5槽位滚动窗口 + Refill Pool)
  <PLAN_BASENAME>.trace.md        ← 追加式诊断日志 (非例行进度)

  AGENTS.md                       ← 运行根目录 Agent 指令 (从模板渲染)
  CLAUDE.md                       ← 运行根目录 Claude 指令 (从模板渲染)

  _cache/                         ← 源获取暂存区 (需时才创建)
  original_topic/                 ← 可选上游大话题分解材料 (非正式话题根)
  seed_topics/                    ← 唯一正式话题执行根
    README.md
    <topic seed files>.md
    _reference/                   ← 本地证据文件
      README.md
      _INDEX.md
      00-shared-*.md              ← Wave 0 共享基础参考
      <topic-id>-*.md             ← Wave 1 话题特定参考
    _artifacts/                   ← 衍生合成
      README.md
      wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md
      wave1_topics/<topic-id>-<topic-slug>/question-list.md
      shared/
      wave2/cross-topic-synthesis.md
      wave2/human-decision-brief.md
  final*/                         ← HITL2 决定的最终输出目录
```

## 五文件角色矩阵

| 文件 | 角色 | 写边界 |
|------|------|--------|
| PROFILE | 用户意图、模式选择、HITL1/HITL2 决策 (Source of Record) | 不包含蓝图或活跃队列 |
| PLAN | 话题注册表、gate 目标、蓝图 (设计时) | 不包含实时进度或工作日志 |
| STATUS | 当前运行状态、gate 审计、差距、计数器、阻塞项 (运行时) | 不包含完整蓝图或活跃队列副本 |
| QUEUE | 可执行工作单元 (5 槽位 + Refill Pool) | 不包含状态完整镜像或证据体 |
| TRACE | 追加式诊断决策记录 | 不包含例行工作日志或完整状态 |

## 关键架构约束

1. **`_framework/` 只读**：运行状态、参考、artifact、原始话题、种子话题、最终输出都不能写入 `_framework/`
2. **`output_templates/*.md` 仅是骨架**：不能用于执行活跃运行
3. **Source of Record 唯一性**：每类信息只有一个权威位置
4. **`seed_topics/` 是唯一话题根**：`topics/` 不是 V12 的活跃话题根
5. **`original_topic/` 不是正式种子话题根**：只是可选分解材料
6. **参考文件名保留溯源**：`00-shared-*` 表示共享基础，`<topic-id>-*` 表示话题特定
7. **最终输出目录由 HITL2 决定**：`profile_default → final/`, `executive_brief → final_executive_brief/` 等

## 实例化 vs 运行时

```
实例化 (Instantiation Mode):
  创建 Run Bundle 结构
  → current_mode = instantiation_only
  → current_gate = instantiation_complete
  → 不产生执行进度、证据、artifact
  
运行时 (Execution Mode):
  从 PROFILE→PLAN→STATUS→QUEUE 驱动链执行
  → current_mode = execution
  → 经过 setup_ready → Wave 0 → Wave 1 → Wave 2 → Readiness
```
