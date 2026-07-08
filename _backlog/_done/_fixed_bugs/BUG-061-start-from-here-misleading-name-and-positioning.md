# BUG-061 — START_FROM_HERE.md 名字和定位都有误导性，应改为 BUNDLE_MAP.md

| 属性 | 值 |
|------|-----|
| ID | BUG-061 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P2 — 不影响功能，但误导 Agent 和人类对 bundle 的理解 |
| 来源 | `dpt_rb_fose-europe-engelberg-2026` formal run 产物审查 |
| 影响文件 | 模板 `START_FROM_HERE.md.tmpl`（内容+文件名），及其在框架/测试/spec 中约 10 个引用点 |

## 问题

### 名字不对

`START_FROM_HERE.md` 暗示一个**动作入口**："从这里开始干活"。但 run 完之后（甚至 run 到一半被 HITL 打断时），这个文件已经不再是动作指令了——它是一个**被动知识地图**：告诉你 bundle 里有什么、东西在哪、出了事看哪。

### 内容定位不对

当前内容大半是"续跑口诀"、规则和命令——给 Agent 看的操作指令。但真正有价值的是**地图功能**：
- 研究产物在哪（`seed_topics/`、`reference/`、`artifacts/`、`final/`）——这些才是知识的载体
- `_cache/` 里有实际的搜索缓存
- 出了事到哪看（`rb_trace.jsonl`、`_logs/run.log`、`_diagnostics/`）

当前文件把这些埋在操作指令下面，地图功能被压制了。

### 应该是什么

两个清晰的部分：

1. **研究内容地图**（消费侧）——怎么理解这个 bundle 里的研究成果
   - topics 在哪（`seed_topics/`）
   - evidence 在哪（`reference/`，含 `_INDEX.md`）
   - 各 wave 产物在哪（`artifacts/wave0/`, `wave1/`, `wave2/`）
   - 最终报告在哪（`final/`）
   - 搜索缓存（`_cache/`）里有什么

2. **工程/排障地图**（运维侧）——出了事到哪看
   - 控制文件是什么（`rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`）
   - 诊断数据在哪（`_logs/`, `_diagnostics/`）
   - `rb_output_declarations.jsonl` 是什么

**不需要的内容：** 续跑口诀、命令示例、规则列表——这些属于 `RUN.md` 或 Agent playbook，不属于被动知识地图。

## 改名影响面（约 10 个文件）

| 文件 | 改动 |
|------|------|
| `rb_templates/START_FROM_HERE.md.tmpl` → `BUNDLE_MAP.md.tmpl` | 改名 + 内容重构 |
| `cli/instantiate-run-bundle.mjs` | 改 template mapping 和 console 输出 |
| `cli/inspect-bundle.mjs` | `REQUIRED` 数组里改名 |
| `cli/check-reentry.mjs` | advice 文本里改名 |
| `schema/gate_definitions/gate-instantiation-complete.definition.json` | gate rule target 和 id 改名 |
| `engine/helpers/file-observability.mjs` | `ROOT_CONTROL_FILES` 集合里改名 |
| `workflows/nodes/phases/phase-instantiation.md` | artifact 列表里改名 |
| `command_playbook/start-research.md` | reentry 指引里改名 |
| `RUN.md` + `README.md` | 框架文档里的引用改名 |
| 测试文件（~5 个） | fixture 写入和断言改名 |

另有 openspec specs/governance 约 9 个文件需同步，但那些走 `/opsx:sync` 即可。
