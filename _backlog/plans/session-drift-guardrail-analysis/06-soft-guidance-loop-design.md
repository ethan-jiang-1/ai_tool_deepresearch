# 06 — 软 Guidance Loop（建议的第二层，泛化的那一层）

> 本文件是 `04`（硬地板）之上的**第二层**推荐。`04` 解决“可确定的违规在不可逆接缝被拦”；
> 本文件解决“**跨整个 bug 类的泛化提醒**”——用户的核心诉求：一个自动的、跨 session 的、给反馈的引导，
> 让反复出现的那几类坑**在干活的当口被点亮**。`04` 和 `06` 互补，**缺一不可**。
>
> **后续收束**：方向保留，触发/载体设计以 `08` 为准。OpenSpec 1.7 已原生提供
> `operations.apply/archive.guidance`，因此不再推荐 “OpenSpec skill + Claude hook + git hook” 三路并行，
> 也不把七问全文复制进 `AGENTS.md` / `CLAUDE.md`。最终是一个 OpenSpec-centered loop。

## 1. 关键洞察：语义层必须是 advisory，而不是 validator

上一轮（`03`）压测把两层 **硬 gate** 设计（Tier-A 派生检查 + Tier-B 声明卡）都否了，核心理由是
**GCO-007 禁止把语义精度做成 deterministic validator**（pass/fail 的机器裁决）。

但 GCO-007 禁的是 **semantic verdict（语义裁决）**，**不是 reminder（提醒）**。一个“在你干活时提醒
你考虑 X、Y”的 reviewer 是 advisory：它不让 Engine 判设计及格，只把风险点亮。

“正好绕开 S0–S7 全部”说得过强。advisory 仍需要可靠触发、finding 持久化和机械 closeout；否则它仍可能
只存在于一次聊天。`08` 用 OpenSpec operation guidance 触发、tasks 持久化、finalizer 闭合，补上这三点。

**本文件的设计不是 Tier-A/Tier-B 的复活**。那两个是 *validator*（确定性 pass/fail）；本文件是
*advisor*（advisory 反馈）。形式不同，正是这个差别让它 GCO-007-safe。

## 2. 两层模型（明确各自职责）

| 层 | 形态 | 抓什么 | 文件 |
|---|---|---|---|
| **硬地板** | 确定性 gate（pass/fail，在 archive `mv` 前） | 3 个现有 checker 能查的：req-ID 一致性、main-spec 结构、verification asset 边界 | `04` |
| **软 loop（本文件）** | advisory 反馈（提醒，不阻塞） | **整个语义 bug 类**：边界混同、多源 truth、writer≠reader、概念未提升、authority/时间混淆、反馈半边缺失 | `06` |

硬层抓“可确定的”；软层抓“语义的、需被提醒的”。软层是**真正泛化**的那一层——它不限于 3 个 checker
能表达的事实，而是把 32 个 bug + control-shape 分析**蒸馏成可复用的 meta-question**，在每个 change
的当口重新应用。

## 3. 为什么 `/guidelines` 没形成 loop——一句话诊断

`/guidelines` 是**书架（reference）**：你得**主动去翻**，它不会在干活的当口**来找你**；且长、泛。
所以“最初提醒了，但各干各的、看局部”。修法不是“再写更多 guidelines”，而是把智慧从 **pull（去读）
变成 push（事件点来找你）+ context-aware（针对你刚做的事给反馈）**。

## 4. 修正后的三个部件

```text
guidelines/change-feedback-loop.md       单一 advisory wisdom
                  |
                  v
openspec/config.yaml                     artifact rules + apply/archive operation guidance
                  |
                  v
current Agent review                     finding -> pending tasks -> apply
                  |
                  v
openspec/governance finalizer             checks PASS -> native archive
```

- **Living Wisdom**：七问放在一个短 guideline；不是 `openspec/governance/` 下的第二套行为 spec。
- **Push channel**：OpenSpec 1.7 artifact rules 与 `operations.apply/archive.guidance`；这是主要 trigger，
  不需要 Claude-only SessionStart hook。
- **Feedback/closure**：当前 Agent 做 semantic review，finding 回到 tasks；`openspec/governance/` finalizer
  只做 project-level 机械 verdict，再包装 native OpenSpec archive。`AGENTS.md` / `CLAUDE.md` 只是短
  bootstrap/router。

这复用了一个已验证的 repo pattern，而不是凭空设计 carrier。历史上 `rules.tasks` 已让 34/34 个 cutoff 后
committed change 带上两个 project checks；相对地，仅放在宽泛 context 的 custom `verification-plan.yaml`
只有 8/34 落地。故 plan/closeout review obligation 必须进入 `rules.tasks`，并用最小 lifecycle marker 让
finalizer 检查其存在/闭合；详细证据见 `evidence/E-governance-integration-history.md`。

## 5. 为什么这样放是跨 session 的

- `CLAUDE.md` / `AGENTS.md` 让每个支持 harness 知道必须走 OpenSpec dynamic instructions；它们不保存七问。
- 每次 `openspec instructions apply/archive` 都重新读取 current config，resumed session 会收到当前 guidance。
- findings 进入 active change 的 tasks，跨 session 持久；finalizer 每次 archive 都重新检查当前事实。

## 6. Living Wisdom 草案（把例子蒸馏成的 meta-questions）

