# Speed Index — 101 Cases by Actual Runtime

> 2026-08-02 最终版。所有 case 按实测耗时重新分档，替代历史 light/standard/heavy。

## ⚡ Sprint：≤70s（~30 cases）

单 gate 或无 gate，fixture 简单或无，bash 步骤少。

| Case | Tier | 耗时 | 实验 |
|------|------|------|------|
| 305 | light | 27s | wfn-rerun |
| 603 | standard | 30s | autonomous-research |
| 74 | light | 31s | system-logging |
| 407 | light | 31s | engine-boundary |
| 102 | standard | 36s | wff-pre-research |
| 11 | light | 38s | gate-fork |
| 304 | light | 40s | wfn-rerun |
| 75 | light | 40s | system-logging |
| 309 | light | 41s | reentry-debuggability |
| 301 | light | 45s | wfn-rerun |
| 306 | standard | 44s | wfn-rerun |
| 601 | standard | 44s | autonomous-research |
| 41 | light | 46s | agentic-queue |
| 21 | light | 47s | gate-loop |
| 53 | standard | 48s | wff-validation |
| 303 | light | 50s | wfn-rerun |
| 314 | light | 51s | reentry-debuggability |
| 12 | standard | 52s | gate-fork |
| 313 | light | 55s | reentry-debuggability |
| 31 | light | 57s | workflow-chain |
| 23 | standard | 58s | gate-loop |
| 308 | light | 58s | reentry-debuggability |
| 402 | standard | 58s | engine-boundary |
| 302 | light | 59s | wfn-rerun |
| 404 | standard | 61s | engine-boundary |
| 311 | light | 62s | file-observability |
| 312 | light | 62s | file-observability |
| 42 | standard | 66s | agentic-queue |
| 13 | standard | 68s | gate-fork |
| 22 | standard | 68s | gate-loop |
| 214 | light | 70s | wfn-wave0 |

## 😐 Standard：71–300s（~38 cases）

有 fixture 搭建，1-2 gate，中等 bash 复杂度。

| Case | Tier | 耗时 | 实验 |
|------|------|------|------|
| 161 | light | 74s | evidence-extraction |
| 111 | standard | 83s | wff-pre-research-repair |
| 403 | light | 84s | engine-boundary |
| 602 | standard | 86s | autonomous-research |
| 405 | light | 87s | engine-boundary |
| 606 | light | 88s | autonomous-research |
| 43 | standard | 89s | agentic-queue |
| 133 | standard | 96s | wff-delivery |
| 71 | light | 100s | system-logging |
| 307 | light | 101s | reentry-debuggability |
| 112 | standard | 112s | wff-pre-research-repair |
| 132 | standard | 114s | wff-delivery |
| 33 | standard | 120s | workflow-chain |
| 204 | heavy | 131s | wfn-seedtopic |
| 32 | standard | 144s | workflow-chain |
| 106 | light | 143s | wff-pre-research |
| 315 | light | 147s | reentry-debuggability |
| 103 | standard | 160s | wff-pre-research |
| 113 | standard | 170s | wff-pre-research-repair |
| 711 | heavy | 185s | iterative-interaction |
| 115 | heavy | 190s | wff-pre-research-repair |
| 317 | light | 213s | reentry-debuggability |
| 104 | standard | 213s | wff-pre-research |
| 73 | light | 212s | system-logging |
| 105 | standard | 220s | wff-pre-research |
| 212 | heavy | 245s | wfn-wave0 |
| 131 | standard | 247s | wff-delivery |
| 406 | heavy | 255s | engine-boundary |
| 401 | light | 257s | engine-boundary |
| 101 | standard | 279s | wff-pre-research |
| 181 | light | 278s | wff-topic-rewrite |
| 182 | light | 275s | wff-topic-rewrite |
| 202 | light | 294s | wfn-seedtopic |

## 🐢 Marathon：300–600s（~20 cases）

多步 workflow，3+ gate，大量状态迁移。

| Case | Tier | 耗时 | 实验 |
|------|------|------|------|
| 123 | standard | 307s | wff-wave-gates |
| 134 | standard | 312s | wff-delivery |
| 114 | heavy | 316s | wff-pre-research-repair |
| 124 | standard | 327s | wff-wave-gates |
| 135 | standard | 342s | wff-delivery |
| 223 | heavy | 365s | wfn-wave1 |
| 52 | standard | 372s | wff-validation |
| 386 | — | 386s | (605 heavy, autonomous-research) |
| 413 | — | 413s | (233 heavy, wfn-wave2) |
| 421 | — | 421s | (604 heavy, autonomous-research) |
| 424 | — | 424s | (203 light, wfn-seedtopic) |
| 453 | — | 453s | (211 heavy, wfn-wave0) |
| 470 | — | 470s | (51 standard, wff-validation) |
| 498 | — | 498s | (231 heavy, wfn-wave2) |
| 525 | — | 525s | (221 heavy, wfn-wave1) |
| 538 | — | 538s | (213 light, wfn-wave0) |
| 556 | — | 556s | (201 standard, wfn-seedtopic) |

## 💀 Extreme：600–2400s（~13 cases）

完整 workflow chain，需要 Subject Agent，或超长多步骤。

| Case | Tier | 耗时 | 实验 |
|------|------|------|------|
| 78 | standard | 610s | system-logging |
| 688 | — | 688s | (234 heavy, wfn-wave2) |
| 721 | — | 721s | (164 heavy, evidence-extraction) |
| 742 | — | 742s | (222 heavy, wfn-wave1) |
| 838 | — | 838s | (153 heavy* / standard, wff-wave-chain) |
| 827 | — | 827s | (318 heavy, wfn-rerun) |
| 901 | — | 901s | (162 standard, evidence-extraction) |
| 1122 | — | 1122s | (152 standard, wff-wave-chain) |
| 1472 | — | 1472s | (232 heavy, wfn-wave2) |
| 1582 | — | 1582s | (163 heavy, evidence-extraction) |
| 2405 | — | 2405s | (151 standard, wff-wave-chain) |
| 4795 | — | 4795s | (235 light, wfn-wave2) |
| — | — | — | (224 light, 601s wfn-wave1) |

## 速度分布

| 档位 | 数量 | 典型实验组 |
|------|------|-----------|
| ⚡ Sprint | ~30 | gate-fork/loop, workflow-chain, agentic-queue, wfn-rerun basic |
| 😐 Standard | ~38 | wff-pre-research, wff-delivery, reentry-debuggability, file-observability |
| 🐢 Marathon | ~20 | wff-validation, wfn-wave0/1/2 gate-fail, autonomous-research |
| 💀 Extreme | ~13 | wff-wave-chain, evidence-extraction real-agent, iterative-interaction |

## 建议的测试策略

1. **日常开发**：只跑 Sprint（~30 cases，~30min）
2. **PR 前**：Sprint + Standard（~68 cases，~90min）
3. **发版前**：全部（~101 cases，~3-4h，含预算等待）
