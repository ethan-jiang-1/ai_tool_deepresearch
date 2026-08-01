# Experiment Progressive Run Strategy

> 2026-08-01 | 基于真实耗时数据的 progressive execution plan
>
> **背景**：`RUN_INTERACTIVE_EXPS.md` 对应的 101 个 autorun-compatible cases 很久没跑。第一次试跑 light tier 发现历史 light/standard/heavy 标签跟实际耗时严重脱节。

## 数据来源

2026-08-01 试跑：39 light cases，分两批（$1 budget → $5 budget），逐个 case 跑并记录实际耗时。已跑完 18 个，剩余 21 个 light + 全部 standard/heavy 未跑。

## 核心发现：历史 tier ≠ 实际耗时

| 历史标签 | 实际耗时范围 | 例子 |
|----------|-------------|------|
| light | 31s – 601s | case-74 (31s) vs case-213 (538s) |
| light | $0.22 – $4.69 | 差了 20x |

**耗时跟历史 cost tier 基本无关。** 真正驱动耗时的是 workflow 复杂度：几个 gate、几次状态迁移、fixture 多深。

## 实测数据（18/39 light）

### ⚡ Sprint：30–70s（快速，纯 gate/合约）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 74 | system-logging | 31s | $0.22 | PASS CLEAN |
| 11 | gate-fork | 38s | $0.26 | PASS CLEAN |
| 75 | system-logging | 40s | $0.23 | PASS CLEAN |
| 41 | agentic-queue | 46s | $0.29 | PASS CLEAN |
| 21 | gate-loop | 47s | $0.26 | PASS CLEAN |
| 31 | workflow-chain | 57s | $0.31 | PASS CLEAN |
| 214 | wfn-wave0 | 70s | $0.34 | PASS ISSUES |
| 161 | evidence-extraction | 74s | $0.42 | PASS ISSUES |

特征：0–1 个 gate，fixture 简单或无，bash 步骤少。

### 😐 Standard：100–300s（中速，fixture + 1-2 gate）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 71 | system-logging | 100s | $0.49 | PASS ISSUES |
| 106 | wff-pre-research | 143s | $0.61 | PASS CLEAN |
| 73 | system-logging | 212s | $0.93 | PASS ISSUES |
| 182 | wff-topic-rewrite | 275s | $1.48 | PASS CLEAN |
| 181 | wff-topic-rewrite | 278s | $1.56 | PASS CLEAN |
| 202 | wfn-seedtopic | 294s | $1.97 | **FAIL** |

特征：有 fixture 搭建（`rb_plan.md`、`rb_profile.yaml`、`rb_status.json`），1-2 个 gate，中等 bash 复杂度。

### 🐢 Marathon：400–600s（慢速，多步 workflow）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 203 | wfn-seedtopic | 424s | $2.61 | PASS CLEAN |
| 213 | wfn-wave0 | 538s | $3.40 | PASS ISSUES |
| 224 | wfn-wave1 | 601s | $4.69 | **ERROR (timeout)** |

特征：完整 workflow chain（instantiation → gate → enter-phase → gate → advance-status），3+ 个 gate，大量状态迁移。**需要 `--timeout` > 600s**。

## 已知问题

### 1. `verdict_mode: all` + Agent retry → 误报 FAIL
- **case-202**：gate 首次 attempt 失败（Claude retry 了 bash step），`passed: false` 的中间 check 被 `all` 语义计入 → FAIL
- **已修复**：case-202 改为 `verdict_mode: last`
- **需排查**：还有多少 case 用 `verdict_mode: all` 且 bash step 可能被 retry

### 2. `health=ISSUES`（5 个）
- 71, 73, 161, 213, 214 都是 PASS 但 health 不干净
- 需逐个看 health report 判断是 case 问题还是框架问题

### 3. Timeout
- case-224 在默认 600s 炸了，Marathon 级 case 需要更长 timeout
- 建议 Marathon 级 `--timeout 900000`（15min）

### 4. Budget
- Marathon 级 case 成本 $2.60–$4.69/case
- Sprint 级 $0.22–$0.42/case
- 不需要 tier 预算，按速度档位给 budget 更合理

## Progressive Execution Plan

分 4 波跑，每波结束暂停看结果：

### Wave A：Sprint（预计 ~8 cases，总耗时 ~8min）

剩余未跑的 Sprint 级（按 manifest 推估）：
- case-310/311/312（file-observability，3 个）
- case-407（engine-boundary actor-preflight）
- case-606（autonomous-research-hardening continuation-cues）
- case-301/302/303/304/305（wfn-rerun，5 个，其中部分可能是 Standard）

**策略**：`--max-total-budget-usd 2 --timeout 180000`（3min/case 够用）
**预期**：全 PASS CLEAN，10–15 分钟内跑完

### Wave B：Standard（预计 ~20 cases，总耗时 ~60min）

剩余 Standard 级：
- 大部分 wfn-rerun、reentry-debuggability、engine-boundary 等
- 已确认 Standard 的：71, 106, 73, 181, 182（都过了）

**策略**：`--max-total-budget-usd 3 --timeout 420000`（7min/case）
**预期**：多数 PASS，关注 health=ISSUES

### Wave C：Marathon（预计 ~10 cases，总耗时 ~90min）

- wfn-wave0/1/2 的剩余 case
- iterative_interaction（711–715）
- autonomous-research-hardening 的 heavy 们

**策略**：`--max-total-budget-usd 6 --timeout 900000`（15min/case）
**预期**：需要关注 timeout 和 budget

### Wave D：Real-Agent Heavy（预计 ~25 cases）

真正需要 Subject Agent 的 heavy cases。这些不是确定性测试，需要真实 Agent 执行。
- 需确认 DeepSeek API 可用
- 成本显著高于 Sprint/Standard/Marathon

**策略**：先跑一个探路（case-711），再决定批量策略

## 统计口径

每波跑完汇报：

```
Wave X: N cases | PASS C | FAIL C | ISSUES C | ERROR C | 总耗时 | 总成本
```

跨 wave 累积统计，最终出完整 report。

## 待推敲

1. Standard/Marathon 的分界线到底在哪？202（294s）算 Standard 上沿还是 Marathon 下沿？
2. Re-run 之前 FAIL/ERROR 的 case（202, 224）放在哪波？
3. `health=ISSUES` 的处理策略：修 case 还是记 known issue？
4. Wave D 要不要跟 Waves A–C 拆成两次独立 session？
5. 要不要在跑之前先把所有 `verdict_mode: all` 的 case 扫一遍，预判哪些需要改 `last`？
