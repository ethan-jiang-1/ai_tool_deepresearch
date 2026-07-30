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

定案如下：

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

以下机制边界已经定下，不在 proposal 中重新做方案竞赛：

1. 这是一项独立的 change-lifecycle capability；RET/VER 继续只拥有各自 checker 的事实，不接收整条
   feedback-loop 行为；
2. 语义 review 的单一内容源是 `guidelines/change-feedback-loop.md`，由当前 Agent 执行；
   `.agents/skills/polish-openspec-change` 不是运行依赖；
3. `rules.tasks` 生成两个 durable lifecycle task，`operationGuidance` 负责事件送达，二者同时存在；
4. 项目声明支持的 archive 入口都把最终 transition 路由到同一个 governance finalizer；
5. finalizer 只做确定性闭合；在当前 OpenSpec 1.7 上，它在 Agent sync/re-compare 之后以
   `openspec archive --json --skip-specs` 完成 canonical move；
6. 本 change 不引入 semantic schema、diff receipt、CI/git hook、第二套 spec merge 或写后回滚。

capability 的最终名称、requirement ID、result payload、受支持 adapter 清单和测试文件位置，由
`/opsx:propose` 在这些边界内结合当时 repo 事实确定。它们是 contract/rollout 细节，不是尚未决定的机制方向。

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
`rules.tasks -> openspec instructions tasks -> tasks.md`；真正缺失的是在项目支持的正常 flow 中不能被静默跳过的
archive transition。

## 3. 各 surface 只承担一种责任

| Surface | 责任 | 明确不负责 |
|---|---|---|
| `guidelines/change-feedback-loop.md` | risk-led meta-question 与 review protocol 的单一 advisory 来源 | runtime 行为、archive 权威、机器 verdict |
| `AGENTS.md` / `CLAUDE.md` | 短 bootstrap：OpenSpec work 必须读取 operation guidance，并只能经 finalizer archive | 复制七问、复制 checker 列表、保存 session 状态 |
| `openspec/config.yaml` artifact `rules` | proposal/design/tasks 生成时把 review 义务放进产物；`rules.tasks` 生成带稳定 marker 的 plan/closeout task | 自动执行命令、证明 review 质量 |
| `openspec/config.yaml` `operations.apply/archive.guidance` | 每次 apply/archive 调用时把当前 guidance 自动送入 Agent context | 证明任务完成、替代硬 gate |
| `tasks.md` | 保存 required review、finding、修复和 done condition，跨 session 继续 | 触发器、semantic proof、机器 authority |
| plan/closeout reviewer | 当前 LLM Agent 按 guideline 读 change 与实际 diff，提出有证据的 finding | deterministic pass/fail、另起一套 reviewer/LLM service |
| `openspec/governance/` finalizer | 聚合既有 checker，检查 required marker/task 机械闭合；全部通过后才调用 native OpenSpec archive | 判断设计质量、研究语义或 finding 是否“够深”、重写 archive mechanics |
| 新的 change-lifecycle accepted spec | 定义上述生命周期行为及边界 | 重复 RET/VER 各自 checker 的事实、用 prose 冒充执行 |

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

历史 audit 要求同时使用两种 config channel：

- `rules.tasks` 在**产物生成时**写入 durable obligation，34/34 的传播率说明它是成熟 seam；
- `operations.apply/archive.guidance` 在**每次操作发生时**重新推送当前 feedback posture，补足 resumed
  session 与 actual-diff closeout。

前者解决“跨 session 留下什么”，后者解决“此刻为什么重新看它”；二者都不单独提供 executable gate。

另一个必须保留的边界：当前 1.7 archive skill 明确把 `instructions archive` lookup 定义为 advisory，
lookup 失败时可以继续。因此 operation guidance 只拥有**自动送达/触发 review**，不能单独承担 hard gate。
项目声明支持的入口必须在无法取得 required guidance 时停止，并把最终 archive transition 路由到
deterministic finalizer；哪些 tracked adapter 属于支持集合，须在 proposal 时按真实 discovery/调用路径盘点，
不能把“文件存在”直接等同于“项目承诺长期维护”。

