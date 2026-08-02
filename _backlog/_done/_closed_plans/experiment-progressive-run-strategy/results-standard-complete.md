# Standard Tier Complete Results — 2026-08-01/02

> 37/37 standard cases 全部跑完（3 batches），以下为去重后的最终数据。

## 总汇总

| 结果 | 数量 | 占比 |
|------|------|------|
| ✅ PASS CLEAN | 9 | 24% |
| ⚠️ PASS ISSUES | 17 | 46% |
| ❌ FAIL | 5 | 14% |
| 💥 ERROR | 6 | 16% |

**PASS 率 70%（26/37），CLEAN 率 24%。**

## 按速度分类

### ⚡ Sprint（30–70s）：10 cases

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 603 | autonomous-research | 30s | $0.21 | PASS CLEAN |
| 102 | wff-pre-research | 36s | $0.26 | PASS ISSUES |
| 306 | wfn-rerun | 44s | $0.28 | PASS ISSUES |
| 601 | autonomous-research | 44s | $0.26 | PASS CLEAN |
| 53 | wff-validation | 48s | $0.33 | PASS ISSUES |
| 12 | gate-fork | 52s | $0.29 | PASS CLEAN |
| 23 | gate-loop | 58s | $0.30 | PASS CLEAN |
| 404 | engine-boundary | 61s | $0.34 | PASS ISSUES |
| 42 | agentic-queue | 66s | $0.32 | PASS CLEAN |
| 13 | gate-fork | 68s | $0.35 | PASS CLEAN |
| 22 | gate-loop | 68s | $0.34 | PASS CLEAN |

### 😐 Standard（80–250s）：13 cases

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 111 | wff-pre-research-repair | 83s | $0.45 | PASS ISSUES |
| 602 | autonomous-research | 86s | $0.56 | PASS CLEAN |
| 43 | agentic-queue | 89s | $0.14 | ERROR (agent_nonzero_1) |
| 133 | wff-delivery | 96s | $0.45 | FAIL ISSUES |
| 112 | wff-pre-research-repair | 112s | $0.73 | PASS ISSUES |
| 132 | wff-delivery | 114s | $0.77 | PASS ISSUES |
| 33 | workflow-chain | 120s | $0.51 | FAIL CLEAN |
| 32 | workflow-chain | 144s | $0.69 | PASS CLEAN |
| 103 | wff-pre-research | 160s | $1.07 | PASS ISSUES |
| 113 | wff-pre-research-repair | 170s | $1.34 | PASS ISSUES |
| 104 | wff-pre-research | 213s | $1.51 | PASS ISSUES |
| 105 | wff-pre-research | 220s | $1.61 | PASS ISSUES |
| 212 | wfn-wave0 | 245s | $1.27 | FAIL ISSUES |

### 🐢 Marathon（250–500s）：8 cases

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 131 | wff-delivery | 247s | $1.77 | PASS ISSUES |
| 101 | wff-pre-research | 279s | $2.69 | FAIL ISSUES |
| 123 | wff-wave-gates | 307s | $1.91 | PASS ISSUES |
| 134 | wff-delivery | 312s | $1.37 | PASS ISSUES |
| 124 | wff-wave-gates | 327s | $2.04 | FAIL ISSUES |
| 135 | wff-delivery | 342s | $2.23 | PASS ISSUES |
| 52 | wff-validation | 372s | $1.67 | PASS ISSUES |
| 51 | wff-validation | 470s | $2.52 | PASS ISSUES |

### 💥 Timeout/Budget：6 cases

| Case | 实验 | 耗时 | 成本 | 原因 |
|------|------|------|------|------|
| 201 | wfn-seedtopic | 556s | $4.51 | FAIL ISSUES |
| 78 | system-logging | 610s | $5.02 | ERROR (budget) |
| 153 | wff-wave-chain | 838s | $6.01 | ERROR (budget) |
| 162 | evidence-extraction | 901s | $5.33 | ERROR (timeout) |
| 152 | wff-wave-chain | 1122s | $0 | ERROR (timeout) |
| 151 | wff-wave-chain | 2405s | $1.27 | ERROR (timeout) |

## FAIL 清单（5 cases）

| Case | 原因 |
|------|------|
| 33 | error-paths — 待查 |
| 101 | pre-research-happy — 待查 |
| 124 | seed-topics-boundary — 待查 |
| 133 | hitl2-rerun — 待查 |
| 201 | seedtopics-queue-loop — 待查 |

## 成本汇总

| 速度档 | Case 数 | 总成本 | 均成本 |
|--------|---------|--------|--------|
| Sprint | 10 | $3.10 | $0.31 |
| Standard | 13 | $14.28 | $1.10 |
| Marathon | 8 | $16.20 | $2.03 |
| Timeout/Error | 6 | $22.14 | $3.69 |
| **合计** | **37** | **$55.72** | **$1.51** |
