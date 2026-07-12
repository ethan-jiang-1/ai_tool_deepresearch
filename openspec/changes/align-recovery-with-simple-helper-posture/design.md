## Context

本 change 由同一个 incident 的三个视角共同触发：

- `_backlog/plans/human-override-and-state-mutability.md` 说明当前框架把 autonomous Agent 与明确在场的人类指令混成同一条 lane，导致人类 authority 也被 anti-cheating guardrail 一律锁死。
- `_backlog/plans/breakpoint-recovery-persistence-model.md` 说明恢复质量取决于中断前已经物化的 data、intent 和 progress；当前 work-first、persist-as-side-effect 的形状让未完成意图只能靠 chat 重建。
- `_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md` 说明当 sanctioned route 不可达时，Agent 会创建真实但 Engine-invisible 的平行结构，造成 topic identity、artifact、profile、status、queue 和 trace drift。

它们不是三件互不相干的需求，而是一条因果链：

```text
authority context is unclear
  -> Agent lacks a legal helper action
  -> work escapes the canonical path
  -> intent and progress are not materialized before work
  -> Engine cannot audit or recover the real run
```

从链条中间挑一个症状并直接增加 reentry authority、shared evaluator 或类似概念，仍会漏掉 action responsibility 与 persistence/canonicality 两端。当前设计先明确谁判断、谁执行、什么必须先落盘，再决定后续最少需要哪些 runtime changes。

## Goals / Non-Goals

**Goals:**

- 让当前 change 在设计上完整罩住两个 plan 与 BUG-079，而不是只把它们列作背景。
- 在 Charter 之后建立两个并列的 `evolution-*` charter-companion guidance，分别承载 net simplification 与 helper posture。
- 建立 autonomous 与 explicit human-directed 的 authority-context 区分，并进一步区分 human-directed 位于既有 HITL 还是 out-of-band maintenance/debug，同时不提前新增无法可靠认证的 lane state。
- 明确 helper responsibility：用户决定语义与授权，Agent 完成已授权机械工作，Engine 保持 deterministic authority。
- 采用 `materialize-before-work` 与 `canonical-or-blocked` 作为后续 persistence、scope change、recovery 和 authorized repair 的共同设计义务。
- 给出可逐步实施的依赖顺序，避免一次性重写，也避免各 follow-up change 再次独立发明自己的状态与控制链。
- 让 ACS-001、ACS-003、CDP-001、CDG-001、CDG-003、SCO-007、SHC-001、SHC-002、CDE-001 至 CDE-005 与现有 command docs、schema truth、phase/shared guidance、gate implementation、regression 和 controlled E2E 保持一致。

**Non-Goals:**

- 本轮不实现 arbitrary state jump、post-final reopen、authorized repair CLI、topic progress schema、crash sweep 或 canonical integrity Engine rule。
- 本轮不把 human-directed context 写成新的 persisted lifecycle state、session mode 或 authority token。
- 本轮不声称 Engine 能从共享 filesystem 或 Agent 提交的 flag 中认证“这句话一定来自人类”。
- 不正式化当前 ad-hoc `addendum/` namespace，也不将其描述为 accepted runtime path。
- 不实现 `_backlog/todos/todo-helper-not-tool.md` 中的 persona、memory 或 generic helper system。
- 不用 guideline prose 标记 BUG-079、P1/P2/P3 或 human override 为 runtime-fixed。

## Decisions

### 1. 当前 change 是基础契约，不是假装完成 runtime 修复

本 change 的 apply surface 有意限制在 guidance、现有 Agent-facing docs/generated summaries、13 个既有 requirements、既有 regression/controlled-E2E surfaces 和 version surfaces。它的系统性来自完整接住结果义务、清除同一 HITL2 contract 在 main specs、Markdown 与 experiments 中的漂移并固定后续依赖，而不是一次提交所有 runtime 机制。

归档后能够成立的是：

- 后续 recovery/override/addendum change 有一套共同的设计准入和责任边界；
- Agent-facing command contract 不再把普通机械工作推给用户；
- autonomous 与 human-directed authority 不再混为一谈，human-directed 位于 HITL 还是 out-of-band 也有清楚位置；
- content-delivery main specs 与现行 HITL2 five-enum/repair/rerun implementation 不再互相矛盾；
- shared profile/gate summary 与 delivery experiments 不再继续宣讲旧四枚举、blocking trace rule 或 Agent-level restart-from-instantiation route；
- 两个 plan 与 BUG-079 的 obligation 有明确 coverage 和 staged landing path。

归档后不能声称的是：

- post-final 已能合法重入；
- 任意 node 已能 state-seed；
- user intent/progress 已自动 materialize；
- orphan temporary files 已能 sweep；
- canonical drift 已被 Engine 自动检测。

**Alternative considered:** 把所有 runtime 能力放进一个超大 apply。拒绝，因为 persistence、canonicality 与 authorized mutation 的 Source of Record 和风险不同；一次实现会迫使方案先发明通用 controller，再用大量条件兼容历史路径。

### 2. 用两个并列文件表达两条 Evolution Directions

Simplicity 与 helper posture 都是未来演进方向，但性质正交：前者评审系统形状，后者评审行动责任。让一个文件同时拥有两者，会把 Engine/checker 复杂度、用户交互、authority context 和 Agent posture 混成一份大而全的规则集。

因此 Charter 之下建立两个并列文件：

| Canonical file | Axis | Owns | Does not own |
|---|---|---|---|
| `evolution-simple-reliable-control.md` | `simplicity` | shortest correct loop、direct authority、net simplification、blocking burden、gradual convergence | Agent/user interaction semantics、领域 workflow behavior、runtime terminology |
| `evolution-helper-oriented-agent.md` | `agency` | tool-to-helper direction、autonomous/human-directed authority、HITL/out-of-band placement、human decision vs Agent execution、escalation boundary | Engine verdict、state transition、permission grant、persona/memory/helper subsystem |