## 5. 三个触发点

### 5.1 Apply 入口：先 review plan，再碰 target

`operations.apply.guidance` 应执行以下协议：

1. 读取 `guidelines/change-feedback-loop.md`；第一次 target edit 前，review
   proposal/design/delta specs/tasks，以及适用的 verification plan；
2. 只把七问中与本 change touched surfaces 有关的项拿出来，不做七项打卡表；
3. 若发现 accepted design、consumer reconciliation、writer/reader postcondition、时间或
   authority 边界不完整，先修 change artifacts / tasks，再开始 target edit；
4. resumed apply 时，对**当前 pending task**重新注入相关问题，而不是重读一整本 bug 历史。

review posture 固定为 whole-change coherence 后接 risk-led pass：能由 accepted facts 决定的 planning defect
当场修正；涉及新语义、scope、权限或风险决定时停止 target edit，并把精确问题交给用户。这个 protocol
直接进入 guideline 与 operation guidance，不依赖只存在于某个 harness 的 skill，也不另造 LLM judge service。

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

`operations.archive.guidance` 应执行以下协议：

1. 对**实际 diff**再跑一次 closeout review，而不是只相信 propose 时的设计；
2. 若发现新问题，把它写成未完成 task 并停止 archive，回到 apply；
3. 无新 finding 后，复用 current archive flow 的 Agent-driven delta sync，并对每个 delta/main 再比较；
4. sync 已闭合后调用 repo-owned finalizer；任何非零退出都停止，不得另行裸 `mv` 或直接暴露
   `openspec archive --yes`。

closeout review 由当前 archive Agent 直接按同一 guideline 执行。它读实际 diff 和实现，只修 change artifacts、
添加 pending tasks 并停止 archive；target 修复回到 apply。这样语义 review 与修复执行的责任保持清楚，
且所有 harness 消费同一个 protocol。

closeout task 同样由 `rules.tasks` 生成稳定 marker。若 review 产生 finding，该 task 保持未完成；新增修复 task
完成后重新 review，最后才勾选 closeout。本 capability 不添加“LLM 思考质量 receipt”；机器只验证 task 的存在、
状态与 deterministic facts，不声称证明 Agent 思考得足够好。

## 6. 机器闭合：finalizer 独占 native archive 调用

唯一正常 archive 闭合入口：

```text
node openspec/governance/finalize-change-archive.mjs --change "<name>"
```

它在同一个命令边界内：

1. 用 OpenSpec status 解析真实 `changeRoot` / `planningHome`，不拼硬编码路径；
2. 要求 required artifacts 完成；
3. 要求 `tasks.md` 恰有一个 `openspec-feedback:plan-review` 和一个
   `openspec-feedback:closeout-review` marker，二者均已完成，且零其它未完成 task；
4. 运行 `openspec validate <name> --strict`；
5. 运行 `check-project-reqs.mjs`、`check-project-specs.mjs`；
6. 运行 `check-verification-routing.mjs --change <name> --mode assets`；
7. 调用原生 `openspec archive <name> --json --skip-specs`，让 OpenSpec 负责自己的 validation、task
   re-check、collision check、archive naming 和 canonical move；不得自己重写普通 raw `mv`，也不得向
   adapter 暴露 `--yes`；
8. 解析 native result，并与实际 active/archive path 对照；只有目标正确、`specsUpdated: false` 且 move
   可确认时才报告成功。其余情况报告已观察到的事实，不猜测成功，也不自动回滚。

Interface 应返回稳定的结构化结果和简短人类摘要：失败给出最早 direct root、合法修复面和同一重跑命令；
成功只声称这些机械条件和 move 已完成。精确字段、error category 与 exit-code mapping 应在 proposal/design
根据 native CLI 的真实 failure modes 定义；本 recommendation 不预先创造第二套 archive 状态模型。

