# 修复计划:Delegated Work-Unit 的 Timeout / REDO 机制

**来源:** `_backlog/_done/_closed_plans/delegated-attempt-timeout-and-redo-postmortem.md`
**生成时间:** 2026-07-09  
**性质:** OpenSpec change 拆分建议;不修改原 postmortem  
**推荐结论:** 用 **2 个 change** 修,不要拆成 3 个以上;其中第 1 个防误杀,第 2 个处理已经误杀后的补救。
**归档状态（2026-07-12）:** Closed — Change A 已由 v0.15 progress-aware timeout preflight 落地；Change B 已由 v0.16 audited `late-submit` 落地。下文“仍未修复”保留为当时切片依据，不代表当前实现状态。

## 0. 先校准:哪些已经被最近 change 修掉

原 postmortem 里有一部分现在已经过期,不能重复开 change。

### 已修复 / 已覆盖

1. **fetch fallback 三洞已修**
   - 已归档 change: `2026-07-09-harden-delegated-preflight-and-fetch-hygiene`
   - 覆盖点:
     - `subagent-dpt-source-intake.md` 移除 Python fallback,改为 JS/Node-first。
     - Wave0/Wave1 Sub-agent guidance 已区分 per-URL fallback 与 multi-URL small-batch / bounded parallel。
     - search snippets 不能替代 fetched page content 的要求继续保留。
   - 对应原文里“降级链是软指令 + Python urllib + 未区分单 URL/多 URL”的问题,现在不应再作为新 change 主体。

2. **submit 前诊断缺口已修**
   - 已归档 change: `2026-07-09-harden-delegated-preflight-and-fetch-hygiene`
   - 新能力: `operate-work-unit dry-submit`
   - 覆盖点:
     - 可在正式 submit 前结构化看到 result/output/source/cache/receipt/queue-binding 违规。
     - dry-submit 无 ledger/queue/status/receipt/cache/trace/log/transaction 副作用。
     - `page-content.md` 可用 virtual canonical view 预检,不写 `page.md`。
   - 对应原文里“timeout 前先看产出/receipt,有完整产出优先 submit”的策略,现在有了可执行抓手,但 phase/timeout 策略还没有被强制绑定。

3. **跨 work-unit 串行等待已修一半以上**
   - 已归档 change: `2026-07-08-parallel-delegated-phase-execution-and-reference-materialization`
   - 覆盖点:
     - Wave0/Wave1 phase docs 已经使用 bounded top-up batch claim、active polling、submit/repair/terminalize loop。
   - 剩余问题不是“能不能并行 claim”,而是“什么时候可以安全 terminalize timeout”。

4. **Agent-facing work-unit 写入合同已修**
   - 已归档 change: `2026-07-08-stabilize-agent-facing-work-unit-contracts`
   - 覆盖点:
     - task/beacon/result schema/absolute bundle path/write-before-return verification 更清楚。
   - 原 postmortem 里“空 receipt / 空产出”的症状仍会发生,但现在更像 timeout policy 需要更好的 preflight,不是 task 合同完全缺失。

### 仍未修复 / 仍成立

1. **timeout 仍是绝对 wall-clock lease**
   - `createWorkUnitInIndex()` 仍用 `claimed_at + timeout_ms` 写 `deadline_at`。
   - 它不表达 `last_progress_at + grace`。
   - 它不感知合盖/暂停/实际 Agent 是否已经开始工作。

2. **`operate-work-unit timeout` 仍可直接 terminalize claimed attempt**
   - `closeWorkUnitAttempt(... status: timed_out)` 只检查 status 是 `claimed`,不做 progress/dry-submit preflight。
   - phase docs 虽然有 active polling,但没有 deterministic guard 阻止“有产出却被 timeout”。

3. **terminal attempt 的 late submit 仍 fail closed**
   - accepted spec 当前写死: terminal `fail/timeout/abandon` 后 late submit fail closed。
   - code 当前也如此: `recordSubmitRejection()` 对 `timed_out` 返回 `work_unit_late_submit_rejected`。
   - 这保护了 ledger/queue authority,但也造成“已经产出完整,只是回来晚了”的浪费。

4. **retry attempt 不继承旧 attempt 产出**
   - timeout 后 retry 会分配新 `work_id` / `receipt_nonce`。
   - 旧 attempt 的 result/receipt/cache 即使完整,也不能直接作为新 attempt 成功产物。
   - 强行改写 identity 很危险;更好的方向是 audited late accept 原 attempt,而不是把旧产物伪装成新 attempt。

## 1. 推荐拆法:2 个 OpenSpec change

