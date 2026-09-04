# Design: spec-lean-restatement-tooling

## Context

spec-lean 主线 C2/C3 需要两件可复用的确定性工具（动机见 proposal.md）。现状约束：

- `openspec/governance/` 已有两类成员：`check-*.mjs`（governance checker，被 `check-all.mjs` 按 `check-` 前缀自动接入）与非 checker 工具先例 `bump-version.mjs`。
- 仓库只批准 `zod`、`yaml` 两个 npm 依赖；测试用 `node:test` + `node:assert`，放 `tests/governance/`（先例：`bump-version.test.mjs`）。
- CLI tri-state 惯例：`0` 成功 / `1` 可修复失败 / `2` 调用错误（accepted `engine/cli-exit-code-conventions`，本工具对齐其精神：结果细节走 stdout，exit code 只作粗粒度信号）。
- 主 plan §2.1 指针化判定与深挖执行注记（declared==actual 断言、多重集合守恒）是工具行为的规范来源。

## Goals / Non-Goals

**Goals:**

- `scan-restatement-candidates.mjs`：对给定 spec 输出复述候选段落行号表（确定性、只读、可校准）。
- `assemble-spec-delta.mjs`：按分组 YAML 把 requirement 块拆分为多个新 requirement，文本逐字守恒，含 declared==actual 断言与多重集合守恒校验。
- 两者都可直接被 C2/C3 的规划与执行消费，测试覆盖 happy path 与 fail-closed 行为。

**Non-Goals:**

- 不自动改写任何 spec（装配工具写出结果须显式 `--out`，且 C2/C3 中由 Agent 走 change 管线落地，工具本身不进 change 目录）。
- 不做语义判定：不出"该不该指针化"的 verdict；不接入 check-all。
- 不处理非 spec 的 Markdown（不通用化为任意文档处理器）。

## Decisions

### D1. 落点 `openspec/governance/`，命名避开 `check-` 前缀

备选：(a) 新建顶层 `tools/` 目录——引入新目录概念，违背语义精确原则（无新问题被回答）；(b) 放 `DEEP_RESEARCH_HARNESS/`——那是 distributable framework，spec-hygiene 工具是 repo 治理面不是框架行为。选 governance 目录复用 `bump-version.mjs` 非 checker 先例；`scan-*` / `assemble-*` 命名不匹配 `check-*.mjs`，`check-all.mjs` 不会接入——维持"工具输出候选与断言、checker 出 governance verdict"的边界。

### D2. 扫描器：锚点词表 + 段落切分，输出候选表

- 输入：spec 路径（必选）、`--anchors <yaml>`（可选，追加/覆盖锚点类别）、`--format table|json`。
- 锚点词表默认值 = 主 plan §2.1 规则 1 的过程性复述类别（generated task / task\.md / spawn / Generated guidance / Generated actor / Generated work-unit task 等，常量表内置）。
- 段落切分与深挖同款单元解析：requirement 块内，非空、非 `#### Scenario:`、非列表/引用/表格前缀的连续行 = 一个散文段；输出字段：`spec`、`paragraph_start_line`、`paragraph_end_line`、`hit_category`、`hit_token`、`enclosing_requirement`（块标题行）、`excerpt`（首行截断）。
- 数据结构用 Zod 定义（candidate record schema + anchors config schema，`.refine()` 校验类别非空、行号区间合法）。
- exit code：扫描完成恒 `0`（候选不是失败）；文件不可读/参数错 = `2`。
- 校准锚点：对 DWU spec 运行的命中集合须覆盖主 plan §1.5 的 36 处实测锚点（任务 1.3 的交叉验证）；锚点词表可经 `--anchors` 扩展而无需改代码。

### D3. 装配工具：分组 YAML + 逐字搬移 + 三重断言

- 输入：`--spec <path>`（原 spec）、`--grouping <yaml>`、`--out <path>`（变换后文本写出目标；缺省 dry-run 只校验）。
- 分组 YAML schema（Zod + `.refine()` 跨字段校验）：

