## Context

两篇 accepted spec（`agent/delegated-work-units` 2431 行 / 29 requirement，`agent/agentic-queue` 1065 行 / 28 requirement）的现状事实，全部由本 change propose 期直接核实：

- `req-registry.yaml` 仅登记 DEW-001..026 / AGQ-001..027；两篇头部 `> req:` 行与 registry 一致但落后于正文（29/28）。registry 标题为松散转述（如 DEW-026 "Affected delegated work receives current intent…" 对应正文 "…SHALL receive…"；DEW-020 标题与正文措辞差异更大），标题精确 diff 不可靠，最终无 ID 集合须在 apply 期以 checker + 人工比对确定。
- engine 的 drain expired 分类读取 `entry.deadline_at`（`DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs:524`：`inFlight.filter((entry) => entry.deadline_at && Date.parse(entry.deadline_at) < Date.now())`）；work-unit timeout 资格按 DEW-014 "Timeout terminalization SHALL be guarded by progress-aware preflight" 走 effective idle lease。两者是不同 deterministic fact。
- DEW-009 内两个 scenario（L817 / L855）为包含关系的近逐字重复；list-doc-locks 盘点与 `grep -r` 均确认无测试文本锁，改写为合并声明无回归代价。
- supersession 字段映射（`predecessor_work_id → supersession_of_work_id` 等）仅 AGQ-026 记录（DEW 对 `supersession_of_work_id` 零命中）；late-submit 队列后置条件与 claim 批量原子性在两篇中各自陈述己方文件不变式。见 D2。

See proposal.md – Why。

## Goals / Non-Goals

**Goals:**

- requirement 身份完整：每篇 spec 头部索引 = 正文 requirement 全集；无 ID requirement 获得登记 ID；每个 requirement 可经内联 `> req:` 行直接定位。
- 误读陷阱消除：drain vs timeout 资格两个判据在 AGQ drain requirement 处获得显式分工说明。
- 文本去重：DEW-009 的 absolute-runtime-root 行为只有一个权威 scenario 陈述（重复 scenario 正文改为合并声明，标题保留为 delta-sync key）。
- 全程零 engine/CLI/运行时行为改动。

**Non-Goals:**

- 不修改任何判据本身（尤其不把 AGQ drain 改成 idle-lease 口径——那会使 spec 漂离 `queue-manager-lifecycle.mjs` 的实现事实）。
- 不做 supersession / late-submit / claim 的跨 spec 文本手术（D2）。
- 不触碰 post-final CLI exit-code 裂缝（属后续 C2 change）。
- 不新增 capability、不新增 Zod schema、不改验证路由。

## Decisions

**D1 — A3 采取"分工注记"而非"口径统一"（方向相对 `_backlog` 计划初稿反转）。**
计划初稿提议把 AGQ drain 判据统一到 DEW 的 effective-idle-lease。propose 期核实 engine 事实后否决：`queue-manager-lifecycle.mjs:524` 的 drain expired 过滤就是读 `deadline_at`，AGQ 正文与代码一致；统一口径反而制造 spec↔代码漂移。改为在 AGQ drain requirement 顶部加英文 scope note，声明两判据分管两操作、owner 各异（drain 分类 owner 是本 requirement + queue-manager-lifecycle；timeout 资格 owner 是 DEW-014 + timeout-preflight）。备选"同时改 DEW-014 加反向注记"被否：DEW-014 已完整定义 idle-lease 语义，单侧注记即可切断误读链（Simple Reliable Control：最短合法闭环）。

**D2 — B2 三对"双真相源"经核实剔除两对半，仅保留 A4 的真实重复。**
逐项核实结论：(a) supersession 字段映射只存在于 AGQ-026（DEW 零命中），两 requirement 分别own work-unit 关系语义与 queue 后果，是按面切分的互补关系；(b) late-submit 队列后置条件：AGQ"Queue state and item schema are structured"内的段落陈述 `rb_queue.json` 位置不变式，DEW late-submit scenario 的 AND 从句陈述同一队列事实作为操作后果——交叉断言而非枚举重复，漂移面小（各 2 行），文本手术需搬运两个大 requirement 全文（90+65 行 delta），成本/收益不成比例；(c) claim 批量原子性：DEW 场景断言队列/index 零分配，AGQ 场景断言事务前拒绝与零写入，互补。(a)(b)(c) 均不动文本；此结论回写 `_backlog/plans/spec-semantic-drift-remediation.md`。真实且唯一的逐字重复是 DEW-009 内 scenario 对，由本 change 以保留标题的合并声明收敛（D4）。

**D3 — A1 的 ID 登记在 Apply 期完成，无 ID 集合已经 git 考古 + @impl 比对定案。**
已定案：`Dry-submit cache-URL mismatch diagnostics…` 与 `Dry-submit runtime-receipt schema diagnostics…` 由 `2026-08-26-improve-dry-submit-diagnostic-feedback` 以**无 `> req:` 头的 delta** 新增、registry 从未同步——确定无 ID。第三席为 "Sub-agents SHALL NOT own workflow authority"（heading 于 2026-07-07 apply 期进入 main spec，26 条松散标题无可匹配者；apply 期以 `git log -S` 终验）。registry 的 "DEW-008 Non-work-unit delegated artifacts…" 为陈旧摘要（该字符串从未作为 heading 存在于任何 spec），按起源 8 heading 排除法归属 "Invalid submit SHALL remain non-terminal"。新 ID 顺位取 DEW-027..029（registry 与 retired 集均无占用，无 active change 竞争）。内联 `> req:` 行**仅限 DEW**（确证 1:1；格式先例：DEW L69）。**apply 期修订**：@impl + registry 比对证实 AGQ 存在多 ID 合并 heading（AGQ-001 与 AGQ-019 内容均落于 "Queue state and item schema are structured"），heading↔ID 非 1:1——AGQ 只做 header 完整性（AGQ-001..028），不做逐 heading 内联，合并 heading 考证另立后续工作。备选"只修头部"被否：单靠头部仍无法从 requirement 反查 ID，DEW 内联行才是定位闭环。备选"刷新 registry 陈旧摘要标题"被否：标题为摘要性质，checker 不要求逐字一致，改动徒增 diff。

