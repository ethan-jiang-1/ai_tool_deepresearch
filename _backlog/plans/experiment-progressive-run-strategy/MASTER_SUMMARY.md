# Master Summary — All 101 Cases Complete

> 2026-08-01/02 | Light + Standard + Heavy 全部跑完

## 总体

| Tier | Cases | PASS CLEAN | PASS ISSUES | FAIL | ERROR | NOT_RUN |
|------|-------|------------|-------------|------|-------|---------|
| Light | 39 | 15 (38%) | 16 (41%) | 5 (13%) | 3 (8%) | 0 |
| Standard | 37 | 9 (24%) | 17 (46%) | 5 (14%) | 6 (16%) | 0 |
| Heavy Det | 5 | 0 | 4 (80%) | 1 (20%) | 0 | 0 |
| Heavy Agent | 20 | 2 (10%) | 7 (35%) | 4 (20%) | 4 (20%) | 3 (15%) |
| **Total** | **101** | **26 (26%)** | **44 (44%)** | **15 (15%)** | **13 (13%)** | **3 (3%)** |

**全局 PASS 率 69%（70/101），CLEAN 率 26%。**

## 按新速度档位

| 档位 | 耗时范围 | 大约 case 数 | 主要实验组 |
|------|----------|-------------|-----------|
| ⚡ Sprint | 27–70s | ~30 | gate-fork/loop, workflow-chain, agentic-queue, system-logging heartbeat/hot-path, wfn-rerun basic, engine-boundary simple |
| 😐 Standard | 80–300s | ~40 | wff-pre-research, wff-delivery, reentry-debuggability, file-observability, system-logging envelope/startup |
| 🐢 Marathon | 300–900s | ~20 | wff-validation, wfn-wave0/1/2 gate-fail, wff-wave-gates, autonomous-research-hardening |
| 💀 Extreme | 900–2400s | ~10 | wff-wave-chain, evidence-extraction real-agent, iterative-interaction |

## 成本

| Tier | 总成本 | 均成本 |
|------|--------|--------|
| Light (39) | $33.70 | $0.86 |
| Standard (37) | $55.72 | $1.51 |
| Heavy (25) | $56.03 | $2.24 |
| **Total (101)** | **$145.45** | **$1.44** |

## 关键发现

1. **历史 light/standard/heavy 标签跟实际耗时基本无关。** light 里有 27s 的也有 601s 的。
2. **ISSUES 率随复杂度急剧上升：** light 41% → standard 46% → heavy agent 35%（但整体质量下降，FAIL/ERROR 增多）。
3. **`verdict_mode: all` 导致误报：** Agent retry 时中间 `passed: false` check 被计入，应改 `last`。case-202 已确认。
4. **预算不足：** $5 不够 Standard+ 级（78, 153, 310 都超了），$6 也不够。Marathon+ 需要 $8–15。
5. **Timeout 不足：** 600s 对 Marathon 不够，900s 对 Extreme 不够。wave-chain 和 iterative-interaction 需要 20–30min。
6. **Subject Agent 可用性：** 3 个 NOT_RUN（115, 714, 951）都是符合预期的——Subject Agent 不可用或 AI-judge 无配对 human case。
7. **reentry-debuggability 全组 ISSUES：** 7/7 light + 多个 standard reentry case 都是 ISSUES，可能是 health profile 配置问题。

## 需要修复的 FAIL cases（15 个）

| Case | Tier | 推测 |
|------|------|------|
| 202 | light | verdict_mode: all → 已改 last |
| 302 | light | rerun-mechanism gate 真失败 |
| 315 | light | status-trace-profile-unchanged |
| 403 | light | work-unit-authority |
| 606 | light | stop-no 行为变更 |
| 33 | standard | error-paths |
| 101 | standard | pre-research-happy |
| 124 | standard | seed-topics-boundary |
| 133 | standard | hitl2-rerun |
| 201 | standard | seedtopics-queue-loop |
| 212 | heavy-det | gate-fail-repair |
| 211 | heavy-agent | wave0-happy-path |
| 223 | heavy-agent | subagent-failure |
| 234 | heavy-agent | subagent-search |

## 数据文件

- `results-light-complete.md` — 39 light cases 完整数据
- `results-standard-complete.md` — 37 standard cases 完整数据
- `results-heavy-complete.md` — 25 heavy cases 完整数据
- `reports/` — 45 个 case 的 minimal report JSON
- `issues.md` — 已知问题记录