finalizer **不**运行/伪造 Agent experiments，不把 asset registration 当 native test PASS，不判断七问答案质量，
也不替代 spec sync 的 Agent-driven merge。它把 project preconditions 包在 OpenSpec 原生 archive transition
外面；正常成功路径是“Agent sync/re-compare 已闭合，project checks 已看过最终 main specs，native archive
显式跳过 spec write，只完成它自己的 validation/collision/canonical move”。

这里复用 native archive，而不是 finalizer 自己实现目录命名和跨文件系统 move；第一版不让它在真实
repo 上再次 apply specs。OpenSpec 1.7 的实现会先写 main specs，之后才检查 archive collision 并 move，且没有
side-effect-free dry-run。直接调用 `--json --yes` 再以 `specsUpdated: true` 触发“搬回 active”会引入一条比
本 guardrail 更难推理的恢复协议。当前生成的 archive flow 已经让 Agent sync 并逐 delta/main re-compare，
所以第一版在该步骤之后跑 project checks，再调用无 `--yes` 的 `--json --skip-specs`。这同时避免 native
`--yes` 放行 incomplete tasks；native JSON flow 会再次检查 task completeness。

残余边界必须写清：finalizer 能机器证明 marker/task/checker closure 和“归档命令没有改 specs”，不能机器证明
Agent 的 delta/main 语义比较足够好。第一版不复制 merge algorithm、不做写后回滚，也不预留隐藏分支；任何
native preflight/transaction 扩展都必须以新的证据和独立 change 重新论证。

这比 `04` 的“在若干 Markdown skill 里分别粘三条命令，然后下一步裸 `mv`”更强，也更可测。

### 6.1 Finalizer 为什么值得成为一个 Module

按 semantic precision review，它只回答一个 reader question：

> **对当前选中的 active change，项目的机械 closeout 前提是否已满足；若满足就调用 canonical archive，若不满足，
> 最早的直接失败和当前观测状态是什么？**

它保留会改变答案的区别：artifact/task completeness、strict validation、每个既有 checker 的独立结果和
native archive result；它明确不裁决 spec-sync 内容选择、delta/main 语义等价、semantic review 质量或
native test evidence。

按 `codebase-design`，它应是一个 deep Module：

- **Interface** 只需 selected active change 与稳定的 success/failure feedback；
- **Implementation** 隐藏 path resolution、task/artifact 读取、既有 checker 调用和 native archive JSON；
  OpenSpec CLI 仍拥有 validation、collision、archive naming 和 move；
- **Seam** 就是 archive 的最后 deterministic transition；所有受支持 harness adapter 只调用同一 Interface；
- **deletion test**：删掉该 Module，检查顺序、错误处理和 native archive 前置条件会重新散回 N 个 adapter，因此它确实
  提供 depth、leverage 与 locality，而不是 pass-through；
- **test surface** 就是同一 Interface：每个 prerequisite failure 都在 native transition 前短路；成功路径
  由 native archive 完成，且 finalizer invocation 不改 main specs。

按 simple reliable control admission test：它读取的 direct facts 是 OpenSpec status/tasks、现有 checker
结果和 native archive JSON；Agent-driven sync/re-compare 仍明确属于 semantic closeout，不被伪装成 direct
machine fact。现有 checkpoint 不足之处是 project checks 与 OpenSpec transition 分离；新增
Module 删除的是各 adapter 重复 gate、手写 archive mechanics 与“检查后仍可裸 move”的隐含路径。它不新增
persistent state、semantic receipt、retry tree、rollback branch 或现有事实的重复 validator。
失败后的唯一最近动作是修复被点名的 direct prerequisite，再重跑同一个 finalizer。

adapter 是否仍会调用 finalizer 是这个 Module 的**入口完整性**，不是它内部的 archive prerequisite。
把 adapter 扫描器塞进 finalizer 既扩大责任，又无法保护“坏 adapter 根本没有调用 finalizer”这一自举缺口；
因此该 conformance 在 adapter/update 的验证边界处理，不加入每次 archive 的检查链。

