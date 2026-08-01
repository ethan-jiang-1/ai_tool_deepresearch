# Light Tier Complete Results — 2026-08-01

> 39/39 light cases 全部跑完（3 waves），以下为去重后的最终数据。

## 总汇总

| 结果 | 数量 | 占比 |
|------|------|------|
| ✅ PASS CLEAN | 15 | 38% |
| ⚠️ PASS ISSUES | 16 | 41% |
| ❌ FAIL | 5 | 13% |
| 💥 ERROR | 3 | 8% |

**PASS 率 79%（31/39），但 CLEAN 率只有 38%。**

## 按速度分类（去重后）

### ⚡ Sprint（30–70s）：14 cases

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 305 | wfn-rerun | 27s | $0.18 | PASS CLEAN |
| 407 | engine-boundary | 31s | $0.20 | PASS CLEAN |
| 74 | system-logging | 31s | $0.22 | PASS CLEAN |
| 11 | gate-fork | 38s | $0.26 | PASS CLEAN |
| 304 | wfn-rerun | 40s | $0.20 | PASS CLEAN |
| 75 | system-logging | 40s | $0.23 | PASS CLEAN |
| 309 | reentry-debuggability | 41s | $0.24 | PASS ISSUES |
| 301 | wfn-rerun | 45s | $0.17 | PASS CLEAN |
| 41 | agentic-queue | 46s | $0.29 | PASS CLEAN |
| 21 | gate-loop | 47s | $0.26 | PASS CLEAN |
| 303 | wfn-rerun | 50s | $0.25 | PASS CLEAN |
| 314 | reentry-debuggability | 51s | $0.27 | PASS ISSUES |
| 313 | reentry-debuggability | 55s | $0.29 | PASS ISSUES |
| 31 | workflow-chain | 57s | $0.31 | PASS CLEAN |

### 😐 Standard（60–300s）：18 cases

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 402 | engine-boundary | 58s | $0.30 | PASS ISSUES |
| 308 | reentry-debuggability | 58s | $0.31 | PASS ISSUES |
| 302 | wfn-rerun | 59s | $0.26 | **FAIL** |
| 311 | file-observability | 62s | $0.30 | PASS ISSUES |
| 312 | file-observability | 62s | $0.33 | PASS ISSUES |
| 214 | wfn-wave0 | 70s | $0.34 | PASS ISSUES |
| 161 | evidence-extraction | 74s | $0.42 | PASS ISSUES |
| 403 | engine-boundary | 84s | $0.56 | **FAIL** |
| 405 | engine-boundary | 87s | $0.34 | PASS ISSUES |
| 606 | autonomous-research | 88s | $0.40 | **FAIL** |
| 71 | system-logging | 100s | $0.49 | PASS ISSUES |
| 307 | reentry-debuggability | 101s | $0.31 | PASS ISSUES |
| 106 | wff-pre-research | 143s | $0.61 | PASS CLEAN |
| 315 | reentry-debuggability | 147s | $0.58 | **FAIL** |
| 73 | system-logging | 212s | $0.93 | PASS ISSUES |
| 317 | reentry-debuggability | 213s | $1.11 | PASS ISSUES |
| 401 | engine-boundary | 257s | $1.76 | PASS ISSUES |
| 202 | wfn-seedtopic | 294s | $1.97 | **FAIL** |

### 🐢 Marathon（400–600s）：2 cases

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 203 | wfn-seedtopic | 424s | $2.61 | PASS CLEAN |
| 213 | wfn-wave0 | 538s | $3.40 | PASS ISSUES |

### 💥 Timeout/Budget：5 cases

| Case | 实验 | 耗时 | 成本 | 原因 |
|------|------|------|------|------|
| 224 | wfn-wave1 | 601s | $4.69 | supervisor timeout |
| 235 | wfn-wave2 | 4795s | $3.70 | claude timeout |
| 310 | file-observability | 771s | $5.04 | budget exhausted ($5 cap) |
| 181 | wff-topic-rewrite | 278s | $1.56 | (v2 PASS CLEAN) |
| 182 | wff-topic-rewrite | 275s | $1.48 | (v2 PASS CLEAN) |

## FAIL 清单（5 cases）

| Case | 原因 | 修复 |
|------|------|------|
| 202 | `verdict_mode:all` + retry 中间 failed check | 已改 `last` |
| 302 | `case-302-rerun-mechanism` gate 没过 | **待查** |
| 315 | canonical topic state recovery | **待查** |
| 403 | work-unit-authority | **待查** |
| 606 | continuation-cues | **待查** |

## ISSUES 清单（16 cases）

health=ISSUES 高度集中在两个实验组：
- **reentry-debuggability（7/7）**：307, 308, 309, 313, 314, 315, 317 全部 ISSUES
- **engine-boundary（3/5）**：401, 402, 405（403 FAIL）
- **file-observability（2/3）**：311, 312（310 ERROR）
- **其他（4）**：71, 73, 161, 213, 214

## 成本汇总

| 速度档 | Case 数 | 总成本 | 均成本 |
|--------|---------|--------|--------|
| Sprint | 14 | $3.72 | $0.27 |
| Standard | 18 | $10.56 | $0.59 |
| Marathon | 2 | $6.01 | $3.01 |
| Timeout/Error | 5 | $13.41 | $2.68 |
| **合计** | **39** | **$33.70** | **$0.86** |