```yaml
spec: openspec/specs/<path>/spec.md          # 须与 --spec 一致（refine）
block_title: "### Requirement: <exact title>" # 精确匹配唯一块（refine：命中数==1）
units:                                        # 每个 = 一个新 requirement
  - title: "### Requirement: <new title>"
    prose: [1, 4]        # 承载散文段序号（闭区间或列表，1-based，块内）
    scenarios: [1, 9, 7] # 承载场景序号（乱序须保持原相对顺序，refine）
```

- 三重断言（Engine-owned deterministic verdict）：
  1. **declared==actual**：工具对块重算散文段与场景的实际数量与位置，与 YAML 声明逐一比对；不符 = fail，根因给第一个 mismatch（第 N 段 declared/actual）。
  2. **覆盖完备 + 无重叠**：units 的散文段与场景并集须覆盖块内全部（refine 层报缺口/重复）。
  3. **多重集合守恒**：变换前后全文逐行多重集合相等，唯一允许净增 = units 的标题行；失败 = 报首个差异类别（缺行/多行/被改行）与其内容。
- 输出文本：块内内容按 units 重排，每个 unit 前插入新标题行 + 空行；块外字节不动。
- exit code：dry-run/写出守恒通过 = `0`；守恒或 declared==actual 失败 = `1`；YAML schema 不合/块不唯一 = `2`。

### D4. 语义边界与责任分层（constitution 三方向应用记录）

- **Semantic precision**：两个工具各自回答一个有界问题（"哪里疑似复述，供人审" / "按此映射搬移是否逐字守恒"），不合并成一个"spec 瘦身器"；候选 ≠ 判定、断言 ≠ 语义批准，两层在输出中显式分离。
- **Simple reliable control**：Source of Record 始终是 spec 文本本身；工具无状态、无缓存、无第二 validator；守恒失败给最小根因集（首个 mismatch）后即停，不级联罗列。
- **Helper-oriented**：用户保留语义决策（§2.1 三条件定稿、分组主题终审）；Agent 执行机械搬移与工具运行；Engine（工具）只出确定性断言。工具不因读取 spec 而成为 authority，也不创造 permission。

### D5. 共享单元解析器与预演 fixture 策略

- **共享 parser**：散文段/场景的单元解析抽为独立模块 `openspec/governance/spec-unit-parse.mjs`，扫描器与装配工具共同 import——两个工具口中的"第 N 段散文/第 M 个场景"必须是同一套确定性切分，否则分组 YAML 的 declared 序号在两个工具间语义漂移。备选（各自实现 + 注释互指）被否：无声漂移风险高，且违反 one rule source。
- **预演 fixture**：integration 预演不读活体 spec——在 C1 时点把 rerun-incremental-node 目标块与 DWU 扫描样本冻结为 `tests/fixtures/` 快照（记录来源 commit），配合深挖 §11 K1/K2 分组 fixture 断言 declared==actual + 守恒。理由：C2/C3 会合法改动活体 spec，常驻测试对活体断言会把合法迁移误报为回归；一次性校准（任务 1.3）对活体跑，持久回归对冻结快照跑。

## Risks / Trade-offs

- [段落切分启发式与人工分界不一致] → declared==actual 断言把分歧前置到 dry-run；C2/C3 分组表按深挖勘察值编写，mismatch 即停即修，不静默吞并。
- [锚点词表过宽造成候选噪声] → 候选表按类别分组且标注"候选 ≠ 判定"，人审成本可控；词表可经 `--anchors` 收窄，校准基线（DWU 36 命中）在任务 1.3 锁定。
- [守恒断言只证明"逐字"，不证明"语义等价重排"] → 接受：重排语义由分组 YAML 的人审终审把关（用户决策），工具不越界。
- [工具被误当 governance verdict] → 命名不接 check-all + 输出头声明 non-authoritative；README 不入 COMMANDS.md（非框架 CLI）。

## Migration Plan

纯新增，无迁移。回滚 = 删除两个工具文件与对应测试，无状态残留。

## Open Questions

（无——两个可延迟点均已定：锚点词表常量内置 + `--anchors` 扩展；测试落点 `tests/governance/` 有先例。）
