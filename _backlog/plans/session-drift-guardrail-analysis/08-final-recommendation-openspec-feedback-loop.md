---
title: Final Recommendation — OpenSpec-Centered Change Feedback Loop
status: recommended_for_opsx_propose
created: 2026-07-30
supersedes_as_final_assembly:
  - 04-recommendation-archive-governance-gate.md
  - 06-soft-guidance-loop-design.md
candidate_change: establish-openspec-change-feedback-loop
evidence:
  - evidence/A-session-lifecycle-and-attach-points.md
  - evidence/D-adversarial-stress-test.md
  - evidence/E-governance-integration-history.md
---

# 08 — 最终建议：OpenSpec-centered Change Feedback Loop

## 1. 决定

需要做，而且应当做成一个**自动推送、持续反馈、机器闭合**的机制；但不能把
`AGENTS.md` / `CLAUDE.md` 或 `tasks.md` 本身误叫作自动化。

最终建议是：

> **复用 repo 已经跑通的 `openspec/governance/` 扩展接缝：用 `AGENTS.md` / `CLAUDE.md`
> 做跨 harness 的短路由；用 OpenSpec artifact rules 和 `operations.apply/archive.guidance`
> 在每次 change 事件上主动推送上下文；用同一个 Agent 做有针对性的语义 review；把 review finding
> 回写成未完成 task；最后由 `openspec/governance/` 下的 guarded finalizer 在检查全部通过后才拥有
> 对 native archive 的唯一正常调用权。**

这不是 `04` 的三个 checker，也不是 `06` 的七条提醒各自独立工作，而是一个闭环：

```text
propose/design/tasks
        |
        v
pre-apply plan review  <--- OpenSpec apply guidance 自动推送
        |
        v
apply / resume apply   <--- tasks 跨 session 保存当前工作
        |
        v
closeout review actual diff  <--- OpenSpec archive guidance 自动推送
        |
        +-- 有 finding --> 写成未完成 task --> 回到 apply
        |
        +-- 无 finding --> openspec/governance finalizer
                                  |
                                  +-- fail --> Check/Inspect/Advice --> 回到 apply
                                  |
                                  +-- pass --> finalizer 调用 native OpenSpec archive
```

## 2. 先纠正问题定义

这批反复 bug 有两个不同根因，必须同时处理：

1. **语义/设计漂移**：一个局部 fix 只让一个 consumer 记住新区别；writer、其它 reader、
   reentry、时间边界、feedback surface 仍走旧解释。这是 BUG-151/152/176/178 等真正的内容根因。
2. **生命周期执行缺口**：规则和 checker 已存在，但没有在 apply/archive 事件上稳定地重新进入
   conversation，也没有与最终 archive move 绑定。这解释为什么已有的机械纪律仍会被漏跑。

三个现有 governance checker 只覆盖第二类中的一个**窄子集**：requirement registry、main-spec
结构、verification asset routing。它们是必要硬地板，但不能被表述为能防住全部 BUG-143…186。

## 2.1 历史证据：`openspec/governance/` 已经是有效接缝，但还不是闭环

完整追溯见 `evidence/E-governance-integration-history.md`。最关键的历史不是目录名，而是消费链：

1. 2026-06-17 的 main-spec delta-format 污染，直接根因就是 Agent 手工 archive 绕过正确流程；
2. repo 随后把 requirement/spec checker 收敛到 `openspec/governance/`，并通过
   `config.yaml.rules.tasks` 要求每个 change 生成收尾检查；
3. `requirement-traceability` 后来把它们写成 accepted contract；
4. `formalize-verification-routing` 又形成了更成熟的“change-local intent + strict parser + read-only
   checker + focused tests + config/pointer”模式。

这个接入确实有效。以 verification-routing 接受时刻为 cutoff，committed `HEAD` 中此后创建且已归档的
34 个 change，**34/34** 的 `tasks.md` 都含两个 project checker，**31/34** 含精确 routing checker
命令（另 1 个用等价 prose）。但只有 **8/34** 真有 `verification-plan.yaml`，而且至少一个 change 在
governance task 仍为 `[ ]` 时被归档。

