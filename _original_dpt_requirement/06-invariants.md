# 06 — 22 条核心不变量 (INV-*)

这些是系统的**硬性规则锚点**。不变量 ID 是导航锚，不是第二规则来源。

---

## 边界与结构不变量

| ID | 规则 | 违反条件 |
|----|------|---------|
| **INV-BOUNDARY-001** | 实例化产生一个 Run Bundle：`_framework/` + 5 个控制文件 + `seed_topics/` 目录契约 | 运行状态、参考、artifact、最终输出或 Wave 0 证据被创建在 `_framework/` 内 |
| **INV-BUNDLE-001** | `_framework/` 是只读框架快照 | 运行控制文件、话题注册表状态、`original_topic/`、`seed_topics/`、`_reference`、`_artifacts` 或 HITL2 最终输出目录出现在 `_framework/` 内 |
| **INV-CMD-001** | 运行时命令通过 `PLAN_PATH -> Runtime Command Entrypoint` 解析 | 命令从源模板内存运行，或指向 `_framework/output_templates/*.md` |
| **INV-SNAPSHOT-001** | output_templates 是骨架，5 个根文件是实例化控制文件 | 运行时从 output_templates 读取/覆盖，或根文件保留未解析的 `<...>` 占位符 |
| **INV-SOR-001** | 每个信息类只有一个 Source of Record | 生成的文件镜像另一个文件的完整权威表面 |

## 研究与证据不变量

| ID | 规则 | 违反条件 |
|----|------|---------|
| **INV-GATE-001** | Gate 只能通过 STATUS 中的显式审计表面通过 | 用散文信心、聊天记忆、artifact 计数或松散摘要作为通过基础 |
| **INV-GATE-002** | 后一波不能在前一波 audit 通过前开始 | Wave 1/2/Readiness 工作在所需的前置审计仍然是 failed/missing/partial 时开始 |
| **INV-REF-001** | 计数的证据需要接受本地参考清单行，包含所需的可审计字段 | 数字计数缺少本地路径、接受状态、来源类型、信任级别、来源家族、tier、证据角色、来源日期范围、支撑声明、种子回填状态、网页诊断字段或内容保留决定 |
| **INV-REF-002** | Artifact、聊天笔记和多多来源摘要不算作额外参考 | 综合 artifact、聊天笔记或多多来源文件被计为参考广度 |
| **INV-REF-003** | 计数的参考文件名保留溯源：`00-shared-*` 或 `<topic-id>-*` | 不透明全局 `ref-NNN-*` 名称使无法判断证据来自共享基础还是话题深化 |
| **INV-WEB-001** | 计数的网页证据必须通过网页材料诊断 Gate | 薄/营销/验证中/未修剪的网页被计为接受证据 |

## 话题与拓扑不变量

| ID | 规则 | 违反条件 |
|----|------|---------|
| **INV-SEED-000** | 种子话题的上半部分必须满足 Seed Topic Intake Standard | 占位符生长尾标题隐藏缺失的 must_answer/why-now/boundary/evidence-anchor/why-it-matters 实质 |
| **INV-SEED-001** | 影响话题的接受参考在话题种子回填完成前不算完成 | 参考被计为话题参考而 `seed_backfill_status` 缺失/过时/未排队 |
| **INV-ROOT-001** | `seed_topics/` 是唯一正式话题根 | 活跃话题使用 `topics/`，参考/artifact 指向 `seed_topics/` 之外 |
| **INV-ORIGINAL-001** | `original_topic/` 是可选分解材料，不是正式种子话题根 | 原始大话题草稿被计为 Wave 1 种子话题或用作竞争话题注册表 |
| **INV-TOPO-001** | 运行时话题拓扑变更是生成运行文件的受控变更，不是重新实例化 | 新话题候选重新运行 `instantiate-run-bundle`，或创建竞争话题注册表 |
| **INV-TOPO-002** | Formalized 新话题使用追加式稳定 ID，必须同步 plan/status/queue/topic seed/trace 和受影响 gate | 现有话题 ID 被重新编号，或 formalized 话题只出现在一个文件中 |

## Artifact 不变量

| ID | 规则 | 违反条件 |
|----|------|---------|
| **INV-ART-001** | Topic artifact 使用规范每话题目录布局 | Artifact 不一致地平铺、每运行重命名或存储在无法从话题 ID 和 slug 推断的临时目录 |
| **INV-ART-002** | Topic artifact 是渐进式执行产品，不是收尾清理 | Artifact 在 Wave 1 收尾前保持空白/过时/缺失，尽管话题证据已落地 |
| **INV-QUESTION-001** | 每话题 question-list.md 是探索账本 | 问题列表是空白、复制的种子列表或通用问题转储，不随证据增长或收敛 |

## 执行不变量

| ID | 规则 | 违反条件 |
|----|------|---------|
| **INV-QUEUE-001** | 执行保持非空五槽位活跃队列，除非 readiness_passed 或真正的阻塞被记录 | Queue 工作在不填 slot_1~5 或记录有效阻塞的情况下关闭 |
| **INV-QUEUE-002** | Queue 任务从 PLAN 目标/STATUS 差距/gate 差距/显式触发器派生 | Queue 包含泛型"继续研究"动作、跳波、或遗漏 artifact/backfill/trace 工作 |
| **INV-RESP-001** | 用户可见停止授权是持久化运行时状态，不是聊天判断 | Agent 报告例行进度、询问继续、在 HITL2 准备完成前停止、在有可执行队列工作时设置 safe_to_interrupt=yes |
| **INV-RESP-002** | Post-Gate Continuation 是 gate 闭合的一部分 | Gate 通过后跟一个回顾、"继续？"、"调整方向？"、"等待用户审查" |
| **INV-TASK-001** | Native todo/task/plan 表面是 QUEUE 的投影，不是权威 | Native 任务成为聊天/报告任务，`/goal` 被当作框架控制动作，投影偏离 QUEUE |
| **INV-TRACE-001** | Trace 是追加式诊断记忆，不是例行进度 | Trace 记录普通配额进度、例行参考捕获或可变工作日志状态 |
| **INV-TRACE-002** | Wave 过渡需要独立的 trace checkpoint | Gate 似乎通过但 trace 休眠，最终纠正用于替代缺失的 Wave checkpoint |
| **INV-INTAKE-001** | 源获取委托是前台队列工作 | 源获取作为分离后台工作运行，原始检索绕过 `_cache`，委托 runner 写入共享文件 |

## 最终交付不变量

| ID | 规则 | 违反条件 |
|----|------|---------|
| **INV-FINAL-001** | 最终解释输出在 `_framework/` 之外，使用 HITL2 确定性映射 | 最终输出被当作 gate 证据、存储在 `_framework/` 内、被计为参考、使用未映射的目录名 |
| **INV-SYNTH-001** | Wave 2 需要实质性综合 artifact + 填充的矩阵 + 本地 backing refs | Wave 2 从快速状态更新通过、空矩阵、薄 artifact、未覆盖综合阶段 must-answer、短 ID 引用 |
| **INV-READY-001** | Readiness 是最终的；失败重填 Wave 2 或更早工作 | Wave 3、隐藏完成阶段、新来源发现或 gate 修复被引入 Readiness 之后 |