责任分配保持不变：Agent 负责读取 semantic findings、执行已授权修复、sync/re-compare 并重跑；
finalizer/Engine 只负责 project-level 机械 verdict 与调用 native transition，OpenSpec CLI 拥有
validation/collision/archive naming/move；用户只处理新的 spec-sync/语义/风险决定，不被要求代跑普通 checker。

## 7. `AGENTS.md` / `CLAUDE.md` 只放短 router

两份 root instruction 只需要保持三个相同语义：

1. apply/archive 时读取当前 `openspec instructions` 返回的 `operationGuidance`；required guidance
   不可用时停止；
2. actionable finding 必须成为 active change 的 pending task；
3. archive 只能经 repo-owned finalizer，不得 raw move 或直接调用 native archive 绕过 project checks。

不要把七问、BUG 列表、checker 命令或 archive 实现复制进去。否则两份 root instruction 加上
`.claude` / `.codex` / `.agents` 多份 OpenSpec adapter 会成为新的 drift fan-out。root router 的 parity
可以由 focused static evidence 保护，但 prose 格式不进入 per-change finalizer，也不成为新的 runtime truth。

## 8. `tasks.md` 应放什么

`config.yaml.rules.tasks` 必须让每个 change 生成两个与本机制有关的 task，并在同一 checkbox 行带
稳定、不可见的 lifecycle marker：

```md
- [ ] Review planning artifacts and resolve risk-led findings before target edits. <!-- openspec-feedback:plan-review -->
- [ ] Review the actual diff, resolve findings, then sync and re-compare every delta spec. <!-- openspec-feedback:closeout-review -->
```

具体责任分别是：

1. **Plan review task**：第一次 target edit 前完成，done condition 是 planning artifacts 已吸收
   risk-led finding，适用的 plan-mode/strict checks 通过；
2. **Closeout review task**：实际 diff 完成后执行；有 finding 时它保持未完成并产生修复 task；clean pass
   后完成 Agent-driven delta sync/re-compare，才可勾选。

marker 的目的只是让 finalizer 不靠自然语言 regex 确认 required lifecycle task **存在且已勾选**。它不是
semantic object card，不保存 review 结论，也不声称 checkbox 能证明思考质量。历史上 34/34 的 project
checker task 注入说明 `rules.tasks` 值得复用；8/34 的 custom plan 落地率说明不能只把要求放进宽泛 context。

每个 defect-origin change 的 closeout review 还应记录一个简短的 recurrence disposition：

- 可确定地重现 → 加到直接 owner 的 focused regression；
- 同一机械模式已跨 change 重复 → 收敛到共享 evaluator/checker，而不是复制检查；
- 只能靠语义判断但可泛化 → 通过同一个 OpenSpec change 更新七问 guidance；
- 是新语义/一次性事件 → 明确不泛化，避免 incident catalog 无限膨胀。

机器只检查两个 marker 唯一存在、对应 checkbox 与其它 task 均闭合，不检查这些文字是否“写得聪明”。
语义质量仍由 reviewer 负责。第一版不增加 diff-identity receipt；closeout task 是 durable
attestation，不被描述成 semantic proof。review 后继续改 diff 却不重跑 review 是已知 residual risk，不在
本 change 中以新状态掩盖。

### 8.1 Adoption：只迁移 active change，不追改 archive

`rules.tasks` 只影响之后生成/更新的 tasks；机制启用时已经存在的 active change 不会自动得到 marker。
因此 proposal 必须用当时的 `openspec list --json` 盘点 active set，并让每个 active change 在归档前
truthfully 满足新 marker contract：已经开始 apply 的 change 执行 mid-apply plan reconciliation，不能伪称
做过 pre-apply review；closeout marker 保持 pending，直到真实 closeout。archived history 不回写，也不允许
用永久 grandfather bypass 回避 finalizer。本机制自己的 change 用同一条路径完成第一次 dogfood。

