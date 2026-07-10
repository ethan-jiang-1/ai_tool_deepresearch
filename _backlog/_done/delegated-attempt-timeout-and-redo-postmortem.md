# 复盘:Delegated Work-Unit 的 Timeout / REDO 机制

**触发 bundle:** `dpt_rb_pragmatic-summit-2026-ai-impact`
**取证时间:** 2026-07-09(现场跨越 03:09–04:08 UTC / 本地 11:09–12:08)
**性质:** 只读现场取证(bundle 磁盘 + `rb_trace.jsonl` + runtime receipt + cache meta + 引擎代码)
**状态:** 诊断结论已从推断坐实为证据;修复方向为建议,未实施

## TL;DR

- `(needs redo)` 不是框架术语,是 orchestrator 给「回来时没交出可用产物」的 subagent 贴的 TODO 标签。**REDO 机制工作正常且已成功**:失败的 02/04 被重做、submit 落库,run 自行推进到 Wave1。
- 四个 topic 的证据**最终全部靠 `curl` 兜底救回**(WebFetch 被网络策略整体 block)——**降级链本身好使**。
- 真正的浪费:02/04 各白烧一个失败会话 + 一个 redo 往返。根因是 **10 分钟 wall-clock deadline 太短 + 降级链是「软指令」而非强约束**。
- **关键发现:引擎的 submit 并不因 wall-clock 过期而拒绝**,它只拒 status 已 terminal 的 attempt。「回来了却被放弃」是 orchestrator 的 timeout 策略太激进,不是引擎强制 —— 策略层可修。
- wall-clock deadline 对「合盖再开」场景是根本缺陷,建议改为**心跳续期 + late-accept**。

## Part A — REDO 事件复盘(what happened)

### 时间线(UTC)

| 时间 | 事件 |
|---|---|
| 03:18:59 | 批量 claim 4 个 wave0 source-intake(i0001–i0004),deadline 03:28:59(10min) |
| ~03:22 | i0001 curl 抓取完成 |
| ~03:34 | i0003 抓取完成 |
| **~03:34(第一次快照)** | **i0001✅ i0003✅,i0002❌空 receipt,i0004❌空 receipt → orchestrator 标 `needs redo`** |
| 03:38:56 | **i0004 第二会话真正起跑**(receipt 真实 ts) |
| 03:43:35 | i0004 curl 抓取(cache `fetched_at`) |
| 03:49:01 | i0004 写完 source.yaml / refs / result |
| 03:51:32–33 | **i0002、i0004 submit 落库**(各 output_count:3, cache_trail_count:13) |
| ~03:51–55 | wave0_complete gate 通过 |
| 03:55:31 | 进入 Wave1,claim wave1-deepen-02/04 |

### "REDO" 是什么

- 全域 grep 不到 "redo";它是 orchestrator 自己 TODO 上的标签。
- 含义:被委派 subagent 返回时未满足 work-unit 输出契约(无 `result.json`、`runtime-receipt.jsonl` 为 0 字节、无 output/cache),orchestrator 判定需重做。
- 判定与结果均正常:`_index.json → status_counts.submitted: 4`;`rb_status.json → current_gate: wave0_complete`。**做错重来,重来成功,gate 通过。**

### 02/04 死因(已坐实)

i0004 的 receipt ts 是真实的(非整点、带毫秒):`work_started 03:38:56.607Z → file_written 03:49:01.185Z`。而 i0004 第一次 claim 是 `03:18:59`。→ **claim 后整整 20 分钟无任何 receipt**,直到 03:38:56 才起跑。这段空白 = 第一会话卡死/空产出,被判 redo 后第二会话才真正开跑。**死因:不是抓不到,是第一会话在 10 分钟窗口内没能落地兜底手段,空手返回。**

### 复活手段:四个 topic 全靠 curl

所有 cache `meta.json`:`fetch_method: "curl"`,并显式记 `webfetch_status: "blocked_by_network_policy"`;i0004 result summary 原话:*"WebFetch was blocked by network policy; page bodies captured via Bash curl"*。抓不动的(403 / bot 墙 / JS 壳)均显式留 `degraded_reason`,符合 `cache-raw-web-content/spec.md:77-106`。01/03 与 02/04 最终用同一招 curl,差别只是**第几次悟到**。

## Part B — Timeout 机制解剖(代码级)

### deadline 如何计算 —— 绝对 wall-clock

`engine/work-unit-lifecycle.mjs:62-63`:
```js
const claimedAt = now();
const deadlineAt = new Date(Date.parse(claimedAt) + timeoutMs).toISOString();
```
`timeout_ms` 默认 `600000`(10min,`queue.mjs:15`),可被 `queueItem.targets.delegates.timeout_ms` 覆盖(`lifecycle:55`)。**deadline 是绝对时间戳,不感知实际工作时长或暂停。**

### submit 何时拒 —— 只认 status,不认 wall-clock(关键)

`engine/work-unit-submit.mjs:259`:
```js
if (['failed', 'timed_out', 'abandoned'].includes(record.status)) {
  // late submit rejected
```
**submit 不检查 `deadline_at`。** 只要 status 仍是 `claimed`,过了 wall-clock 也照样接受。拒绝只发生在**已经有人显式调用 `operate-work-unit timeout`**(`operate-work-unit.mjs:105`)把 attempt 打成 `timed_out` 之后。

### timeout → 自动重试

`engine/work-unit-lifecycle.mjs:388-400,441`:timed_out 时构造 `retryItem`(`attempt_index+1`、`retry_of_work_id`),`preempt` 插队重入队,返回 `retry_requeued: true`。这就是 REDO 的引擎实现。