因此应复制的是：

```text
accepted contract
  -> config.rules.tasks 可靠生成义务
  -> governance checker 提供 deterministic verdict
  -> focused tests 保护 checker/interface
```

需要补上的则是：

```text
operation guidance 触发语义反馈
  -> finding 回到 tasks
  -> governance finalizer 把 task/checker closure 与 archive move 绑定
```

这也给出一个重要反例：只在大 `context:` 里要求 custom artifact，或只把文件放进
`openspec/governance/`，都不等于自动化。真正成功的 historical attach point 是
`rules.tasks -> openspec instructions tasks -> tasks.md`；真正缺失的是不可绕过的正常 archive transition。

## 3. 各 surface 只承担一种责任

| Surface | 责任 | 明确不负责 |
|---|---|---|
| `guidelines/change-feedback-loop.md`（建议新增） | 七个 meta-question 的单一 advisory 来源 | runtime 行为、archive 权威、机器 verdict |
| `AGENTS.md` / `CLAUDE.md` | 3–5 行 bootstrap：OpenSpec work 必须读取 operation guidance，并只能经 finalizer archive | 复制七问、复制 checker 列表、保存 session 状态 |
| `openspec/config.yaml` artifact `rules` | proposal/design/tasks 生成时把 review 义务放进产物；`rules.tasks` 生成带稳定 marker 的 plan/closeout task | 自动执行命令、证明 review 质量 |
| `openspec/config.yaml` `operations.apply/archive.guidance` | 每次 apply/archive 调用时把当前 guidance 自动送入 Agent context | 证明任务完成、替代硬 gate |
| `tasks.md` | 保存 required review、finding、修复和 done condition，跨 session 继续 | 触发器、semantic proof、机器 authority |
| plan/closeout reviewer | 当前 LLM Agent 读 change、实际 diff 和七问，提出有证据的 finding | deterministic pass/fail、另起一套真相 |
| `openspec/governance/` finalizer | 聚合既有 checker，检查 required marker/task 机械闭合；全部通过后才调用 native OpenSpec archive | 判断设计质量、研究语义或 finding 是否“够深”、重写 archive mechanics |
| accepted OpenSpec spec | 定义上述生命周期行为及边界 | 用 prose 冒充执行 |

关键点：**instruction 是 push channel，task 是 durable work ledger，governance finalizer 才是
deterministic closure owner。** 三者不能互相冒充。

## 4. 为什么现在可以用 OpenSpec 做主触发器

当前机器上的 OpenSpec 是 `1.7.0`。其 project config 已原生支持：

```yaml
operations:
  apply:
    guidance: [...]
  archive:
    guidance: [...]
```

`openspec instructions apply --change <name> --json` 和
`openspec instructions archive --change <name> --json` 会返回 `operationGuidance`；当前
`.claude/skills` 与 `.codex/skills` 的 1.7 apply/archive flow 已明确要求读取它。

这正是 `06` 想要的 “push + event-triggered” attach point，而且比 SessionStart hook 更合适：

- 只在 OpenSpec apply/archive 事件发生时出现，不会每个 session 泛滥；
- guidance 来自 `openspec/config.yaml`，不是分别复制到 Claude/Codex skill；
- 每次 resumed apply 都重新读取当前 config，天然跨 session；
- 它仍诚实地是 advisory，不冒充机器 gate。

当前 `openspec/config.yaml` 尚未声明 `operations:`，所以这个能力今天存在但没有被使用。

历史 audit 还说明应该同时使用两种 config channel，而不是二选一：

- `rules.tasks` 在**产物生成时**写入 durable obligation，34/34 的传播率说明它是成熟 seam；
- `operations.apply/archive.guidance` 在**每次操作发生时**重新推送当前 feedback posture，补足 resumed
  session 与 actual-diff closeout。

