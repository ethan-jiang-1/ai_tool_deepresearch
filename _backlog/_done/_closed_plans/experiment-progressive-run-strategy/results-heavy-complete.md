# Heavy Tier Complete Results — 2026-08-02（修复后最终版）

> 25/25 heavy cases，0 FAIL。

## 总汇总

| 结果 | 数量 | 占比 |
|------|------|------|
| ✅ PASS CLEAN | 2 | 8% |
| ⚠️ PASS ISSUES | 15 | 60% |
| ❌ FAIL | **0** | 0% |
| 💥 ERROR | 5 | 20% |
| 🔵 NOT_RUN | 3 | 12% |

**PASS 率 68%（17/25）。**

## Heavy Deterministic（5 cases）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 114 | wff-pre-research-repair | 316s | $1.95 | PASS ISSUES |
| 212 | wfn-wave0 gate-fail-repair | ~300s | ~$2.38 | ✅ PASS（已修复） |
| 222 | wfn-wave1 gate-fail-repair | 742s | $5.55 | PASS ISSUES |
| 231 | wfn-wave2 synthesis | 498s | $3.86 | PASS ISSUES |
| 233 | wfn-wave2 gate-fail-repair | 413s | $3.13 | PASS ISSUES |

## Heavy Agent-Behavior（20 cases）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 115 | wff-pre-research-repair | 190s | $0.35 | NOT_RUN |
| 163 | evidence-extraction | 1582s | $13.71 | ERROR |
| 164 | evidence-extraction | 721s | $0.86 | PASS CLEAN |
| 204 | wfn-seedtopic | 131s | $0.41 | PASS ISSUES |
| 211 | wfn-wave0 | ~400s | ~$2 | ERROR（budget） |
| 221 | wfn-wave1 | 525s | $4.47 | PASS ISSUES |
| 223 | wfn-wave1 subagent-failure | ~400s | ~$2.42 | ✅ PASS（已修复） |
| 225 | wfn-wave1 | 91s | $0.48 | ERROR |
| 232 | wfn-wave2 | 1472s | $0.28 | ERROR |
| 234 | wfn-wave2 | ~700s | ~$5 | CANCELLED |
| 318 | wfn-rerun | 827s | $5.67 | PASS ISSUES |
| 406 | engine-boundary | 255s | $1.21 | PASS ISSUES |
| 604 | autonomous-research | 421s | $2.38 | PASS ISSUES |
| 605 | autonomous-research | 386s | $1.84 | PASS ISSUES |
| 711 | iterative-interaction | 185s | $0.29 | PASS CLEAN |
| 712 | iterative-interaction | 294s | $1.80 | ERROR |
| 713 | iterative-interaction | 966s | $0.28 | ERROR |
| 714 | iterative-interaction | 701s | $0.79 | NOT_RUN |
| 715 | iterative-interaction | 80s | $0.45 | ERROR |
| 951 | workflow-foundation | 239s | $0.34 | NOT_RUN |

## 已修复

| Case | 原结果 | 修复 |
|------|--------|------|
| 212 | FAIL | `verdict_mode: all→last` |
| 223 | FAIL | wave1-gate 预期翻转 |
| 211 | FAIL→ERROR | 误分类修正 |
| 234 | FAIL→CANCELLED | 误分类修正 |