两份 canonical 文件继续使用现有 guideline frontmatter vocabulary，不新增 `family` / `axis` 等没有 consumer 的分类字段：

- `evolution-simple-reliable-control.md` 保留既有 `guideline_id: simple-reliable-control`，因为原则本身没有被替换，变化的是文件发现路径与 title。
- `evolution-helper-oriented-agent.md` 使用 `guideline_id: helper-oriented-agent`，作为新的 agency-axis 概念身份。
- 两者使用 `authority: guidance`，并在 `defers_to` 中显式包含 `guidelines/project-charter.md`；title 使用带引号的 `"Evolution Direction: ..."`，避免 YAML 中未转义冒号造成 frontmatter 解析歧义。
- 旧路径 `simple-reliable-control.md` 只是普通 Markdown compatibility notice，不带 guideline frontmatter、不分配第三个 `guideline_id`。

两份 canonical title 都以 `Evolution Direction:` 开头。两者都是 **charter-companion guidance**：位于 `project-charter.md` 之后、mechanism guidance 之前；它们解释未来 design 应朝哪里收敛，但不能覆盖 accepted specs、executable contracts 或 runtime truth。共同 `evolution-` 文件名前缀、title prefix、Charter/README 路由已经足以表达两者是一组，不再创建额外 metadata taxonomy。

“宪章级指导”在本 change 中不是宣传性标签，而是以下文档契约：

1. **Stable direction**：正文只保留跨 incident、跨 capability 都成立的长期方向，不把当前 backlog、临时 slice 或某个命令写成永恒原则。
2. **Normative guidance**：对新 proposal/design 使用足够的 MUST/MUST NOT、准入问题和拒绝边界，使 Agent/reviewer 能据此作出一致判断，而不是只表达愿景。
3. **Explicit precedence**：明确服从 `AGENTS.md`、`openspec/config.yaml`、accepted specs、executable contracts、runtime truth 与 Project Charter；guidance 不能凭 prose 改写当前行为。
4. **Actionable routing**：说明何时必须读取该文件、它裁决哪一类设计问题、问题通过后去哪个 OpenSpec/spec/runtime surface 落地。
5. **Gradual convergence**：对新 work 严格，对历史复杂度不授权 big-bang rewrite；每次触碰相关 surface 时要求可验证的局部收敛。
6. **Owned boundary**：每份文件清楚声明 own / does-not-own，既不互抄，也不形成第三种 state、controller、metadata taxonomy 或 capability authority。

两份文件采用共同的 charter-grade skeleton，但不复制内容：

1. `Purpose`：说明该 axis 为什么是长期方向。
2. `Standing And Precedence`：对新 work 严格、对历史实现渐进；明确 defers to Charter/spec/runtime truth。
3. `Core Direction`：该 axis 的一个核心判断。
4. `Non-Negotiable Disciplines`：只保留该 axis 自己的 MUST/MUST NOT。
5. `Gradual Convergence`：触碰旧 surface 时如何局部变好，不授权 big-bang rewrite。
6. Focused review：`Simplicity Admission Test` 或 `Helper Direction Review`。
7. `Boundary`：明确该文件不拥有的行为与 authority。

这使它们具备宪章指导的稳定性，而不是两篇倡议文章。Normative language 约束未来 proposal/design 的方向；当前 runtime 行为仍只能通过 OpenSpec/spec/apply 改变。

`guidelines/README.md` 的 reading order 和 guidance map 只展示这两个 canonical `evolution-*` 文件。Proposal/design 保留两个 plan、BUG-079 和 incident 的具体 coverage；两个长期指导文件只吸收抽象原则，不复制 backlog 路径和事故细节。

Index 还要给出 paired-loading route：当工作涉及新 OpenSpec design、复杂 recovery/mutation、或 Agent/user responsibility 时，默认一起加载两个 `evolution-*` 文件；随后由 simplicity axis 判断系统形状，由 agency axis 判断行动责任。这样共同前缀不仅用于排序，也对应真实使用方式。

**Alternative considered:** 继续让 simplicity 文件同时承担 helper direction。拒绝，因为会重新制造职责混合，未来每次修改 interaction posture 都要触碰 complexity guideline。

**Alternative considered:** 只在 title/frontmatter 使用共同前缀、文件名不改。拒绝，因为用户的主要工作方式是把两个文件一起拖入对话；共同 `evolution-` 文件名前缀能在文件选择器中稳定相邻。

### 3. 路径迁移必须覆盖 active 与 historical readers

当前旧路径在 16 个非 archive 文件和 2 个 archived OpenSpec design 中出现。迁移策略按 active navigation 与 historical text 分开：

| Surface | Current impact | Migration |
|---|---:|---|
| Charter/index | 2 files | 更新 reading order、precedence、routes、map、siblings |
| Mechanism/support guidelines | 7 files | 更新 frontmatter siblings、prose links、related guidance |
| Current active backlog plans | 2 files | 更新 design-principle links，并同时引用 helper direction |
| Current OpenSpec change artifacts | 3 files | 使用两个 canonical names 和 redirect contract |
| Old canonical file itself | 1 file | 替换为普通 Markdown compatibility notice |
| Closed historical plan | 1 file | 不改历史文本；通过 compatibility notice 保持链接可达 |
| Archived OpenSpec designs | 2 files | 不改历史文本；通过 compatibility notice 保持链接可达 |