前者解决“跨 session 留下什么”，后者解决“此刻为什么重新看它”；二者都不单独提供 executable gate。

另一个必须保留的边界：当前 1.7 archive skill 明确把 `instructions archive` lookup 定义为 advisory，
lookup 失败时可以继续。因此 operation guidance 只能拥有**自动送达/触发 review**，不能单独拥有 hard gate；
native archive 的正常调用仍必须由 root rule 与 adapter 路由到 deterministic finalizer。

## 5. 三个触发点

### 5.1 Apply 入口：先 review plan，再碰 target

`operations.apply.guidance` 应要求：

1. 第一次 target edit 前，按 repo-owned `polish-openspec-change` 的 risk-led 方法 review
   proposal/design/delta specs/tasks/verification plan；
2. 只把七问中与本 change touched surfaces 有关的项拿出来，不做七项打卡表；
3. 若发现 accepted design、consumer reconciliation、writer/reader postcondition、时间或
   authority 边界不完整，先修 change artifacts / tasks，再开始 target edit；
4. resumed apply 时，对**当前 pending task**重新注入相关问题，而不是重读一整本 bug 历史。

现有 `.agents/skills/polish-openspec-change/SKILL.md` 已具备 whole-change coherence、risk-led
later passes、自动修复已确定 planning defect、无法决定时 `not ready` 的大部分形状。优先扩展/复用它，
不要另造一个 LLM judge service。

这个 plan review 必须由 `rules.tasks` 生成一个带稳定 lifecycle marker 的 task，而不是只依赖 guidance
临时提醒。marker 只供 finalizer 确认 required task 存在、已完成；review finding 本身仍用正常 task prose
表达，不引入 semantic schema。

### 5.2 Apply 过程中：finding 进入 tasks，不留在聊天里

任何 review finding 若需要工作，必须转成一个未完成 task，并具备：

- 它保护的 requirement / reader question；
- 直接 owner 或 authoritative surface；
- 最小修复；
- 能证明该 root 的真实 done condition。

这使反馈跨 session 持久化。聊天总结不是状态；task 也不是 proof，但它至少保证下一次
`openspec instructions apply` 会重新把未完成工作送回 Agent。

### 5.3 Archive 入口：actual-diff closeout review + finalizer

`operations.archive.guidance` 应要求：

1. 对**实际 diff**再跑一次 closeout review，而不是只相信 propose 时的设计；
2. 若发现新问题，把它写成未完成 task 并停止 archive，回到 apply；
3. 无新 finding 后，复用 current archive flow 的 Agent-driven delta sync，并对每个 delta/main 再比较；
4. sync 已闭合后调用 repo-owned finalizer；任何非零退出都停止，不得另行裸 `mv` 或直接暴露
   `openspec archive --yes`。

closeout review 可复用 `polish-openspec-change`，增加 `closeout` 形态：它读实际 diff 和实现，
但只修 change artifacts / 添加 tasks，不替 apply Agent 偷改 target。这样 reviewer 与修复执行仍有清楚边界。

closeout task 同样由 `rules.tasks` 生成稳定 marker。若 review 产生 finding，该 task 保持未完成；新增修复 task
完成后重新 review，最后才勾选 closeout。第一版不添加“LLM 思考质量 receipt”；机器只验证 task 的存在、
状态与 deterministic facts，不声称证明 Agent 思考得足够好。

## 6. 机器闭合：finalizer 必须独占 native archive 调用

建议的唯一正常 archive 闭合入口：

```text
node openspec/governance/finalize-change-archive.mjs --change "<name>"
```

它在同一个进程/命令边界内：

1. 用 OpenSpec status 解析真实 `changeRoot` / `planningHome`，不拼硬编码路径；
2. 要求 required artifacts 完成；
3. 要求 `tasks.md` 恰有一个 `feedback-loop:plan-review` 和一个
   `feedback-loop:closeout-review` marker，二者均已完成，且零其它未完成 task；closeout task 的生成式
   done condition 包含 actual-diff review 与 Agent-driven delta sync/re-compare；
