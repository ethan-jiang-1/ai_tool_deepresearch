## Context

见 `proposal.md` — Why。这里只记录塑造实现路径的当前状态与约束。

当前实现的四个坐标：

- `DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs:17-60` — `ResearchAccessSchema`，`status` 三分支 discriminated union，`reason: TrimmedNonEmptyString` 不带任何分类校验。
- `DEEP_RESEARCH_HARNESS/host_tools/lib/research-access-adapter.mjs:24-35,122-130` — `UNAVAILABLE_FACTS` 一维查表 + `selectedAdapterUnavailableRoot()` 切 `reason` 第一个冒号做前缀查表。
- `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs:162-193` — `researchAccessFinding()`，第 179 行对所有 unavailable 一律 `external_action`。
- `DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md` frontmatter `unavailable_roots: [surface_absent, permission_required]`，正文 48-54 行不分 search/fetch 地要求两个前缀；而 `workflows/nodes/shared/shared-hitl1-capability-probe.md:46-51` 只在 search 分支要求，116-123 的正候选分支只要求 "one direct non-empty reason"。

约束：`readSelectedResearchAccessAdapterContract()` 已有的 drift-check 机制（46-55 行 throw）是本 change 唯一可用的「声明一致性」执行点；Gate 契约禁止新增 research-access check type、degraded pass、alternate Setup route；schema-core 禁止存储随尝试次数增长的结构。

## Goals / Non-Goals

**Goals:**

- 定宽 access envelope 的持久化形状，且「定宽」由 schema 结构保证而非靠约定。
- 两根轴的**结构化配对**：boundary location 与 extent 不可能只出现一半。
- owner → repair_kind 为**推导**关系，误路由在结构上不可表达。
- 声明式 source-class 阶梯有唯一 Source of Record，adapter contract、probe prompt、schema 三处不可能各自漂移。
- 删除 prose 前缀解析路径，且删除后无等价替代路径残留。

**Non-Goals（design 层，proposal 的排除项不重复）：**

- 不为 envelope 新增 Gate check type。准入判定仍走既有 `research_access.status` 的 `field_value` 检查；「至少一个 class 可达」由 schema refine 在**写入时**保证，不在 Gate 处再判一次。
- 不引入 class 级 Gate 规则、不引入 class 权重、不引入 class 优先级配置。
- 不做 bundle 迁移脚本。旧 observation 保持可读，不重写字节。

## Decisions

### D1. source-class 闭合集合归 `schema/enums.mjs`，阶梯数据归 adapter contract frontmatter

**决定**：`SourceClass` 作为第 11 个 domain enum 落在 `DEEP_RESEARCH_HARNESS/schema/enums.mjs`；**枚举数组的顺序即声明的阶梯顺序**。adapter contract frontmatter 新增 `source_classes:`，每项携带该 class 的中性 query 等可标定数据；`readSelectedResearchAccessAdapterContract()` 扩展 drift-check，断言 frontmatter 的 class 集合与 enum **恰好相等且同序**，不等即 throw。

**为什么不是反过来**：schema 层需要闭合枚举来校验 envelope。若集合的 Source of Record 在 `host_tools/*.md`，`schema/contracts/profile.mjs` 就要反向依赖 `host_tools/` 读 Markdown frontmatter——层级倒置，且把 schema 校验挂在文件 I/O 上。

**为什么不是新建独立声明文件**：会产生第三个坐标和第三条 drift 边。现有两个坐标已各自有强制机制（Zod 编译期闭合 / frontmatter throw），复用即可。这是净减而非净增。

**class 集合与站点选择的分工**：enum 值是**语义类别**（架构），frontmatter 的 query 是**具体目标**（数据）。proposal §6 说的「实测标定后改数据不改架构」由此落实——标定改 frontmatter query，不动 enum、不动轴、不动准入规则。

初始声明三类，按此顺序：`encyclopedia`（保留现有 Wikipedia 行为为第一级，happy path 零变化）、`code_host`、`general_web`。选三不选五：三类已经足以让 `universal` 与 `class_scoped` 两个 extent 值都可达（第三类 `general_web` 不带 `site:` 过滤，是「到底还能不能抓到任何东西」的诚实兜底）；width 是可修订的声明数据，宁可从窄开始。

### D2. envelope 用数组 + refine，不用 record

**决定**：

```js
source_class_reachability: z.array(z.object({
  source_class: SourceClass,
  reachability: z.enum(['reachable', 'unreachable', 'not_attempted']),
})).max(SOURCE_CLASSES.length).optional()
```