## 9. Guideline 位置已经决定

`guidelines/` 保持原位，OpenSpec bridge 负责在 change 事件上推送；不再保留搬迁选项。

- 把 `06` 的七问蒸馏成一个短的 `guidelines/change-feedback-loop.md`；它只拥有 advisory design wisdom。
- 该 guideline 的新增/修改也必须走 OpenSpec change lifecycle。
- accepted spec 拥有“何时必须触发 review、finding 如何回到 tasks、finalizer 如何阻断”的行为契约。
- `openspec/config.yaml` 的 rules/operations 主动把 guideline 拉进具体事件。

目录位置不是 loop；**被 OpenSpec 生命周期治理 + 在事件上 fire** 才是 loop。整体搬迁
`guidelines/` 会改 GCO-008，却不会自动获得执行力，因此不做。

## 10. 受支持入口收敛，生成 adapter 不是 Source of Record

仓库目前存在 `.claude/commands`、`.claude/skills`、`.codex/prompts`、`.codex/skills`、
`.agents/skills` 多种 OpenSpec surface，版本并不完全一致。OpenSpec 官方又明确说
`openspec update` 会重新生成 agent instructions。

因此按以下单一路径处理：

- 七问与行为规则不手抄进生成文件；primary injection 是 `openspec/config.yaml`，root instruction 只保留短路由；
- proposal 先盘点真正可被当前 harness discovery/调用的 apply/archive surface，明确项目的 supported set；
- supported apply entry 必须读取 required operation guidance；supported archive entry 必须有权限调用 finalizer，
  并删除自己的 raw move/direct native-archive success path；
- 仍可被 discovery 的旧副本要么迁移到同一薄路由，要么从 supported/discoverable set 退役，不能一边保留旧成功路径，
  一边把它称作“无关历史文件”；
- gate 逻辑只存在于 finalizer。adapter/update conformance 用 focused static/integration evidence 保护，
  `openspec update` 后重跑；它不是 finalizer 每次 archive 时再执行的一层 validator。

生成文件因此仍不是行为 Source of Record；它们只是把各 harness 接到同一 Interface 的 Adapter。accepted spec、
config、guideline 和 governance Module 拥有行为，adapter 只拥有“如何从当前 harness 调到该 Interface”。

## 11. 自动化强度的诚实边界

这个方案提供三种不同强度，不能混称：

1. **自动送达**：`rules.tasks` 生成 durable review obligations；root instructions + OpenSpec operation guidance
   在每次相关 session/operation 把当前 review posture 推入 context；
2. **正常流程硬闭合**：governance finalizer 要求 marker/tasks/checks 闭合，再调用 native OpenSpec archive；
   supported entry 一旦进入 finalizer，就不再依赖 Agent 另记各条 checker 命令；
3. **仓库权限边界**：有 shell 权限的人仍可故意绕开全部 repo flow 直接移动文件。本 capability 不增加
   CI 或 tracked git hook，也不声称提供 OS 级权限隔离。

目标是：**在项目支持的 OpenSpec flow 中，遗漏从“静默可能”变成“必须主动绕过单一 finalizer”**，
而不是声称 Markdown 能提供 OS 级不可绕过保证。

## 12. 要创建的 OpenSpec change

Change ID：`establish-openspec-change-feedback-loop`。

它新增一个有界的 change-lifecycle capability，只拥有四类行为：review protocol 在 lifecycle event 被送达；
finding 进入 durable change ledger；project mechanical prerequisites 与 native archive transition 绑定；
项目支持的入口收敛到同一 protocol/finalizer。`requirement-traceability` 与 `verification-routing` 继续拥有
各自 checker 的事实。capability 名称、prefix 和 requirement 编号在 proposal 时按 registry 规则登记，
不在本 analysis 文档制造未接受的 requirement identity。