1. 将完整 canonical 内容迁到 `evolution-simple-reliable-control.md`，保留 `guideline_id: simple-reliable-control`，更新 title、role、scope、defers_to 和 sibling list。
2. 新建 `evolution-helper-oriented-agent.md`，与 simplicity 文件并列。
3. 更新 active canonical references：Project Charter、Guidelines Index、所有 mechanism/support guidelines、两个 active backlog plans 和本 change artifacts 中的 canonical links；本 change 对旧路径的文字仅保留为 migration-contract 说明。
4. 不修改 closed historical plan 与 archived OpenSpec 历史记录；旧 `simple-reliable-control.md` 变成一个短普通 Markdown compatibility notice，只链接 canonical target。
5. Compatibility notice 不带 guideline frontmatter，不进入 reading order、Guidance Map 或 Evolution Directions 列表，也不承载任何独立原则。

这样 canonical guidance 仍然只有两份，同时不破坏 historical relative links。Notice 是路径兼容面，不是第三条 direction，也不需要新 ID、status enum 或 metadata contract。

**Alternative considered:** 删除旧路径并接受 archive broken links。拒绝，因为重要 charter guidance 的 rename 应罩住历史可读性。

**Alternative considered:** 批量修改 archive。拒绝，因为 archived OpenSpec 是历史记录，不应为了当前文件组织重写。

**Alternative considered:** 让 canonical simplicity 文件的 `guideline_id` 跟随 filename 改成 `evolution-simple-reliable-control`。拒绝，因为这次没有替换其概念身份；同时改 path 和 ID 会扩大迁移面，并让未来 reader 误以为旧、新是两条不同原则。

**Alternative considered:** 新增 `family` / `axis` 字段和 redirect 专用 guideline ID。拒绝，因为 repo 没有 consumer，文件名前缀、title 和 reading route 已经提供同样信息；新增 metadata 只会制造新的概念和验证负担。

#### Active migration manifest

Apply 必须逐项覆盖以下 active navigation/reference surfaces，不能只依赖一个总数：

- Charter/index：`guidelines/project-charter.md`、`guidelines/README.md`。
- Mechanism/support guidance：`guidelines/agentic-execution-model.md`、`guidelines/agentic-queue-mechanism.md`、`guidelines/agentic-subagent-mechanism.md`、`guidelines/agentic-workflow-mechanism.md`、`guidelines/command-experiments.md`、`guidelines/framework-runtime-boundary.md`、`guidelines/logging-conventions.md`。
- Active backlog planning：`_backlog/plans/human-override-and-state-mutability.md`、`_backlog/plans/breakpoint-recovery-persistence-model.md`。
- Current change migration contract：`proposal.md`、`design.md`、`tasks.md`。
- Compatibility surface：`guidelines/simple-reliable-control.md`。

Historical surfaces intentionally left unchanged:

- `_backlog/_done/_closed_plans/bugs-069-075-openspec-change-slicing.md`。
- `openspec/changes/archive/2026-07-10-simplify-and-reuse-wave-contract-checks/design.md`。
- `openspec/changes/archive/2026-07-11-put-continuation-cues-at-decision-points/design.md`。

迁移验收按 reference 类型判断，而不是粗暴要求 repo 中完全没有旧 basename：

1. Charter/index、mechanism/support guidance 和 backlog navigation links 必须全部指向 `evolution-simple-reliable-control.md`；两个 active plans 还必须同时指向 helper direction。
2. 旧 basename 只能在 compatibility notice、closed/archive historical text，以及本 change 对 rename/notice 的 migration-contract 说明中出现；这些出现不得成为 active reading route、sibling 或 active design-principle canonical link。
3. Closed plan 与两个 archive design 保持 byte-for-byte 未修改，并继续通过旧路径文件找到 canonical target。
4. `project-charter.md` 与 `guidelines/README.md` 必须只把两个 canonical `evolution-*` 文件列为 Evolution Directions；notice 不进入 reading order 或 Guidance Map。
5. Apply 后的搜索必须使用能区分旧 basename 与 `evolution-simple-reliable-control.md` 的表达式，例如 `rg -P '(?<!evolution-)simple-reliable-control\\.md'`；普通 substring 搜索会把新文件名误报成旧引用。

### 4. 用三个轴统一系统模型

后续相关 change 必须同时回答三个轴，而不是各自只修一个文件：

| Axis | 问题 | Stable responsibility |
|---|---|---|
| Authority context | 当前是 Agent 自驱，还是人通过 HITL 或 out-of-band maintenance/debug 明确给出决定？ | Agent 从 conversation context 判断语义；Engine 不猜人类意图，也不把该判断当 mutation authority |
| Action responsibility | 谁决定，谁执行，谁裁决？ | 用户决定新语义/风险/权限；Agent 执行已授权机械工作；Engine 裁决 deterministic contract |
| Persistence/canonicality | 决定和工作如何在中断前成为可恢复事实？ | 先写 accepted canonical Source of Record，再做内容工作；没有 canonical path 就阻塞 |

这三个轴解释了为什么单独增加 reentry condition 不够：即使能移动 node，如果 intent 没落盘、topic 没 canonical identity、artifact write 不 crash-safe，恢复仍然失败；反过来，只有进度 state 而没有合法 human-directed action，用户仍然只能手改。

### 5. Authority source 与 interaction placement 是两个维度

第一维是 authority source：

- `autonomous`：Agent 根据既有 goal、spec 和 Engine feedback 自主推进，没有新的用户指令。
- `human-directed`：用户明确给出新的语义决定、修正目标或调试/维护指令。

第二维是 interaction placement：

- `in-run HITL`：HITL1/HITL2 是 accepted lifecycle 内承接 human-directed decision 的位置。
- `out-of-band maintenance/debug`：用户在 autonomous lifecycle 之外明确进入恢复、调试或修正协作；它不是额外 lifecycle checkpoint。

#### Autonomous behavior

- `RUN.md` 交权后，非 HITL lifecycle step 默认是 autonomous。
- anti-cheating、gate、transition、receipt 和 trace contract 继续 fail closed。
- Agent 不因自己认为用户“可能会同意”而扩大权限或绕过 transition。

