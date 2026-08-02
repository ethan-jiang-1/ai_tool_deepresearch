# Experiment Run Results — 2026-08-01

> 试跑 39 light cases，实际完成 23 个（16 个未跑）。

## 汇总

| 结果 | 数量 | Cases |
|------|------|-------|
| ✅ PASS CLEAN | 14 | 11, 21, 31, 41, 74, 75, 106, 181, 182, 203, 301, 303, 304, 305 |
| ⚠️ PASS ISSUES | 5 | 71, 73, 161, 213, 214 |
| ❌ FAIL | 2 | 202, 302 |
| 💥 ERROR (timeout) | 2 | 224, 235 |

## 按速度分类

### ⚡ Sprint（30–70s，13 cases）

| Case | 实验 | 耗时 | 成本 | 健康 | 结果 |
|------|------|------|------|------|------|
| 305 | wfn-rerun | 27s | $0.18 | CLEAN | PASS |
| 74 | system-logging | 31s | $0.22 | CLEAN | PASS |
| 11 | gate-fork | 38s | $0.26 | CLEAN | PASS |
| 304 | wfn-rerun | 40s | $0.20 | CLEAN | PASS |
| 75 | system-logging | 40s | $0.23 | CLEAN | PASS |
| 301 | wfn-rerun | 45s | $0.17 | CLEAN | PASS |
| 41 | agentic-queue | 46s | $0.29 | CLEAN | PASS |
| 21 | gate-loop | 47s | $0.26 | CLEAN | PASS |
| 303 | wfn-rerun | 50s | $0.25 | CLEAN | PASS |
| 31 | workflow-chain | 57s | $0.31 | CLEAN | PASS |
| 302 | wfn-rerun | 59s | $0.26 | CLEAN | **FAIL** |
| 214 | wfn-wave0 | 70s | $0.34 | ISSUES | PASS |
| 161 | evidence-extraction | 74s | $0.42 | ISSUES | PASS |

### 😐 Standard（100–300s，6 cases）

| Case | 实验 | 耗时 | 成本 | 健康 | 结果 |
|------|------|------|------|------|------|
| 71 | system-logging | 100s | $0.49 | ISSUES | PASS |
| 106 | wff-pre-research | 143s | $0.61 | CLEAN | PASS |
| 73 | system-logging | 212s | $0.93 | ISSUES | PASS |
| 182 | wff-topic-rewrite | 275s | $1.48 | CLEAN | PASS |
| 181 | wff-topic-rewrite | 278s | $1.56 | CLEAN | PASS |
| 202 | wfn-seedtopic | 294s | $1.97 | CLEAN | **FAIL** |

### 🐢 Marathon（400–600s，2 cases）

| Case | 实验 | 耗时 | 成本 | 健康 | 结果 |
|------|------|------|------|------|------|
| 203 | wfn-seedtopic | 424s | $2.61 | CLEAN | PASS |
| 213 | wfn-wave0 | 538s | $3.40 | ISSUES | PASS |

### 💥 Timeout（2 cases）

| Case | 实验 | 耗时 | 成本 | 原因 |
|------|------|------|------|------|
| 224 | wfn-wave1 | 601s | $4.69 | supervisor 600s timeout |
| 235 | wfn-wave2 | 4795s | $3.70 | claude 跑了 80min 后被 timeout |

## 未跑的 light cases（16 个）

v2 脚本在 case-307 被停止，以下未执行：

- case-307 ~ 309（reentry-debuggability，3 个）
- case-310 ~ 312（file-observability，3 个）
- case-313 ~ 315, 317（reentry-debuggability，4 个）
- case-401 ~ 407（engine-boundary，5 个，含 404 std）
- case-606（autonomous-research-hardening，1 个）

另有 2 个 v1 ERROR(budget) 在 v2 重跑成功：73, 181。

## FAIL 详情

### case-202（wfn-seedtopic transition）
- **原因**：`verdict_mode: all`，Claude retry gate step 时记录中间 `passed: false` check
- **trace**：7 个 playbook check，3 个 false（首次 attempt），4 个 true（retry 后）
- **修复**：已改为 `verdict_mode: last`

### case-302（wfn-rerun happy-path）
- **原因**：`verdict_mode: all`，`case-302-rerun-mechanism: false`
- **trace**：2 个 check，wave2-complete 过，rerun-mechanism 不过
- **待查**：是 `all→last` 问题还是 rerun mechanism 真坏了

## HEALTH=ISSUES 详情（5 个）

| Case | 实验 | 备注 |
|------|------|------|
| 71 | system-logging | unified-envelope |
| 73 | system-logging | startup-log-trail |
| 161 | evidence-extraction | complete-cache-trails |
| 213 | wfn-wave0 | happy-and-fail |
| 214 | wfn-wave0 | timeout-progress-lease |

health report 需要逐个查 bundle health check 输出。

## 成本汇总

| 速度档 | 单 case 成本范围 |
|--------|-----------------|
| Sprint | $0.17 – $0.42 |
| Standard | $0.49 – $1.97 |
| Marathon | $2.61 – $3.40 |
| Timeout | $3.70 – $4.69 |