4. 运行 `openspec validate <name> --strict`；
5. 运行 `check-project-reqs.mjs`、`check-project-specs.mjs`；
6. 运行 `check-verification-routing.mjs --change <name> --mode assets`；
7. 调用原生 `openspec archive <name> --json --skip-specs`，让 OpenSpec 负责自己的 validation、task
   re-check、collision check、archive naming 和 canonical move；不得自己重写普通 raw `mv`，也不得向
   adapter 暴露 `--yes`；
8. 解析 archive JSON，要求目标 change/path 正确且 `specsUpdated: false`；任何非零退出都直接报告并停止。

输出应同时有稳定结构化结果和简短人类摘要：失败给出 checker、direct root、合法修复面和同一命令；
成功只声称这些机械条件和 move 已完成。

finalizer **不**运行/伪造 Agent experiments，不把 asset registration 当 native test PASS，不判断七问答案质量，
也不替代 spec sync 的 Agent-driven merge。它把 project preconditions 包在 OpenSpec 原生 archive transition
外面；正常成功路径是“Agent sync/re-compare 已闭合，project checks 已看过最终 main specs，native archive
显式跳过 spec write，只完成它自己的 validation/collision/canonical move”。

这里应复用 native archive，而不是 finalizer 自己实现目录命名和跨文件系统 move；但第一版不应让它在真实
repo 上再次 apply specs。OpenSpec 1.7 的实现会先写 main specs，之后才检查 archive collision 并 move，且没有
side-effect-free dry-run。直接调用 `--json --yes` 再以 `specsUpdated: true` 触发“搬回 active”会引入一条比
本 guardrail 更难推理的恢复协议。当前生成的 archive flow 已经让 Agent sync 并逐 delta/main re-compare，
所以第一版应在该步骤之后跑 project checks，再调用无 `--yes` 的 `--json --skip-specs`。这同时避免 native
`--yes` 放行 incomplete tasks；native JSON flow 会再次检查 task completeness。

代价也要明说：finalizer 能机器证明 marker/task/checker closure 和“归档命令没有改 specs”，不能机器证明
Agent 的 delta/main 语义比较足够好。若未来 OpenSpec 暴露 side-effect-free archive preflight 或 transaction，
可另行 propose 把 native rebuilt-spec result 纳入同一 gate；第一版不复制 merge algorithm，也不做写后回滚。

这比 `04` 的“在若干 Markdown skill 里分别粘三条命令，然后下一步裸 `mv`”更强，也更可测。

### 6.1 Finalizer 为什么值得成为一个 Module

按 semantic precision review，它只回答一个 reader question：

> **对当前选中的 active change，项目的机械 closeout 前提是否已满足；若满足就调用 canonical archive，若不满足，
> 最早的直接失败是什么？**

它保留会改变答案的区别：active/archived/collision、artifact/task completeness、strict validation、
每个既有 checker 的独立结果、native archive result；它明确不裁决 spec-sync 内容选择、delta/main
语义等价、semantic review 质量或 native test evidence。
正常调用者可以停在 `archived` 或“一个 direct failed prerequisite + still active”，不必重建各 adapter 的步骤。

按 `codebase-design`，它应是一个 deep Module：

- **Interface** 只有 selected change（以及 store/root resolution 所需的现有 OpenSpec 选择语义）和稳定结果；
- **Implementation** 隐藏 path resolution、task/artifact 读取、既有 checker 调用和 native archive JSON；
  OpenSpec CLI 仍拥有 validation、collision、archive naming 和 move；
- **Seam** 就是 archive 的最后 deterministic transition；所有 Claude/Codex adapter 只调用同一 Interface；
- **deletion test**：删掉该 Module，检查顺序、错误处理和 native archive 前置条件会重新散回 N 个 adapter，因此它确实
  提供 depth、leverage 与 locality，而不是 pass-through；