#### Human-directed behavior

- 在 HITL1/HITL2 中，人类决定属于 accepted in-run authority boundary，不应被描述为 Agent 自驱决定。
- 在 out-of-band maintenance/debug 中，用户已经明确在场，但该对话本身不自动创建 runtime mutation capability，也不是 Final-owned repair loop。
- Agent 应读取直接状态、运行现有 diagnostics、解释前置条件，并执行现有 contract 已允许且已授权的机械动作。
- 若目标需要当前不存在的 mutation/reentry contract，Agent 必须说明缺口；未来 authorized-repair change 再定义合法 Engine path。

本轮不新增 `lane: human_directed` 字段。共享 filesystem、CLI flag 或 Agent 写入的 artifact 都不能单独证明“人类本人授权”；若未来需要 machine-authenticated authority，必须先选择可信 host signal。当前设计只承诺 explicit、durable、auditable，不假称 cryptographic authentication 已解决。

**Alternative considered:** 立即增加 `--human-override --reason`。拒绝，因为 Agent 自己也能传 flag；在没有可信 authority signal 时，这只是一个新后门形状，不是真正的 lane separation。

### 6. Helper flow 是责任分配，不是 helper subsystem

统一协作闭环：

```text
user goal
  -> Agent inspects direct runtime truth and existing legal paths
  -> Engine/check returns prerequisite, blocker, and legal next action
  -> Agent explains only the smallest decision boundary
  -> user decides new semantics / destructive action / permission expansion when needed
  -> Agent materializes the accepted intent through an existing canonical contract
  -> Agent executes authorized reversible mechanical work
  -> Engine audits and the Agent reruns the same checkpoint
```

如果用户目标、现有权限、accepted contract 和 direct facts 已经决定下一步，Agent 不应只输出命令让用户自己跑。若无合法路径，helper behavior 是把缺失 contract 说清楚，而不是手写 status/trace 或自建 namespace。

`human-directed` 描述决定来源，不改变 command executor。需要新的语义选择、破坏性/不可逆动作或权限扩张时，Agent 先取得 accepted human decision；一旦该决定已记录且合法 Engine path 存在，Agent 继续执行后续机械步骤。只有 host policy 本身要求人类直接操作时，才把那一个不可代理动作交还用户，而不是把整条修复流程推回去。

该 flow 不要求 persona、memory、planner service 或 generic repair controller。它只是明确已有 Agent、Engine、user 三者的责任。

以用户明确要求移动 node 为例：Agent 先读取 `rb_status.json`、trace 与现有 reentry/transition diagnostics，告诉用户目标 node 的直接前置条件、当前缺口和现有合法路径；若现有 contract 已允许且用户决定已记录，Agent 应亲自执行所需命令并复跑检查。若没有合法 mutation/reentry path，Agent 应明确指出缺失的是 Engine contract，而不是把一串手改文件步骤交给用户或声称“同意”本身已经创造 transition authority。

### 7. `materialize-before-work` 与 `canonical-or-blocked` 是共同恢复义务

后续 runtime changes 必须共同满足：

```text
accepted human intent
  -> minimal canonical identity and requested scope
  -> recoverable progress registration
  -> content/data acquisition begins
  -> newly acquired data is crash-safe persisted before downstream transformation
  -> deterministic audit and transition
```

`materialize-before-work` 的“before”按事实类型解释：intent/identity/progress 在对应 work unit 开始前物化；未知研究内容不预填；外部数据在第一次取得时立即持久化，再进入提取、综合或交付。它不是要求一次性创建完整 dossier、所有 wave artifact 或未来结论。

`canonical-or-blocked` 只约束 durable run truth 和被消费为正式结果的产物。可重建 scratch、下载临时文件和 cache 可以使用非最终路径，但必须有明确生命周期，不能成为 intent/progress/provenance 的唯一记录，也不能以临时路径直接形成交付成功 authority。

对应来源义务：

- P1：数据过手即存，写入路径 crash-safe，孤儿临时文件可判定。
- P2：状态即意图要存，恢复时能区分 never-started / in-progress / delivered。
- P3：重要用户输入在接收当刻物化，不能等产出物反向证明意图。
- BUG-079：新增 topic/scope 必须进入 canonical identity、artifact、progress、profile 与 trace 可见路径；不得创建 Engine-invisible parallel namespace。
- Human-override plan A/B：topic identity 必须有一个 canonical owner；rename/renumber/authorized repair 应通过原子 Engine operation 更新或派生相关 surfaces，不能继续要求人或 Agent 手工同步 N 处。
- BUG-079 fix D：deterministic advice 只能给当前状态下真实可达的最近动作；若 sanctioned path 不存在，应直接报告缺失 contract，不能输出已知会被同一 preflight 再次挡回的循环建议。

本 change 不选择新的 progress schema，也不宣布 `rb_status.json`、`rb_queue.json` 或 trace 中哪一个将拥有 per-topic progress。后续 P2 change 必须先明确唯一 Source of Record，避免三处双写。

后续 recovery contract 的共同验收是：不依赖 chat memory，只凭 active bundle disk truth 能回答计划中的全部 topic、每个 topic/wave 的进度、是否存在已过手但未 finalize 的数据、最近重要用户输入，以及唯一最近下一动作。任何 slice 若不能改善这五个问题中的至少一个，就没有真正推进 breakpoint recovery。

### 8. 优先恢复 canonical path，不默认发明 addendum path

对 post-final 新增 scope，默认设计偏好是修复合法 rerun/reentry，使工作重新经过已有 canonical wave path。只有在 gated rerun 无法表达真实业务需求时，才考虑一等 addendum contract；若新增 addendum，它必须复用 canonical topic identity、progress、artifact 和 audit rules，不得保留一套平行成功 authority。