Task 顺序如下：

1. proposal/spec/design 定义上述 capability ownership、semantic review 与 deterministic closure 的边界，
   并完成 semantic-precision / simplicity admission；
2. 将七问从本 backlog 蒸馏到 `guidelines/change-feedback-loop.md`，删除 BUG catalog，保留
   implementation-neutral connected reasoning，不做 schema；
3. 在 `openspec/config.yaml` 增加 artifact rules、两个 marker task，以及 apply/archive operation guidance；
4. 给 `AGENTS.md` / `CLAUDE.md` 增加短 router；盘点 supported adapter set，让其消费 guidance，并把 archive
   transition 收敛到 finalizer；
5. 在 `openspec/governance/` 实现 guarded finalizer：复用现有 checker，包装 native
   `openspec archive --json --skip-specs`，不传 `--yes`，不重写 spec merge、archive naming 或普通 move；
6. 按 accepted `verification-routing` 分类验证 config injection、marker/task closure、supported-entry routing、
   finalizer 的 failure short-circuit / success side effects；不使用 JS fixture 冒充 Agent semantic review；
7. 对 proposal 时仍 active 的 change 做 truthful migration，并用本 change 的 closeout/finalizer 完成第一次 dogfood。

第 6、7 项必须严格区分 proof scope：JS-led evidence 只证明 delivery 和 deterministic closure；真实 dogfood
只是 adoption observation，不证明 reviewer 永远能发现所有语义问题，也不成为 archive 的机器 verdict。
本 change 不为 repo-level OpenSpec lifecycle 硬造一个需要 unrelated research bundle 的 `agent_flow_e2e`。

## 13. 完成判据

机制只有同时满足以下条件才算完成：

- 新建 tasks 会收到两个 lifecycle marker；每次 apply/resumed-apply invocation 无需用户另行提醒即可收到当前
  apply guidance；
- adoption 时的 active changes 已显式、truthful 地迁移；archived history 未被改写，也没有永久 bypass；
- archive 调用会对 actual diff 做 closeout review；finding 会变成 pending task 并回到 apply；
- missing/duplicate/unchecked lifecycle marker、其它 pending task、strict validation 或三个既有 governance
  checker 任一失败时，finalizer 不调用 native archive；
- finalizer 的成功路径由 native `openspec archive --json --skip-specs` 完成，且 `specsUpdated: false`、main specs
  字节不变；没有 `--yes`、第二套 spec merge、写后回滚或 hand-written normal move；
- `AGENTS.md` / `CLAUDE.md` 不复制七问；supported entry set 有明确清单，其 apply/archive 路由和权限满足
  第 10 节，仍可 discovery 的旧成功路径已经迁移或退役；
- deterministic evidence 与真实 dogfood 分别声明自己的 proof boundary，没有互相冒充；
- 机器没有对 semantic review 质量给假 PASS；
- 新发现的重复 bug 至少沉淀为 direct regression、共享机械检查、泛化 guidance 或明确 non-generalization
  之一，而不是只留在本次聊天。

## 14. 最终取舍

- **做**：OpenSpec task rules + operation guidance + persistent findings + risk-led Agent review +
  supported-entry convergence + `openspec/governance/` guarded finalizer。
- **复用**：历史 governance attach pattern、现有三 checker、native OpenSpec archive、
  risk-led review 方法、七问、OpenSpec 1.7 dynamic instruction channel。
- **不做**：SessionStart banner、Claude-only hook、外部 LLM judge、`semantic_objects[]` schema、Tier-A 泛化扫描、
  整体移动 `guidelines/`、全 repo adapter runtime 扫描器、把完整逻辑复制到每个 harness adapter。

这才是能针对“反反复复修改同一类 bug”的反馈机制：项目支持的 change flow 会在关键事件重新推送相关风险，
发现的问题回到可继续执行的 tasks，机械闭合又与最终 archive move 绑定；同时没有让 Engine 冒充语义评审者。
