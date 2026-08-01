# Heavy Tier Results (in progress) — 2026-08-02

> 25 heavy cases。以下为已跑数据。

## Heavy Deterministic（5/5 ✅完成）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 114 | wff-pre-research-repair | 316s | $1.95 | PASS ISSUES |
| 212 | wfn-wave0 | 245s | $1.27 | FAIL ISSUES |
| 222 | wfn-wave1 | 742s | $5.55 | PASS ISSUES |
| 231 | wfn-wave2 | 498s | $3.86 | PASS ISSUES |
| 233 | wfn-wave2 | 413s | $3.13 | PASS ISSUES |

**小计**：4 PASS (ISSUES) + 1 FAIL (212)

## Heavy Agent-Behavior（7/19 完成）

| Case | 实验 | 耗时 | 成本 | 结果 |
|------|------|------|------|------|
| 115 | wff-pre-research-repair | 190s | $0.35 | NOT_RUN |
| 163 | evidence-extraction | 1582s | $13.71 | ERROR (completion_invalid) |
| 164 | evidence-extraction | 721s | $0.86 | PASS CLEAN |
| 211 | wfn-wave0 | 453s | $2.29 | FAIL ISSUES |
| 221 | wfn-wave1 | 525s | $4.47 | PASS ISSUES |
| 223 | wfn-wave1 | 365s | $1.98 | FAIL ISSUES |
| 225 | wfn-wave1 | 91s | $0.48 | ERROR (fast fail) |
| 232 | wfn-wave2 | 1472s | $0.28 | ERROR (timeout?) |
| 234 | wfn-wave2 | 688s | $5.23 | FAIL ISSUES |
| 318 | wfn-rerun | 827s | $5.67 | PASS ISSUES |
| 204 | wfn-seedtopic | 131s | $0.41 | PASS ISSUES |
| 406 | engine-boundary | running... | | |

## 待跑（8 cases）

604, 605, 711, 712, 713, 714, 715, 951