这不是提前决定 BUG-078 的具体 transition，而是排除最危险的成功形状：真实工作完成了，但 Engine 与恢复工具完全看不见。

### 9. 后续落地按安全依赖分片

| Slice | 覆盖义务 | 依赖与净简化要求 | Exit evidence |
|---|---|---|---|
| Foundation（本 change） | 两份 Evolution Direction charter guidance、helper responsibility、context distinction、path migration、coverage map、ACS/SCO/CDP/CDG/SHC/CDE alignment | 不改 Engine/schema/runtime state | 两个 canonical `evolution-*` 文件职责互斥且并列；active refs 迁移，HITL2 main specs/Markdown/controlled E2E 使用同一 contract，historical links 仍可达；两个 plan 与 BUG-079 保持 open |
| Durability | P1 crash-safe writes 与 orphan finalize/discard | 优先复用现有 atomic-write helper；不得给每类 artifact 各造一套 journal | 注入“数据写完、rename 前崩溃”后能 deterministic finalize-or-discard，且没有丢失已确认完整的数据 |
| Visibility safety net | BUG-079 canonical integrity audit 与 impossible-advice detection | 优先扩展现有 audit/inspect/check feedback path；只有现有 ownership 不匹配时才新增 CLI | 能在 incident-shaped fixture 中报告悬空 topic、Engine-invisible durable output 和不可达 advice，而不产生级联噪声 |
| Canonical materialization | P2/P3 intent、single-source topic identity、atomic rename/renumber 与 progress 在 work 前落盘 | 必须先选唯一 identity/progress Source of Record，删除/避免平行 addendum authority 和跨 N surface 手工同步 | 用户新增 scope 后立即中断，disk truth 仍能恢复最小意图、identity、progress 和 next action；rename/renumber 不需手工同步 N 处 |
| Authorized repair | human-directed audited mutation、reentry/state-seed | 依赖 integrity audit 与 canonical materialization；必须解决 authorization signal、mutation boundary 与 rollback | 同一 mutation 在 autonomous context 被拒绝，在 accepted human-directed context 被审计执行，随后 integrity audit 通过或给出一个最近修复动作 |

Durability 与 visibility safety net 可以独立先行；authorized repair 必须最后，因为没有审计网和 canonical truth 的 override 只会更快制造 drift。

这些 slice 是**依赖带**，不是预先规定“一带只能有一个 OpenSpec change”。特别是 Canonical Materialization 同时包含 progress、input materialization、topic identity 和 atomic rename/renumber，后续必须按 Source of Record 与 failure mode 再切；不得为了匹配本表把它们硬塞进一个大 change。Visibility 中的 integrity audit 与 impossible-advice correction 若 ownership 不同，也应拆成独立 change。

### 10. Cross-capability ownership audit 决定 delta 边界

Guideline 只指方向；accepted behavior 只能由 capability delta 改变。本 change 对相关 main specs 的处理如下：

| Capability | Current ownership / observed fact | This change |
|---|---|---|
| `agent-command-surface` | 命令 audience、human co-runner 边界、顶层 command docs 与 static wording regression | **MODIFIED** ACS-001/003：定义 Agent-owned ordinary execution、human-directed decision source 与 no-ad-hoc-authority；更新 `COMMANDS.md` 和现有 static test |
| `content-delivery-phase-content` | HITL2 phase 的用户决定、repair/rerun action responsibility 与 Final feedback route | **MODIFIED** CDP-001：删除 stale `repair_and_rerun` / restart-from-instantiation，按现行五枚举区分 `repair` 就地修复与 `rerun` 进入 `phase-rerun`；修正 phase 顶部残留矛盾文字。**DEFERRED** CDP-004 的 post-final route 可达性与 input materialization，不把文字 contract 当 BUG-078 已修 |
| `content-delivery-gate-implementation` | HITL2 gate 接受的 enum、definition rule set 与 deterministic handoff output | **MODIFIED** CDG-001/003：对齐现行 definition/CLI；`repair` / `rerun` 合法，移除 stale blocking `hitl2_recorded` rule，只有 `proceed_to_readiness` / `rerun` 产生 fixed handoff |
| `schema-core` | `HITL2UserDecision` schema enum 是 `not_started` sentinel 加五个 recorded action values；SCO-001 已要求 current 11-value `CurrentGate` | **MODIFIED** SCO-007：修正 accepted spec/test 描述中的“5 values”，明确 sentinel 不等于 gate-pass decision；同时补齐 SCO-001 现有 11-value enum regression coverage；schema implementation 不变 |
| `shared-node-content` | `shared-profile.md` 解释 profile enum/route；`shared-gate-rules.md` 是 definition/CLI 的 generated summary | **MODIFIED** SHC-001/002：把旧四枚举改为现行 five-enum，明确 `rerun` 经 `phase-rerun`；generated summary 删除 stale blocking `hitl2_recorded` trace rule，并保留 source-window preflight 与 diagnostic event 的边界 |
| `content-delivery-experiments` | delivery controlled E2E 的 canonical case paths、fixtures、gate verdict 与 rerun branch proof | **MODIFIED** CDE-001..005：指向现有 `exp_wff_delivery/case-131` 至 `case-135`；所有 HITL2 case 使用真实 predecessor handoff/source window，case-133 验证 gate 直接产生 `phase-rerun` target，不再证明旧 Agent-level restart route |
| `hitl-ux` | HITL1/HITL2 人在环对话；HIU-003 已规定用户决定、Agent 写 profile、Agent repair/rerun | **REVIEWED, UNCHANGED**：已经满足 human decision -> Agent execution；本 change 不复制 ACS 术语，不扩展 HITL placement |
| `silent-wave-execution` | `stop:no` 用户缺席时禁止 surfacing，并要求 Agent repair/continue/hold | **REVIEWED, UNCHANGED**：helper posture 不能把 human-directed 语义带入 autonomous lane；SWE invariants 原样保留 |
| `check-inspect-feedback` | 最小根因、一个最近 repair target、避免 manual authority edit、修复后回同一 Check | **REVIEWED, UNCHANGED**：反馈形状已经兼容；ACS 决定 ordinary command executor，CHI 不重复 audience ownership |
| `runtime-reentry-debuggability` | `check-reentry` 是 read-only consistency/diagnostic surface，能报告 blocker/drift，但不能 mutation | **REVIEWED, DEFERRED**：本 change 只要求 Agent 读取其输出并解释合法边界；impossible advice、state-seed 和 authorized mutation 分别留给 Visibility / Authorized Repair delta |
| `rerun-incremental-node` + `transition-table` | 现行 truth 已有 `repair` / `rerun` 分离、`rerun` fixed edge、incoming rerun status window 与 max-rerun behavior | **REVIEWED, UNCHANGED**：作为 reconciliation anchor；修正 G14/G24 active playbook consumers，不新增 rerun route 或 requirement |
| `gate-skeleton` + `cli-phase-transition` + `workflow-node-contract` | branch-sensitive gate output、route-bound handoff witness 与 source-gate status synchronization 的现行 shared contract | **REVIEWED, UNCHANGED**：CDE cases 必须复用这些 contract，不在 delivery capability 另造 handoff/preflight 语义 |
| `agent-testing` + `playbook-runner` | standard E2E 已要求 HITL2 proceed/rerun 使用 real gate output；runner manifest 必须与 current/migrated case truth 一致 | **REVIEWED, UNCHANGED**：作为 G5/G13/G14/G24 的 proof/index anchor；更新 active consumers 与 `RUN_EXPS.md`，不复制 AGT/PLR requirement |
| `rerun-topic-integration` + `seed-topic-materialization` | rerun output provenance、topic registry 与 seed materialization 的现有 canonical contracts | **REVIEWED, DEFERRED**：本轮不实现 P2/P3、single-source identity 或 post-final materialization |
| `repair-loop` | deterministic repair checkpoint transform，不拥有 Agent semantic repair strategy | **REVIEWED, UNCHANGED**：helper responsibility 不得把 REL 扩成 generic Agent helper controller |
| `version-management` | Agent-facing framework behavior 变化必须更新 CHANGELOG 与 RUN banner，版本在 proposal 决定 | **REVIEWED, EXISTING CONTRACT APPLIES**：不修改 VEM spec；按现有 VEM-002/003/004 bump 到 `v0.21` |