我不建议 1 个 change 全吃掉,也不建议 3 个以上。

- **1 个 change** 会把 lease policy、timeout guard、late submit、queue supersede、experiments 全混在一起,apply 风险太高。
- **3 个 change** 会把同一条 timeout/redo recovery 语义切碎,容易出现第一个 change 做了 preflight,第二个 change 改 terminal,第三个 change 才补实验,中间状态不自洽。
- **2 个 change** 刚好按风险边界切:
  - Change A: 防止新的误杀。
  - Change B: 处理已经误杀后的可审计补救。

```text
           ┌────────────────────────────────────────────┐
           │ Change A: timeout 前不要误杀 claimed attempt │
           └────────────────────────────────────────────┘
                         │
                         ▼
           ┌────────────────────────────────────────────┐
           │ Change B: 已 timed_out 但完整产出可 late accept │
           └────────────────────────────────────────────┘
```

## 2. Change A — `harden-delegated-timeout-preflight-and-progress-lease`

### 目标

把 timeout 从“看绝对 deadline 然后 terminalize”改成“先跑 Engine preflight,只有无进展/无可提交产物时才允许 terminalize”。

这个 change 解决 postmortem 里最主要的浪费来源:Sub-agent 慢、卡、或环境暂停时,Main Agent 不应仅凭 wall-clock deadline 就调用 `timeout`。

### 需要改的 capability

- `delegated-work-units`
- `subagent-node-contract`
- `research-wave-phase-content`
- `research-wave-experiments`

### 建议新增/修改要求

1. **Timeout preflight SHALL run before terminal timeout**
   - 新增 CLI 或扩展现有 inspect,推荐新增:
     ```bash
     node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <id>
     ```
   - 输出结构建议:
     ```json
     {
       "ok": true,
       "work_id": "...",
       "timeout_eligible": false,
       "recommended_action": "dry-submit|wait|timeout|repair",
       "progress": {
         "receipt_nonempty": true,
         "result_exists": true,
         "cache_dirs_present": true,
         "latest_progress_at": "..."
       },
       "dry_submit": { "expected_submit": "pass|fail|unknown" },
       "inspect": [],
       "advice": []
     }
     ```
   - 如果 assigned `result.json` 存在,preflight 应优先调用 dry-submit 等价检查。
   - 如果 dry-submit pass,advice 必须是 submit,不是 timeout。
   - 如果 dry-submit fail 但违规可修,advice 必须是 repair same `work_id`,不是 timeout。
   - 只有无 result、无 receipt progress、无 output/cache progress,或 progress stale 超过 idle grace,才给 `timeout_eligible: true`。

2. **`operate-work-unit timeout` SHALL be guarded**
   - 推荐让 `timeout` 默认拒绝 progress-positive attempt:
     - 有 non-empty receipt;
     - 有 candidate result;
     - 有 declared/observed output/cache progress;
     - 或 latest progress 未超过 idle grace。
   - 若确实要强关,显式加 `--force` 并记录 `forced_timeout: true`、reason、progress summary。
   - 这样 phase docs 的“close it with timeout”不会成为误杀入口。

3. **Lease SHOULD become progress-aware**
   - 现有 `deadline_at = claimed_at + timeout_ms` 可以保留为 initial lease hint,避免破坏旧 surfaces。
   - 但 timeout eligibility 应使用:
     ```text
     effective_timeout_at = latest_engine_observed_progress_at + idle_timeout_ms
     ```
   - `latest_engine_observed_progress_at` 初期可以来自 deterministic filesystem observation:
     - runtime receipt file mtime / non-empty lines;
     - assigned result file mtime;
     - declared or observed output/cache leaf mtime;
     - work-unit log/trace lifecycle events where available.
   - 不要信任 sub-agent 自填 timestamp 作为唯一依据;mtime / Engine trace/log 写入时间更可信。

4. **Sub-agent guidance SHALL emit progress before slow fetch batches**
   - role docs/task prompt 继续要求 lifecycle events。
   - 增加“每批搜索/抓取/写 cache 后写 receipt/log progress”的要求。
   - 这不是让 receipt 成 gate authority,只是让 timeout preflight 有可观测进展。

5. **Phase docs SHALL route timeout through preflight**
   - Wave0/Wave1/Wave2 delegated drain loop:
     - `inspect`
     - `timeout-preflight`
     - `dry-submit` if result exists
     - repair/submit/wait
     - only then `timeout`

### 不做什么