### 新 attempt = 全新 identity(痛点根源)

新 claim 走 `createWorkUnitInIndex`:新 `work_id`(`allocateWorkId`)、新 `receipt_nonce = wu-${randomUUID()}`(`lifecycle:65`)、新 `claimedAt`/`deadlineAt`。→ 旧 attempt 落盘的产出带旧 nonce,**对不上新 attempt**,故需手动改写 `result.json` 的 identity 再 submit,或整段重跑。

## Part C — 三个设计问题的回答

### Q1「回都回来了,放弃肯定不对」→ 对

引擎其实留了活口(submit 只认 status 不认 wall-clock)。真正把慢但成功的 attempt 判死的,是 orchestrator 过早调用 `timeout`。正确策略:**timeout 前先看磁盘有没有 result/receipt 进展,有产出就别 timeout,或走 late-accept。** 与未提交 change 的 `dry-submit`「先看产出再决定」同源。

### Q2「redo 的 timeout 要不要 reset」→ 自动 reset,但产出未继承

新 attempt 天然是全新 10 分钟(`lifecycle:62-63`)。代价:新 identity 使旧产出作废,被迫重跑或手改 identity。**改进点:重试时继承旧 attempt 已落盘的产出(按 queue_item 而非 nonce 绑定产出),避免白重跑。**

### Q3「合上机器再打开继续」→ wall-clock deadline 的根本缺陷

`deadline_at` 是绝对时间戳。合盖期间 `now()` 继续走,一开盖所有在途 attempt 集体过期,即使真实计算时间没走。引擎无 pause/resume 感知,`_beacon.json` 只存静态 deadline、不续期。

**解法选项:**
- **(a) 心跳续期**:deadline = `last_receipt_at + grace`;判过期看「距上次进展多久」,不是绝对钟。治「慢但活着」+「合盖」。
- **(b) 进展感知 timeout**:orchestrator timeout 前查 receipt/产出更新,有则不打死。
- **(c) late-accept**:status=timed_out 但磁盘有完整 result+cache,允许带审计标记的 late submit,免重跑。
- **(d) pause-aware**:显式 pause 冻结在途 deadline,resume 顺延(需主动 pause 信号)。

**推荐:(a) + (c)。** 心跳续期把「总墙钟」换成「无进展墙钟」,一举治「慢/合盖」;late-accept 兜住「产出已落盘别浪费」。

## Part D — 根因综合 与 与未提交 change 的关系

两条根因叠加,制造了「白空手一次、靠 REDO 兜」:

1. **10 分钟 wall-clock deadline 太短且不感知进展/暂停**(本报告 Part B/C)。
2. **降级链是「软指令」而非强约束**(见下),第一会话能否落地兜底全靠悟性。

降级链退化的三个洞(`subagent-dpt-source-intake.md:149-158`):
- 从未上升为 spec 的 SHALL 强约束(没规定「单 URL 逐级走完 curl/Node 才准记失败」);
- 阶梯末端是 `Python urllib`,违反 repo「绝对不用 Python」且环境未必可跑;
- 未区分「单 URL 降级」与「多 URL 批量」。

未提交 change `openspec/changes/harden-delegated-preflight-and-fetch-hygiene/` 已精准覆盖降级链三洞(subagent-node-contract:单 URL 逐级 + 移除 Python;research-wave-phase-content:floor+margin;delegated-work-units:dry-submit 预检),**但尚未 apply**,且**未覆盖 timeout 机制本身**(deadline 语义、心跳续期、late-accept、pause-aware)。→ timeout 侧可能需要一个独立 change。

## Part E — 建议(分层)

**策略层(orchestrator,不改引擎硬约束,见效快):**
- timeout 前先检查磁盘产出/receipt 进展;有完整产出则优先 submit 而非 timeout。
- 缩短「白空手」窗口:利用引擎「submit 不看 wall-clock」的既有事实,不要急着调 `timeout`。

**引擎层(需独立 change):**
- 心跳续期(a):`deadline = last_receipt_at + grace`。
- late-accept(c):为「有产出的过期 attempt」提供带审计标记的 late submit 路径。
- 产出继承:重试 attempt 复用旧 attempt 已落盘产出,避免重跑。
- pause-aware(d,可选):显式 pause/resume 冻结与顺延在途 deadline。

**数据诚信(附带发现):**
- subagent 自报的 runtime-receipt 时间戳不可信(i0002 声称 03:23 完成,真实 mtime 03:51;仅 i0004 用真实 ts)。当前引擎视其为 `diagnostic_only`,不进 gate。若将来要用 receipt ts 做性能复盘,应改由引擎在 submit 时盖章。

## 附:证据与代码索引

- 状态:`_work_units/_index.json`(status_counts)、`rb_status.json`
- 时间线:`rb_trace.jsonl`(work_unit_claimed / submitted / late_submit_rejected 事件)
- 死因:`_work_units/wave0/wu-w0-b000-src-i0004/runtime-receipt.jsonl`(真实 ts)
- 复活手段:`_cache/wave0/primary/0{2,4}_*/**/meta.json`(fetch_method=curl)
- deadline 计算:`DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs:55,62-63`
- submit 拒绝条件:`DPT_FRAMEWORK/engine/work-unit-submit.mjs:259`
- timeout→retry:`DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs:388-400,441`
- timeout 子命令:`DPT_FRAMEWORK/cli/operate-work-unit.mjs:105-108`
- 降级链现状:`DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-intake.md:149-158`
- 修复设计(部分,未 apply):`openspec/changes/harden-delegated-preflight-and-fetch-hygiene/`