这个矩阵的判定规则是：

1. 本 change 改变现有 capability 的 accepted semantics，就必须有该 capability 的 delta spec。
2. 既有 main spec 已经表达所需 invariant，则记录 reviewed/unchanged，不复制一份近似 requirement。
3. 目标需要 runtime capability 但本轮明确不实现，则记录 reviewed/deferred，并点名未来 delta owner；guideline 不得假装已经影响该 capability。

本次审计还发现同一组 2026-06-23 旧 contract 散落在六个 capability：CDP-001/CDG-001/CDG-003 保留 `repair_and_rerun`、blocking `hitl2_recorded` rule 或 incomplete routing；SCO-007 把实际六值的 `HITL2UserDecision` 写成五值；SHC-001/002 仍描述旧 profile fields/enum 与旧 generated gate summary；CDE-001..005 仍指向已迁移的 playbook paths，其中 CDE-004 和 `case-133` 继续证明“chain 只到 readiness、Agent restart from instantiation”。现行 schema、gate definition/CLI、HIU-003、REI、transition chain 与标准 E2E 已使用 `not_started` sentinel 加五个 recorded decisions，并由 gate CLI 为 `rerun` 直接产生 `phase-rerun` handoff。`phase-hitl2.md` 主体已基本使用该模型，但顶部和失败表仍有旧 wording；`shared-profile.md`、`shared-gate-rules.md` 与 `RUN_EXPS.md` 也有相应 projection drift。因此本 change 以现行 executable truth 为 anchor，同步六个 capability delta、修正所有已识别的 active consumer surface 并重新执行既有 delivery cases；不修改 Engine runtime logic。

### 11. ACS、CDP、CDG、SCO、SHC 与 CDE 一起修改

ACS-001 定义 Agent-facing audience 与 action responsibility；ACS-003 已要求 static regression 验证 Agent-facing positive markers。SCO 拥有 schema enum，CDP/CDG 拥有 HITL2 phase 与 gate behavior，SHC 拥有 Agent 实际会读取的 shared projection，CDE 拥有受控 E2E 对该 contract 的证明。只修改 ACS 或只修 CDP/CDG，会让新的 helper 语言、schema description、shared guidance 和 experiments 继续互相矛盾。

因此本 change：