- 不改变 successful submit 语义。
- 不允许 terminal `timed_out` attempt 直接 submit;这留给 Change B。
- 不改变 gate floors。
- 不实现 Engine-owned fetcher 或 daemon。
- 不把 sub-agent 自填 receipt ts 变成性能 truth。

### 测试重点

- `timeout-preflight` 对空 receipt / 无 result / 无 cache 的 claimed attempt 给 `timeout_eligible: true`。
- 有 non-empty receipt 或 output/cache mtime 的 attempt 给 `timeout_eligible: false`。
- assigned `result.json` 存在且 dry-submit pass 时,advice 指向 formal submit。
- assigned `result.json` 存在且 dry-submit fail 时,advice 指向 repair same `work_id`。
- `operate-work-unit timeout` 默认拒绝 progress-positive attempt,`--force` 才能 terminalize,并写 trace/log diagnostic。
- 现有 timeout retry happy path 在 no-progress case 仍然成立。

### 验收直觉

完成 Change A 后,postmortem 里的 i0002/i0004 第一会话如果已经开始写 receipt/cache/result,不会被单纯 wall-clock 打死;如果完全空白,才会走 timeout/retry。

## 3. Change B — `add-audited-late-accept-for-timed-out-work-units`

### 目标

给“已经被 timeout,但随后完整产物回来了”的 attempt 一个可审计的成功路径,避免重跑或手改 identity。

这个 change 应该在 Change A 之后做。Change A 减少误杀发生率;Change B 处理已经发生的误杀。

### 需要改的 capability

- `delegated-work-units`
- `work-unit-provenance-gate`
- `research-wave-experiments`

### 建议新增/修改要求

1. **Late accept SHALL be explicit, not normal submit**
   - 不建议让普通 `submit` 悄悄接受 terminal attempt。
   - 推荐新增显式命令:
     ```bash
     node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json>
     ```
   - 或 `submit --late-accept`,但独立 subcommand 更清楚。

2. **Late accept SHALL only apply to `timed_out`**
   - `failed` / `abandoned` 仍 fail closed。
   - 这样不破坏“Agent 显式失败/放弃”的语义。

3. **Late accept SHALL reuse original attempt identity**
   - 结果必须匹配原 timed-out attempt 的 `work_id`、`queue_item_id`、`kind`、`receipt_nonce`。
   - 不做“把旧 result 改成新 retry work_id”的产出继承。
   - 原因:改写 identity 会把真实产出来源弄糊;late accept old attempt 更诚实。

4. **Late accept SHALL be queue-safe**
   - 如果同一 queue item 的后续 retry attempt 已经 submitted,late accept 必须拒绝,避免双 ledger。
   - 如果后续 retry item 仍在 active/refill queue 中,late accept 可以移除该 retry demand。
   - 如果后续 retry attempt 已 claimed 但未 submitted,late accept 可以把后续 attempt terminalize 为 `abandoned` / `superseded_by_late_accept`,并清理 `delegated_in_flight`。
   - 所有这些必须在一个 work-unit transaction 中完成,并有 durable queue postcondition。

5. **Ledger SHALL mark audited late accept**
   - ledger row 可继续使用原 `work_id`,但需要附带可审计字段,例如:
     ```json
     {
       "late_accept": true,
       "late_accept_reason": "...",
       "terminal_status_before_accept": "timed_out",
       "superseded_retry_work_ids": []
     }
     ```
   - 如果 ledger schema 不适合加字段,则 trace/log 必须有等价审计事件,但我倾向 schema 明确化。

6. **Gates SHALL count audited late-accepted ledger rows**
   - Gate 仍只看 Engine-written submitted ledger rows。
   - Late accept 的 row 是 Engine-written,并通过同样 result/cache/receipt/source validation,所以可以计入 delegated coverage。

7. **Existing fault-tolerance experiment SHALL be revised carefully**
   - 当前 `research-wave-experiments` 有 requirement: late submit after timeout fails。
   - 需要改成:
     - normal submit after timeout still fails;
     - explicit `late-submit` may pass only under strict audited conditions;
     - late-submit rejects if replacement already submitted.

### 不做什么

- 不允许 metadata-only relabel。
- 不手改历史 ledger row。
- 不允许 old attempt 与 retry attempt 双成功。
- 不让 late accept 绕过 cache/source/receipt/result validation。
- 不把 failed/abandoned 改成可 late accept。

### 测试重点