- **test surface** 就是同一 Interface：用本地临时目录/fixture 覆盖 missing marker、pending task、每个
  checker failure、archive collision、native failure，以及全通过才留在 archive 且 main specs 不被命令改写；
  不测试 prompt 文本或 Module 内部步骤。

按 simple reliable control admission test：它读取的 direct facts 是 OpenSpec status/tasks、现有 checker
结果和 native archive JSON；Agent-driven sync/re-compare 仍明确属于 semantic closeout，不被伪装成 direct
machine fact。现有 checkpoint 不足之处是 project checks 与 OpenSpec transition 分离；新增
Module 删除的是各 adapter 重复命令、手写 archive mechanics 与“检查后仍可裸 move”的隐含路径。它不新增
persistent state、semantic receipt、retry tree、rollback branch 或第二份 validator。
失败后的唯一最近动作是修复被点名的 direct prerequisite，再重跑同一个 finalizer。

责任分配保持不变：Agent 负责读取 semantic findings、执行已授权修复、sync/re-compare 并重跑；
finalizer/Engine 只负责 project-level 机械 verdict 与调用 native transition，OpenSpec CLI 拥有
validation/collision/archive naming/move；用户只处理新的 spec-sync/语义/风险决定，不被要求代跑普通 checker。

## 7. `AGENTS.md` / `CLAUDE.md` 应放什么

只放一个相同的短 block，内容大意为：

```text
For OpenSpec work, always consume current artifact rules and apply/archive
operationGuidance returned by `openspec instructions`. Findings that require work
must become pending change tasks. A change may be archived only through the
repo-owned guarded finalizer; never bypass it with a raw move.
```

不要把七问、BUG 列表、checker 命令全部复制进去。否则两份 root instruction 加上
`.claude` / `.codex` / `.agents` 多份 OpenSpec adapter 会成为新的 drift fan-out。

建议给该 block 明确 start/end marker，并由 focused integration test 校验 `AGENTS.md` 与 `CLAUDE.md`
中 block 完全一致。文件头允许保留 Codex/Claude 差异；这类知识面 parity 不进入 per-change finalizer。

## 8. `tasks.md` 应放什么

`config.yaml.rules.tasks` 必须让每个 change 生成两个与本机制有关的 task，并在同一 checkbox 行带
稳定、不可见的 lifecycle marker：

```md
- [ ] ...plan review done condition... <!-- feedback-loop:plan-review -->
- [ ] ...closeout review done condition... <!-- feedback-loop:closeout-review -->
```

具体责任分别是：

1. **Plan review task**：第一次 target edit 前完成，done condition 是 planning artifacts 已吸收
   risk-led finding，plan-mode/strict checks 通过；
2. **Closeout review task**：实际 diff 完成后执行；有 finding 时它保持未完成并产生修复 task；clean pass
   后完成 Agent-driven delta sync/re-compare，才可勾选。

marker 的目的只是让 finalizer 不靠自然语言 regex 确认 required lifecycle task **存在且已勾选**。它不是
semantic object card，不保存 review 结论，也不声称 checkbox 能证明思考质量。历史上 34/34 的 project
checker task 注入说明 `rules.tasks` 值得复用；8/34 的 custom plan 落地率说明不能只把要求放进宽泛 context。

bug-fix change 还应有一个简短的 recurrence disposition：

- 可确定地重现 → 加到直接 owner 的 focused regression；
- 同一机械模式已跨 change 重复 → 收敛到共享 evaluator/checker，而不是复制检查；
- 只能靠语义判断但可泛化 → 通过同一个 OpenSpec change 更新七问 guidance；
- 是新语义/一次性事件 → 明确不泛化，避免 incident catalog 无限膨胀。