**D4 — DEW-009 重复 scenario 按 house 模式"保留标题、正文改写为合并声明"。**
OpenSpec MODIFIED delta 是整块替换语义：validator（`@fission-ai/openspec` validator.js 的 scenario-completeness 检查）拒绝 MODIFIED 块省略 current spec 已有的任何 scenario——这正解释了仓库既有"historical scenario name retained only as delta-sync key"注记模式的成因：requirement 存活时 scenario 标题不可删除。因此 A4 不删标题，而是把 "Claimed task contains absolute runtime paths" 的正文替换为合并声明（行为唯一归属 "Claimed task contains one canonical absolute runtime root"，本 scenario 不陈述独立 requirement）。delta 全文由脚本从 main spec 逐字提取生成（130+ 行手工转录必然引入噪声），仅替换目标 scenario 块，apply 时 main spec 的 git diff 将只显示该块变化。

**D5 — semantic-closure 记录取 `not_applicable`。**
本 change 零 engine 改动：`queue.demand-lifecycle`、`work-unit.attempt-identity-and-actor`、`work-unit.submission-ledger-and-supersession` 等 family 的 resolver（engine 模块）、bounded question、结论与 verdict consumer 均不变；spec 侧修改为身份登记、索引补全、注记与重复删除，不改变任何结论内容。先例：`repair-work-unit-recovery-vocabulary-and-drift-guards`（改 engine 导出仍能论证 not_applicable）。reason 全文见 `semantic-closure.yaml`。

**D6 — 新增一个文本锁测试锁定本 change 的全部修复面。**
`tests/engine/delegated-queue-spec-text-locks.test.mjs`（node:test，unit 类）断言：DEW 重复 scenario 已变为合并声明（retention 注记在位、原独立 SHALL 三行不再出现）；AGQ drain requirement 含 scope note 锚点文本；两篇头部 `> req:` ID 集与正文 requirement 数一致；registry 含 DEW-027..029 / AGQ-028。这是把本次修复从"一次性编辑"变成"回归防护"的最短闭环，也符合 `verification-routing` 的 unit 类定义（in-process 确定性断言）。

## Risks / Trade-offs

- [list-doc-locks 盲点：`agent-experiment-autorun-terminology.test.mjs` 动态构造 spec 路径且文件内无 basename 字面量，盘点抓不到] → **已发生并按 closeout 规则修复**：该锁要求 agentic-queue 的任何活跃 delta 自含 "native completion"，但锚点均在本 delta 未触碰的 requirement 内；已把锁改为 post-archive retention 语义（delta 替换的 heading 由 delta 携带锚点 + 未触碰 main 块保留，并集匹配），意图不变、钝性消除（tasks 4.3）。盲点登记为后续工作。
- [`> req: AGQ-028` 在 delta 头部预引用未登记 ID，触发 `check-project-reqs --mode plan` exit 1] → **已验证为现状**（2026-08-30 实测：`Unregistered IDs (in specs/delta but not in registry): AGQ-028`，exit 1）。修复即任务 3.3 的 registry 同步；tasks 1.1 已把该输出定义为预期基线，5.1 归档检查最终清零。另注意 plan 模式不接受 `--change` 参数（仅 archive 模式接受）。
- [第三席 ID 归属的考古残余不确定（DEW-008 陈旧摘要对应哪个现行 heading）] → 任务 2.2 以 `git log -S` 比对裁定并记录映射表；done condition 绑定 checker 结果（0 unregistered / 0 orphan），错配由 `check-project-reqs --mode archive` 兜底。
- [内联 `> req:` 行加大 diff（约 57 行插入）] → 纯增量注记、无语义内容；`check-spec-req-ids` 与 D6 测试校验格式与计数。
- [scope note 为英文而部分仓库文档中英混排] → 遵循 `DEEP_RESEARCH_HARNESS/README.md` 语言约定（spec 控制面内 token 与边界说明保持单一主语言；两篇 spec 正文均为英文）。

## Migration Plan

Apply 顺序：先跑 plan 检查（closure / verification-routing 必须 PASS；reqs plan 预期报告 `AGQ-028 unregistered`——已验证基线，修复=任务 3.3）→ `list-doc-locks` 盘点 → 落地两篇 delta 到 main spec（DEW-009 合并声明替换、AGQ drain 注记）→ 头部索引补全 + 内联 req 行 → registry 同步 4 个新 ID → 新增/更新文本锁测试 → `governance:check` 全绿 → 两条收尾硬性检查 → 全量 `npm test`。回滚即 revert 对应提交；无运行时状态、无数据迁移。

## Open Questions

（无——A2 exit-code 裁决属 C2 change，不在本 change 范围。）