- timed_out attempt + original matching result/cache/receipt + no replacement submitted -> `late-submit` succeeds, ledger row marked audited, queue completed.
- normal `submit` against timed_out still rejects.
- timed_out old attempt + later retry already submitted -> `late-submit` rejects, no second ledger row。
- timed_out old attempt + later retry claimed but not submitted -> `late-submit` succeeds, later retry becomes superseded terminal, in-flight cleared。
- failed/abandoned late-submit rejects。
- gate coverage counts only the late-accepted Engine ledger row, not filesystem-only output。

### 验收直觉

完成 Change B 后,“回都回来了,但已经 timed_out”不需要手改 nonce 或整段重跑;只要产物确实完整、后续 retry 还没成功,Engine 可以带审计地接住它。

## 4. 为什么不单独开第三个 `pause-aware` change

原 postmortem 的“合盖再开”很重要,但现在还没有明确外部 pause/resume 信号。

如果没有 runner/app 层主动发:

```bash
operate-work-unit pause-leases <bundle>
operate-work-unit resume-leases <bundle>
```

Engine 很难可靠地区分:

- 机器睡眠;
- Agent 卡住;
- 网络慢;
- Sub-agent 忘了写 progress;
- 用户真的希望 timeout。

所以我建议先不单开 pause-aware change。Change A 的 progress-aware idle lease 已经能覆盖大部分“合盖导致 wall-clock 过期但没有真实工作时间流逝”的痛点:只要没有人强制 timeout,回来后 preflight 会看当前产物/progress 决策。

等将来 Codex app / runner 能提供明确 suspend/resume lifecycle signal,再开第三个 change 比较稳。

## 5. 推荐执行顺序

### Step 1: propose Change A

Change name:

```text
harden-delegated-timeout-preflight-and-progress-lease
```

OpenSpec artifacts 应包含:

- proposal: 防误 timeout;progress-aware timeout eligibility;timeout preflight;phase docs 接入。
- design: progress source 优先级、mtime vs receipt ts 信任边界、`timeout --force` 语义、dry-submit 集成。
- specs:
  - `delegated-work-units`
  - `subagent-node-contract`
  - `research-wave-phase-content`
  - `research-wave-experiments`
- tasks:
  - CLI/API: timeout-preflight
  - lifecycle: guarded timeout / force timeout
  - docs: Wave0/Wave1/Wave2 drain loop
  - tests: no-progress timeout, progress-positive refusal, dry-submit advice path

### Step 2: apply and archive Change A

先让“不会再轻易误杀”落地,再考虑 late accept。这样 Change B 的复杂 queue-supersede case 会少很多,也更容易测试。

### Step 3: propose Change B

Change name:

```text
add-audited-late-accept-for-timed-out-work-units
```

OpenSpec artifacts 应包含:

- proposal: terminal timed_out 的显式 audited exception。
- design: sibling retry attempt detection、queue cleanup/supersede transaction、ledger/trace audit shape。
- specs:
  - `delegated-work-units`
  - `work-unit-provenance-gate`
  - `research-wave-experiments`
- tasks:
  - CLI/API: `late-submit`
  - submit planner: validate original timed_out record under strict late mode
  - queue transaction: remove/supersede retry demand/attempt
  - tests: no double ledger, replacement submitted rejection, gate counts audited row

## 6. 最小可接受修复线

如果只想先做一刀,做 Change A,不要先做 Change B。

原因:

- Change A 防止新事故,风险小,收益高。
- Change B 是 terminal 语义例外,会碰 queue/ledger/gate/experiment 合同,必须更谨慎。
- 有了 dry-submit 和 timeout-preflight,大多数“慢但已有产出”的情况会被 submit/repair 接住,late accept 只处理真正 race 掉的少数 case。

## 7. 不建议的修法

- 不建议“把 timeout_ms 从 10 分钟改大”作为主修复。它只是把误杀往后推,不解决 wall-clock/pause/progress 的语义问题。
- 不建议“retry 自动继承旧 attempt 文件并改 nonce”。这会污染 provenance,且和 submit 的 identity/nonce 设计冲突。
- 不建议“普通 submit 接受 timed_out”。这会弱化 terminal fail-closed 合同,并和现有 fault-tolerance playbook 冲突。
- 不建议“Engine 自动 fetch 或监控 Sub-agent”。这越过了 Markdown Agent Flow / JS deterministic checkpoint 边界。

## 8. 当前 postmortem 的状态更新

原 postmortem 的结论可以更新为:

- REDO 机制本身仍是有效 fallback,不需要废弃。
- fetch fallback / Python / per-URL vs batching / dry-submit 已由 v0.14 归档 change 修复。
- 真正剩余缺口是 timeout terminalization policy 和 late terminal recovery。
- 推荐通过上述两个 OpenSpec change 修复,先防误杀,再补 late accept。