机器只检查两个 marker 唯一存在、对应 checkbox 与其它 task 均闭合，不检查这些文字是否“写得聪明”。
语义质量仍由 reviewer 负责；若未来出现“review 后继续改 diff、却不重跑 review”的真实复发，再考虑一个
绑定 diff identity 的最小 receipt，第一版不预先新增这份状态。

### 8.1 Adoption：只迁移 active change，不追改 archive

`rules.tasks` 只影响之后生成/更新的 tasks；机制启用时已经存在的 active change 不会自动得到 marker。
因此 rollout 必须显式处理当前 active set：

- archived changes 是历史记录，不回写、不补 marker；
- active change 若已有真正等价的 plan/closeout task，可在 re-review 后给原 task 加对应 marker；
- 已经开始 apply 的 change 不能伪称“pre-apply review”，应执行一次 mid-apply plan reconciliation，再完成
  plan marker；
- 没有等价 task 时新增 pending task，不允许用 adoption cutoff 或永久 grandfather flag 绕过 finalizer；
- 本机制自己的 change 必须含两 marker，并用自己的 guarded archive 做第一次 dogfood。

当前只有一个 active change；实际 propose 时应重新运行 `openspec list --json`，按当时的 active set 生成
明确 migration tasks，不把这份 2026-07-30 快照写死进 runtime logic。

## 9. 七问住哪里

选择 `07` 的 **A：不搬 `guidelines/`，强化桥**。

- 把 `06` 的七问蒸馏成一个短的 `guidelines/change-feedback-loop.md`；它只拥有 advisory design wisdom。
- 该 guideline 的新增/修改也必须走 OpenSpec change lifecycle。
- accepted spec 拥有“何时必须触发 review、finding 如何回到 tasks、finalizer 如何阻断”的行为契约。
- `openspec/config.yaml` 的 rules/operations 主动把 guideline 拉进具体事件。

目录位置不是 loop；**被 OpenSpec 生命周期治理 + 在事件上 fire** 才是 loop。整体搬迁
`guidelines/` 会改 GCO-008，却不会自动获得执行力，因此不做。

## 10. 不编辑生成文件作为 Source of Record

仓库目前存在 `.claude/commands`、`.claude/skills`、`.codex/prompts`、`.codex/skills`、
`.agents/skills` 多种 OpenSpec surface，版本并不完全一致。OpenSpec 官方又明确说
`openspec update` 会重新生成 agent instructions。

因此：

- 七问与行为规则不能手抄进每个生成文件；
- primary injection 应是 `openspec/config.yaml`；
- root instruction 只保留相同短路由；
- archive adapter 若必须改，只保留“调用 `openspec/governance/` finalizer”这一薄调用，并用测试检查当前声明支持的
  adapter 均走该调用；不得把 gate 逻辑复制到 adapter。
- 旧 adapter 若不消费 `operationGuidance`，root router 仍要求它在 apply/archive 时显式读取当前
  `openspec instructions`；无法满足时不得被列为项目支持的 OpenSpec flow。

## 11. 自动化强度的诚实边界

这个方案提供三种不同强度，不能混称：

1. **自动送达**：`rules.tasks` 生成 durable review obligations；root instructions + OpenSpec operation guidance
   在每次相关 session/operation 把当前 review posture 推入 context；
2. **正常流程硬闭合**：governance finalizer 要求 marker/tasks/checks 闭合，再调用 native OpenSpec archive；
   不能因 Agent 忘跑命令而漏掉；
3. **对恶意/手工绕过的强制**：任何人仍可不用 OpenSpec、直接移动文件。若真实观察到这种绕过，才增加
   CI 或 tracked git hook；第一版不先叠这层。

所以目标应表述为：**在项目支持的 OpenSpec flow 中，遗漏从“静默可能”变成“必须主动绕过单一 finalizer”**，
而不是声称 Markdown 能提供 OS 级不可绕过保证。

## 12. 建议的 OpenSpec change

候选 change：`establish-openspec-change-feedback-loop`。