> 这是从 32 个 bug + control-shape 分析蒸馏出的、可复用设计自检。最终应进入一个短的
> `guidelines/change-feedback-loop.md`；`CLAUDE.md` / `AGENTS.md` 只指向 OpenSpec push protocol，
> 不复制本列表。每次 review 只选与 touched surfaces 相关的项。

在**finalize 一个 change 之前**，就你实际触碰的对象，问自己：

1. **边界**：这次有没有把两个不同的东西（artifact 类型 / authority class / 时间点 / protocol / 责任）
   当成一个？有没有**第二个 consumer** 到来，而原概念没替它留区别？（BUG-146/162/174；control-shape 五层之 1、5）
2. **One truth path**：你碰的这个事实，有没有 >1 个 evaluator/reader 在判它？它们**共用一个解释**，
   还是你又加了一个略不同的？（BUG-178；五层之 3）
3. **Writer = reader**：writer 成功的 postcondition，是否覆盖了 reader/下一 consumer 要解析/信任的**全部**
   （而不只是“我这个 packet 落盘了”）？（BUG-152/154/157/176）
4. **提升还是补丁**：新概念是一个有明确 reader/有界问题/停止点的 **first-class 对象**，还是只有一个
   consumer 会记住的**局部补丁**？（这是“反反复复”的元因）
5. **Authority / 时间**：你在读一个 live/current 值，而本意是 submitted/historical snapshot（或反之）？
   这次“sync/repair”有没有**悄悄改写历史**？（BUG-151/179–186；五层之 2）
6. **反馈半边**：Engine 裁决之后，Agent 拿到的是 **direct root + 已接受的合法写入面 + 同一 checkpoint
   重跑**，或没有合法修复时诚实的 **owner / terminal / missing-contract boundary**，还是只是一句拒绝？
   （BUG-150/153/155/158/160/171/173/177/183）
7. **删除测试**：这次**删除/合并/避免**了什么复杂度，而不只是新增？（net simplification；simple-reliable-control）

注：这些是 **advisory 自检**，不是机器 verdict——GCO-007 允许提醒，禁止裁决。机器只对其中**可确定**的
子集（如“writer 是否真覆盖了 reader”可由 deterministic_e2e 测）做硬检查。

## 7. Reviewer 形状（advisory，GCO-007-safe）

- 输入：当前 change 的 `proposal.md`/`design.md`/delta specs +（apply 期）`apply-target-manifest.md`
  声明的 touched surfaces + change-scoped git diff；具体 baseline 与 owned-surface contract 由 `08` 要求的
  proposal/design 定义，不能把整个 dirty worktree 冒充 selected change。
- **语义部分**：当前 Agent 按 accepted lifecycle protocol 消费 `guidelines/change-feedback-loop.md` 的
  risk-led meta-question 与 review posture，把 touched surfaces 对到相关问题，输出有证据、可行动的 finding。现有
  `polish-openspec-change` 只是方法来源，不是跨 harness 运行依赖。需要工作的 finding 变成 pending task；
  不另调一个外部 LLM judge，也不建 file-pattern 伪语义分类器。
- **确定性部分**：现有 checker 和 archive closure 由 `08` 的 repo-owned finalizer 负责。Reviewer 读取
  其 Check/Inspect/Advice，但不重判结果。
- **不 pass/fail 语义**：reviewer 可以得出“有未解决 finding，因此 change 尚未 ready”的 Agent 判断；
  Engine 只判 tasks/checks 是否机械闭合。

## 8. 单一主 trigger + 两个薄 fallback

| 缝 | 便携性 | 自动程度 | 时机 | 评 |
|---|---|---|---|---|
| **OpenSpec config**（artifact rules + `operations.apply/archive.guidance`） | **最高** | 高（每次相关 operation） | propose/apply/archive | **唯一主 trigger** |
| **`AGENTS.md` / `CLAUDE.md` 短 router** | 高 | 自动进入 harness context | session bootstrap | 旧 adapter / 非标准入口 fallback |
| **`openspec/governance/` finalizer** | harness 无关 | 正常 archive path 的机器闭合 | native archive 前 | deterministic owner，不是 reminder trigger |

第一版不加 Claude hook 或 git hook。只有真实观察到 raw-move/非 OpenSpec 绕过后，才考虑 CI/hook；
不能为了“更自动”先造三条会互相漂移的 trigger path。

## 9. 两条诚实边界

- **不会“灭绝”**（用户也这么判断）。软 loop 把**反复出现的那几类**在当口点亮——把**复发率**打下来；
  但模型是概率的，且总有**全新**的坑。这恰是 charter“errors are data，让错误更早可见、可修”用到设计层。
- **要防 alarm fatigue**（这是 `03` 否 SessionStart banner 的同一理由）：advisor 必须 **rare、targeted、
  specific**——只在选好的事件点跳、只针对本次改动、只点真正相关的坑。硬的、可确定的走硬 gate；**软层只
  负责语义层提醒**，不抢硬层的活，也不泛泛而谈。

## 10. 与 `04`/`05` 的关系

- `04` 保留三个 checker 必须进入 hard floor 的结论，但实现改为 governance finalizer 检查 project
  preconditions 后包装 native archive。
- `06` 保留七问与 targeted advisory review；触发改为 OpenSpec 1.7 operation guidance，finding 回到 tasks。
- 两者不再拆成互不相干的两个 change；最终组装、候选 change 与完成判据统一见 `08`。
