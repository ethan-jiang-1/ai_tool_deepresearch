# Heavy Tier Complete Results — 2026-08-02

> 25/25 heavy cases 全部跑完。

## 总汇总

| 结果 | 数量 | 占比 |
|------|------|------|
| ✅ PASS CLEAN | 2 | 8% |
| ⚠️ PASS ISSUES | 11 | 44% |
| ❌ FAIL | 5 | 20% |
| 💥 ERROR | 4 | 16% |
| 🔵 NOT_RUN | 3 | 12% |

**PASS 率 52%（13/25），CLEAN 率只有 8%。**

## Heavy Deterministic（5 cases）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 114 | wff-pre-research-repair | 316s | $1.95 | PASS ISSUES |
| 212 | wfn-wave0 | 245s | $1.27 | FAIL ISSUES |
| 222 | wfn-wave1 | 742s | $5.55 | PASS ISSUES |
| 231 | wfn-wave2 | 498s | $3.86 | PASS ISSUES |
| 233 | wfn-wave2 | 413s | $3.13 | PASS ISSUES |

## Heavy Agent-Behavior（20 cases）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 115 | wff-pre-research-repair | 190s | $0.35 | NOT_RUN |
| 163 | evidence-extraction | 1582s | $13.71 | ERROR (completion_invalid) |
| 164 | evidence-extraction | 721s | $0.86 | PASS CLEAN |
| 204 | wfn-seedtopic | 131s | $0.41 | PASS ISSUES |
| 211 | wfn-wave0 | 453s | $2.29 | FAIL ISSUES |
| 221 | wfn-wave1 | 525s | $4.47 | PASS ISSUES |
| 223 | wfn-wave1 | 365s | $1.98 | FAIL ISSUES |
| 225 | wfn-wave1 | 91s | $0.48 | ERROR |
| 232 | wfn-wave2 | 1472s | $0.28 | ERROR |
| 234 | wfn-wave2 | 688s | $5.23 | FAIL ISSUES |
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

## FAIL 清单

| Case | 可能原因 |
|------|----------|
| 212 | wfn-wave0 gate-fail-repair — 待查 |
| 211 | wfn-wave0 happy-path — 待查 |
| 223 | wfn-wave1 subagent-failure — 待查 |
| 234 | wfn-wave2 subagent-search — 待查 |

## ERROR 清单

| Case | 原因 |
|------|------|
| 163 | native_completion_invalid（completion 文件未生成） |
| 225 | agent_nonzero — 待查 |
| 232 | agent_timeout? 1472s — 待查 |
| 712 | agent_nonzero — 待查 |
| 713 | agent_timeout 966s |
| 715 | agent_nonzero 80s（infrastructure 不支持） |

## NOT_RUN 清单

| Case | 原因 |
|------|------|
| 115 | Subject Agent 不可用（符合预期） |
| 714 | Subject Agent 不可用（符合预期） |
| 951 | AI-judge 无配对 human case（符合预期） |