建议将它作为一个有界 lifecycle capability 来 propose；`requirement-traceability` 与
`verification-routing` 继续拥有各自 checker 的事实，本 capability 只拥有“review feedback 如何进入
change lifecycle、finding 如何回到 tasks、finalizer 如何闭合 archive”。不要把全部行为硬塞进 RET/VER。

建议 task 顺序：

1. proposal/spec/design 定义 semantic review 与 deterministic gate 的边界，并确认 capability ownership；
2. 将七问从本 backlog 蒸馏到 guidance，保留 connected reasoning，不做 schema；
3. 在 `openspec/config.yaml` 增加 proposal/design/tasks rules 与 apply/archive operation guidance；
   `rules.tasks` 明确生成两个带稳定 marker 的 lifecycle task；
4. 为 adoption 时仍 active 的 change 生成显式 migration tasks：重用真正等价 task 或补做
   mid-apply/closeout review；不修改 archive，不增加 grandfather bypass；
5. 给 `AGENTS.md` / `CLAUDE.md` 增加相同短路由及 parity test；
6. 扩展 repo-owned `polish-openspec-change` 为 plan/closeout 两种 review posture；
7. 在 `openspec/governance/` 实现并测试 guarded finalizer：复用现有 checker，包装 native
   `openspec archive --json --skip-specs`，不传 `--yes`，不重写 spec merge、archive naming 或普通 move；
8. integration test 真实调用 `openspec instructions tasks/apply/archive --json`，断言 task rules/marker 与
   operation guidance 从 config 动态注入；
9. deterministic_e2e 在临时 change 上证明 missing/duplicate marker、pending task、strict validation、任一
   checker failure、archive collision 或 native failure 均不产生成功归档；全部闭合时 native archive 才留下目录，
   且 main specs 在 finalizer invocation 前后字节不变；
10. 用本 change 自己的 archive 做第一次真实 dogfood。

## 13. 完成判据

机制只有同时满足以下条件才算完成：

- 新建 tasks 会收到两个 lifecycle marker；新 session/resumed apply 无需用户另行提醒即可收到当前 apply guidance；
- adoption 时的 active changes 已显式 backfill/review；archived history 未被改写，也没有永久 bypass；
- archive 调用会对 actual diff 做 closeout review；finding 会变成 pending task 并回到 apply；
- missing/duplicate/unchecked lifecycle marker、其它 pending task、strict validation、三类 governance check 或
  verification assets 任一失败时，finalizer 不留下 archived change；
- finalizer 的成功路径由 native `openspec archive --json --skip-specs` 完成，且 `specsUpdated: false`、main specs
  字节不变；没有 `--yes`、第二套 spec merge、写后回滚或 hand-written normal move；
- `AGENTS.md` / `CLAUDE.md` 不复制七问且 router block 一致；
- 机器没有对 semantic review 质量给假 PASS；
- `openspec update` 后 adapter conformance test 能暴露 finalizer 调用被覆盖；
- 新发现的重复 bug 至少沉淀为 direct regression、共享机械检查、泛化 guidance 或明确 non-generalization
  之一，而不是只留在本次聊天。

## 14. 最终取舍

- **做**：OpenSpec task rules + operation guidance + persistent findings + risk-led Agent review +
  `openspec/governance/` guarded finalizer。
- **复用**：历史 governance attach pattern、现有三 checker、native OpenSpec archive、
  `polish-openspec-change`、七问、OpenSpec 1.7 dynamic instruction channel。
- **不做**：SessionStart banner、Claude-only hook、外部 LLM judge、`semantic_objects[]` schema、Tier-A 泛化扫描、
  整体移动 `guidelines/`、把完整逻辑复制到每个 harness adapter。

这才是能针对“反反复复修改同一类 bug”的反馈机制：每次 change 都被迫重新看到相关风险，发现的问题会
回到可继续执行的 tasks，机械闭合又与最终 archive move 绑定；同时没有让 Engine 冒充语义评审者。