配 `.superRefine()`：class 不重复；`available` 至少一个 `reachable`；`unavailable` 零个 `reachable`。

**替代方案 A（`z.record`）**：键开放，undeclared class 只能靠 refine 挡，且 YAML 里一个拼错的键会静默通过到 refine 才报——诊断更差。

**替代方案 B（`z.object` 每 class 一个 optional 字段）**：加 class 就改 object 形状，与 D1 的「改数据不改架构」冲突。

数组版本天然表达 spec 里「at most one entry per declared source class」和「not attempted 不是 unreachable」两条区别，`.max()` 把定宽写进类型而不是写进注释。这条是**「定宽不是矩阵」在实现层的正面兑现**：每 entry 恰好两个标量字段，schema 层就没有 URL、HTTP 码、query 的容身处。

### D3. 两轴用嵌套对象承载，配对性是结构而非 refine

**决定**：

```js
unavailable_boundary: z.object({
  location: z.enum(['host_surface', 'host_policy', 'network_path', 'probe_relay']),
  extent: z.enum(['universal', 'class_scoped']),
}).strict().optional()
```

**替代方案（两个平级 optional 字段 + refine 校验配对）**：被否。refine 是事后检查，「只写了 location」这个非法状态在类型上仍可表达，只是被拦下；嵌套对象让它**根本不可表达**。spec 要求的「present together or absent together」因此不需要一条 refine 规则去守。

字段整体 optional 即 spec 的 honest-unclassified：缺失是合法状态、不是缺陷。`.strict()` 防止未来有人往里塞第三个轴而不走 spec。

### D4. owner → repair_kind 推导，而非并列字段

**决定**：`research-access-adapter.mjs` 的 `UNAVAILABLE_FACTS` 重建为按 boundary location 键控的 owner 表，每项声明 `owner` 与 `actor`（`external` | `agent`），**不声明 `repair_kind`**；导出 `selectedAdapterBoundaryFact(location)` 由 `actor` 推导出 `repair_kind`（`agent` → `agent_action`，`external` → `external_action`）。

推导点只有一处，因此「probe_relay 却报 external_action」这类误路由不再是「写错了一个字段」，而是要绕开唯一推导函数才能产生——这正是 proposal 说的「在结构上不再可能」。

`selectedAdapterUnavailableRoot()` **删除**，不保留 deprecated 包装。保留即等于保留那条 prose 解析路径，`engine/gate-skeleton` 的禁令仍被违反。这是本 change 的净简化项：删掉一个导出、一条解析路径、一个隐式契约（"reason 必须以某前缀开头"）。

### D5. Gate 读结构化字段，unclassified 走显式分支

**决定**：`researchAccessFinding()` 改为三分支——

1. `unavailable_boundary` 存在 → `selectedAdapterBoundaryFact(location)` → finding 携带该 owner、推导出的 repair_kind、同 probe/同 Gate 的 rerun 边界，并在 feedback 中带上 extent（`class_scoped` 时说明是部分来源而非全部）。
2. `unavailable_boundary` 缺失且 status 为 `unavailable` → 显式 finding：「该观察未携带可路由 boundary」这个 direct fact + 记录的 reason 原文 + 同 probe rerun。repair_kind 为 `agent_action`（Agent 应重跑 probe 并按 guide 携带分类），不是 `external_action`——把无分类当外部前置条件正是被修的误路由之一。
3. `unprobed` / 缺失 → 保持既有 `agent_action` 路径不变。

第 179 行的一律 `external_action` 随之消失。

### D6. 准入线的执行位置：schema 写入时，不是 Gate 判定时

**决定**：「至少一个 declared class 可达」由 D2 的 refine 在 `ProfileSchema` 校验时保证；Gate 仍只看 `research_access.status == available`。

**为什么**：Gate 契约明确禁止新增 research-access check type / 重复 cross-field validator，且既有 spec 已把 available 分支的内部一致性全部委托给 ProfileSchema。把 envelope 一致性也放在同一处，Gate 的规则集**一条不加**——形状不变、保真度提升，与 proposal §3 的表述一致。副作用是 partial reachability 的准入在 Gate 侧是「什么都不用做」，这正是它不该成为新决策点的实现证据。

### D7. 阶梯顺序遍历与 first-success 短路

**决定**：probe 按 enum 顺序逐 class 尝试，每 class 沿用既有单 search / ≤3 候选 / native-first / 一次同 URL curl fallback 的界限；任一 class 拿到真实页面内容立即整体停止，未尝试的 class 记为 `not_attempted`。