- 在 ACS-001 中加入 Agent-owned ordinary execution、repairable blocker、autonomous/human-directed authority distinction、HITL/out-of-band placement distinction 与 no-ad-hoc-authority 边界；
- 在 ACS-003 中要求现有 validator/test 只在顶层 `COMMANDS.md` audience contract 验证这些新增 positive markers；其他 scanned surfaces 继续只做 drift/phrase-class 检查，避免复制整段原则；
- 在 CDP-001 中恢复现行五枚举和两种不同动作：`repair` 由 Agent 就地修复并 rerun HITL2 gate，`rerun` 由 gate/chain 固定路由到 `phase-rerun`；同步修正 `phase-hitl2.md` 顶部 stale summary；
- 在 CDG-001 中把 definition rule set 与当前 implementation 对齐，删除已移除的 blocking `hitl2_recorded` event rule；在 CDG-003 中明确 five-enum 到 deterministic outcome 的映射，并保留 CLI 自己写 `gate_attempt` 的 contract；
- 在 SCO-007 中明确 `HITL2UserDecision` 的六个 schema values 与五个 recorded gate decisions 的关系，并修正现有 enum test 名称；
- 在 SHC-001 中把 shared profile 的 HITL2 enum/route 改为现行 five-enum；在 SHC-002 中要求 generated summary 准确投影 definition/CLI，不再把 diagnostic `hitl2_recorded` event 写成 blocking rule；
- 在 CDE-001..005 中迁移到现有 `exp_wff_delivery/case-131` 至 `case-135` paths，并要求所有 HITL2 fixtures 建立真实 predecessor handoff/source window；case-133 必须消费 gate CLI 的真实 `phase-rerun` target，禁止手写 rerun `gate_attempt` 或证明旧 Agent-level readiness override；
- 扩展 `tests/engine/command-contract-docs.test.mjs` 的现有 marker list，并复跑现有 enum/profile/HITL2 gate/transition tests；不增加 validator、phrase class 或新的 test harness。
- 更新并逐个执行既有五个 delivery playbooks；这不是新 experiment family，而是让 accepted controlled E2E 恢复为可运行的现行 contract proof。

Requirement traceability 也保持边界清楚：ACS-001/ACS-003 的 normative implementation 是 `COMMANDS.md` 与现有 static regression；SCO/CDP/CDG/SHC 是 main-spec 与 schema/phase/shared projections 的 reconciliation；CDE 由现有 delivery playbooks 和真实执行结果证明。Guideline/Charter/index tasks 只标为“支持”相关 requirements 的设计上下文，不声称 net simplification 本身已经成为新的 accepted capability，也不因此分配新 ID。Registry 中 13 个 modified requirement 的稳定描述同步更新，但不分配新 ID。

#### Apply target manifest

| Band | Writable targets during `/opsx:apply` | Read-only anchors / exclusion |
|---|---|---|
| Evolution guidance | 两个 canonical `guidelines/evolution-*.md`、旧路径 notice、Project Charter、Guidelines Index、7 个 active mechanism/support guideline references、2 个 active source-plan links | closed plan 与 `openspec/changes/archive/` 保持不变 |
| Agent-facing contract/projections | `DPT_FRAMEWORK/COMMANDS.md`、`phase-hitl2.md`、`shared-profile.md`、`shared-gate-rules.md` | `schema/enums.mjs`、profile schema、gate definition/CLI、transition chain、handoff/status Engine logic 只作 truth anchor，不修改 |
| Regression | `tests/schema/enums.test.mjs`、`tests/engine/command-contract-docs.test.mjs`、`tests/integration/cli/check-gate-hitl2-recorded.test.mjs` | 不新增 test harness、validator 或 prose classifier |
| Controlled E2E | G13 `case-131` 至 `case-135`、G14 `case-140` 至 `case-142`、G24 `case-301` 至 `case-306`、G5 `case-51`/`case-52`、`experiments_playbook/RUN_EXPS.md` | 不新增 experiment family、runner 或 helper subsystem；逐 case 执行，不能用批量等价脚本替代 |
| Governance/release | requirement registry 中 13 个既有 ID 的描述、repo-root `CHANGELOG.md`、`DPT_FRAMEWORK/RUN.md` | 不分配新 ID，不修改 capability ID，不关闭两个 plan 或 BUG-079 |

这个 manifest 是 scope fence，不是新的 registry。它只把 proposal、delta 与 tasks 已经要求的 target 汇总到一处，避免 apply 时再次靠搜索猜影响面。

### 12. 两个文件拥有各自 focused review，不再混成三问

`evolution-simple-reliable-control.md` 的 `Simplicity Admission Test` 只回答：

1. 最短合法闭环和直接 Source of Record 是什么？
2. 这个 change 删除、合并或避免了哪份复杂度？若只增加，为什么是不可避免的确定性底线？

`evolution-helper-oriented-agent.md` 的 `Helper Direction Review` 只回答：

1. 哪个决定确实需要用户，而不是 Agent 可以在现有授权内完成的机械工作？
2. 用户决定或完成不可代理动作后，哪些步骤应立即回到 Agent 执行？

现有 direct authority、state ownership、short-circuit、same-check repair、fail-closed、testability、真实执行证据和 compatibility retirement 继续留在 simplicity 文件的详细 disciplines。Authority context、escalation、no-command-runner-transfer 和行动边界上的 no-fabrication 留在 helper 文件：前者约束“验证不能靠假证据”，后者约束“Agent 不能为帮助用户而手写 authority/evidence 或假造权限”。

`project-charter.md` 的 `Guideline Change Checklist` 保留 authority/layer checks，并分别链接两个 focused review。Charter 检查“有没有越权”，Simplicity 检查“有没有变复杂”，Helper Direction 检查“有没有把工作错误地推给用户”。

## Risks / Trade-offs