最坏情况上界：3 class × 3 候选 × (1 native + 1 fallback) = 18 次 fetch 尝试，且只在**已经全线失败**的环境里才达到——健康环境第一个 class 第一个候选即停，与今天完全一致。不新增 retry、不新增 tier、class 内不新增第二次 search。

### 设计论证（按 constitution 顺序）

**Semantic precision** — 新增具名概念是 access envelope 与两根轴。读者的有界问题：Phase Agent 与 Gate checker 问「本 run 现在够得着什么、够不着的那部分归谁」。必须保留的区别有二：owner 四分（宿主没能力 / 宿主拒绝 / 网络够不着 / probe 没跑起来，四者 repair 不同）与 extent 二分（全不可达阻断 vs 部分不可达放行）。正常推理停止点：读到 `status` 判准入，读到 `unavailable_boundary` 判 owner，两步到底，无需解析散文、无需回溯探测过程。D2/D3 保证这两步读到的都是校验过的闭合值。

**Simple reliable control** — direct Source of Record 从「reason 散文」迁到结构化字段（D3/D4/D5）；最短合法闭环长度不变，仍是「重跑同一 probe → 重跑同一 Gate」，未新增 state、Gate、retry、recovery 路径。净简化账：删除 `selectedAdapterUnavailableRoot()` 一条解析路径、删除一条静默降级分支、Gate 规则集零新增（D6）；新增的全是闭合枚举字段与一处推导函数。加法项（阶梯遍历）以 D7 的静态上界买单，且不落在 happy path 上。

**Helper-oriented responsibility** — user decision 边界不变：HITL1 仍只有一个决策点，部分不可达只告知不索取指示（proposal §7）。Agent execution：spawn probe、写 observation、按 feedback 重跑——D5 分支 2 把「无分类」判给 Agent 而非用户，正是把 mechanical work 留在 Agent 侧。Engine verdict：schema 校验、准入判定、owner→repair 推导、feedback 投影；Engine 不发现 provider、不启动 adapter、不写 observation。

## Risks / Trade-offs

- **any-success 准入确实更容易通过，可能放行一个真实来源大面积不可达的 run** → 这是有意的（假阴性才是被修的缺陷），但代价真实。缓解：envelope 完整保留每 class 结果并在 HITL1 如实告知；wave 侧消费与 limitation 声明共用这同一数据模型，届时不改 schema 即可接上（proposal §8）。
- **模型为了满足词汇要求而猜一个 boundary** → guide 与 spec 都明写「不得为满足词汇而猜」，且 unclassified 是合法返回；D5 分支 2 让 unclassified 有明确出口而非惩罚，去掉猜的动机。测试须正面覆盖 unclassified 分支（`verification-plan.yaml` claim `two-axis-classification-and-repair-derivation`）。
- **未来加 class 会让旧 observation 的 envelope「不完整」** → envelope 是 per-class optional entry 列表，缺项就是缺项，既不等于 `unreachable` 也不触发校验失败；旧 observation 无 envelope 时整体 optional，走既有 legacy 可读路径。
- **enum 与 frontmatter 双坐标仍可能漂移** → D1 的 drift-check 在读取时 throw，且 `verification-plan.yaml` claim `adapter-contract-declaration-integrity` 把它变成失败可见的测试，而非静默失效。
- **删除导出函数是破坏性的** → `selectedAdapterUnavailableRoot()` 仅 Gate 一个调用点，同一 change 内一并改；它不属于 bundle 数据契约，不影响任何已有 bundle 字节。

## Migration Plan

无 bundle 迁移。envelope 与 boundary 均为 optional，旧 `rb_profile.yaml` 原样通过校验，走 D5 分支 2 的显式 unclassified 路径；不重写、不默认填充、不重解释为任一 boundary。

当前 writer 侧一次性生效：本 change 之后写出的每个 observation 都带 envelope，unavailable 分支在能确立 boundary 时带两轴。

回滚：本 change 的所有新增字段均 optional，回滚 schema 后旧字段被 `.strict()` 拒绝——因此回滚需同时回滚 writer（probe guide 与 phase body）。三者在同一 change 的 tasks 中成组变更，不拆分发布。

顺带修复：`tests/integration/cli/hitl1-research-access-adapter.test.mjs:123` 的静态串断言当前即失败（断言 `/不要求用户运行 \`curl\` 或手改 profile/`，实际文本为「不要求用户重复回答 HITL1 choices、运行 `curl` 或手改 profile」）。本 change 本就要改 `phase-hitl1.md`，在 tasks 中一并对齐该断言，避免把一个已知红测带进 apply 的验证基线。