- [基础契约被误认为 BUG 已修复] -> Proposal、guideline 和 tasks 均明确 current apply 与 follow-up runtime obligations；归档不得关闭两个 plan 或 BUG-079。
- [human-directed context 被当成 Agent 可自授 override] -> 本轮不提供 override flag/state；未来 change 必须先解决 authorization signal 与 audit boundary。
- [两种上下文演变成全局 mode state] -> 当前只做语义和文档区分；任何 persisted mode 需要独立 Source-of-Record 论证。
- [`human-directed` 被理解成人类负责跑命令] -> 明确它只描述决定来源；合法执行仍由 Agent 完成，除非 host policy 要求人类亲自完成不可代理动作。
- [guideline promotion 形成新 authority] -> Charter、README 与 guideline 同时保留 accepted specs/executable/runtime precedence。
- [两个 evolution 文件继续重复] -> 用 axis/owns/does-not-own 明确排他边界；共同内容只保留在 Charter，不在两份文件互抄。
- [重命名破坏 active 或 historical links] -> 全量迁移 active refs，保留普通 Markdown compatibility notice，closed plan/archive 不改写。
- [两个 focused review 过度删减安全检查] -> Simplicity Admission Test 不替代其 detailed disciplines，Helper Direction Review 不替代 authority/escalation/truthfulness boundaries；两者只提供短入口。
- [只改 ACS 导致其他 capability 仍然漂移] -> Cross-capability audit 明确 modified/reviewed/deferred；本轮补 SCO/CDP/CDG/SHC/CDE delta 清理同一 HITL2 contract 的已确认漂移，其余 capability 不复制 requirement。
- [只修 main gate spec，shared guidance/experiments 继续过时] -> 同步 SHC-001/002 与 CDE-001..005，更新现有 shared projections、delivery cases 和 RUN_EXPS index，并逐个真实执行 cases。
- [experiment reconciliation 扩成无边界重写] -> 只纳入当前 runner 中直接消费 HITL2/rerun/readiness affected contract 的 G5/G13/G14/G24 cases；不改其他 experiment family，不新增 runner/helper，并用 Apply target manifest 锁定文件清单。
- [借 spec reconciliation 偷带 runtime behavior] -> SCO/CDP/CDG/SHC/CDE delta 只能描述当前 schema/gate/chain、phase/shared projections 与 real experiment path 已证明的行为；apply 只修正已确认的 spec/prose/test/playbook drift，若 Engine logic 不满足则停止并另立行为 change。
- [staged roadmap 变成永久不落地] -> Proposal/design 的 Source Coverage 固定每个 obligation 的 follow-up slice；后续 proposal 必须引用对应来源与依赖，不得宣布无关。
- [existing static test 变得更脆] -> 只检查少量稳定 audience markers，不增加 prose-quality regex 或 blocking phrase taxonomy。
- [gated rerun 与 formal addendum 长期双轨] -> 默认优先 canonical rerun；若 addendum 获批，design 必须说明删除或统一哪条成功 authority。
- [`canonical-or-blocked` 阻止正常 scratch/cache] -> 只约束 durable truth 和正式结果；临时 surface 可存在，但必须可重建、可清理且不能成为唯一 authority。

## Migration Plan

1. 将完整 simplicity guidance 迁移到 `evolution-simple-reliable-control.md`，并把旧路径改成普通 Markdown compatibility notice。
2. 新建 `evolution-helper-oriented-agent.md`，只承载 helper/agency 方向。
3. 更新 Project Charter、Guidelines Index、active sibling lists、active prose links 和两个 active backlog design-principle links；closed plan/archive 保持不变并通过 compatibility notice 可达。
4. 通过 SCO-007/CDP-001/CDG-001/CDG-003/SHC-001/SHC-002 delta 将 stale schema/content-delivery main specs、phase/shared projections 对齐现行 HITL2 sentinel/action enum、repair、rerun 与 gate rule contract；不改 Engine logic。
5. 更新 `DPT_FRAMEWORK/COMMANDS.md` 的 audience contract，区分 autonomous 与 human-directed authority，并区分 human-directed decision 位于 HITL 还是 out-of-band maintenance/debug，同时明确 Agent-owned mechanical action。
6. 通过 CDE-001..005 delta 更新 G13 `case-131` 至 `case-135`；按既有 REI/CPT/WNC/AGT/PLR contract 同步 G14 `case-140` 至 `case-142`、G24 `case-301` 至 `case-306`、G5 `case-51`/`case-52` 和 `RUN_EXPS.md`，使 fixtures、handoff/status window、verdict 与 rerun route 使用现行真实 gate output；逐 case 执行并从 trace 判定。
7. 扩展现有 command-contract docs 与 HITL2 gate regression assertions，并复跑 enum/profile/gate/routing tests。
8. 同步 requirement registry 中 13 个 modified requirement 的稳定描述；不新增 ID。
9. 按 VEM-002/003/004 更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 到 `v0.21`。
10. 严格验证 change、path migration、requirement registry、main specs、version surfaces、focused regression 和 controlled E2E。
11. 后续 runtime changes 按 Durability / Visibility / Canonical Materialization / Authorized Repair 依赖带提出，并按 failure mode 再切具体 change；每个 change 引用本 proposal 的 coverage table，但重新定义自己的 concrete specs/tasks。

Rollback 只涉及 guidance、command/phase/shared docs、controlled experiment playbooks/index、focused assertions、registry descriptions 和 version surfaces，无 runtime data migration。

## Open Questions

以下问题有意保留给对应 runtime change，当前 change 不伪造答案：

1. **Authorization signal**：什么 host-level 或 user-origin signal 能让 Engine 区分真实 human-directed authorization 与 Agent 自行传 flag？若只能做到 auditable 而非 authenticated，应如何明确 threat model？
2. **Mutation boundary**：authorized repair 允许哪些 state/profile/registry/transition 变化，哪些证据与已交付 provenance 即使有人授权也不可改？
3. **Progress Source of Record**：per-topic/per-wave progress 应由现有 queue、status、registry、独立 ledger 中哪一个拥有，如何避免双写？
4. **Canonical post-final route**：优先修复 gated rerun 是否足以覆盖所有新增 scope；正式 addendum 是否还有不可替代的业务语义？
5. **Integrity owner**：canonical footprint audit 应扩展 `audit-phase-status`、`inspect-bundle` 还是复用更底层的 shared evaluator，哪一个 ownership 最直接？
6. **Crash-safe scope**：现有 writer 中哪些已经正确 atomic，哪些需要 shared journal/sweep；如何避免为每类 artifact 复制恢复逻辑？
