## Why

本仓库已经是约 80% 的 coding-agent「Development Harness」（Charter、CONTEXT、Control Map、Capability Catalog、req-registry、governance checkers、verification-routing 四类 proof 均已就位），但用 DSH「borrowing-harness-idea」的三问框架（知识外置 / 正确路径 / 反馈延迟）自评，暴露一个**静态层残余缺口**：`openspec/README.md`（Control Map）与 `openspec/specs/README.md`（Capability Catalog）让 fresh agent 能便宜地找到「读什么」，但没有一张显式「新行为 → 落到哪一层/哪个机制 + 升级条件」的归属表（borrowing `03-paved-road-and-ladder.md` 的 L0–L3 参与阶梯），面对新行为 agent 仍要先猜代码位置。来源：`_backlog/plans/agent-legibility-harness-audit-and-hardening.md` 与 `/Users/bowhead/deepseek-harness/_faq_on_digested/07_borrowing-harness-idea/`。

> 注：计划里原有一个「入口链双副本漂移」缺口，apply 前复核发现它**不是缺口**——`agent/agent-context-routing`（ACR）已要求 root/Harness 的 `AGENTS.md`/`CLAUDE.md`「两份保留 tool-specific identity、正文 byte-identical」，且 `tests/integration/md/agent-behavior-file-pair-sync-guard.test.mjs` 已机器强制这份同步。故本 change **不触及入口文件**（borrowing 的 symlink 方案会违反 ACR 的 tool-identity accepted behavior，予以放弃）。

## What Changes

- 新增 guidance model 文档 `openspec/guidance/models/where-new-behavior-goes.md`：descriptive 参与阶梯（L0 配置 → L1 capability 契约 → L2 完整能力 seam → L3 core loop），映射到本仓库真实 seams，每层给出首选入口与升级条件。
- 在 `openspec/README.md`（Control Map）的 Route By Trigger 增加一行「改哪里」路由，指向该归属表。
- **不产出**：不改入口文件、不加 checker、不加新 test、不改 `DEEP_RESEARCH_HARNESS/` 运行时/schema/CLI、不加依赖、不新增 capability 的 observable behavior（纯 guidance 导航面收敛）。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `governance/guidance-constitution`：强化 GCO-008 的 demand-driven control-map 契约——Control Map 除了路由「读什么」，还要路由「改哪里」（change-placement），指向一张 descriptive 参与阶梯。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `governance/guidance-constitution` | `openspec/specs/governance/guidance-constitution/spec.md`（GCO-008「Current evolution directions route relevant design through ordered reviews」：`openspec/README.md` SHALL be a demand-driven control map）；`openspec/README.md` | Modify | GCO-008 已拥有 control-map 路由契约；本 change 为其补上 change-placement 路由，不新建 capability。 |
| `agent/agent-context-routing` | `openspec/specs/agent/agent-context-routing/spec.md`（ACR 要求 root/Harness 入口文件两份保留 tool identity、正文 byte-identical，guard test 强制）；`tests/integration/md/agent-behavior-file-pair-sync-guard.test.mjs` | Verify-only | 入口文件的 pair 同步已由 ACR + 既有 guard test 覆盖，本 change 不触及入口文件。 |

## Impact

- 目标 surface：`openspec/guidance/models/where-new-behavior-goes.md`（新增）、`openspec/README.md`（Control Map 加一行）。
- 无 runtime code、schema、CLI 行为、依赖、外部 API、runtime bundle、test 变化。
- 不改 `.agents/skills/**`、`.claude/skills/**`、`.codex/skills/**`。

## Direct Source of Record 与 net simplification

- 唯一事实源：归属表文档自身是「改哪里」的导航 owner；其 normative effect 归 applicable accepted spec / executable contract（不另建 authority）。
- 最短合法闭环：归属表内的路径引用由既有 `check-guidance-pointer-targets.mjs` 扫描，链接漂移当场 exit non-zero。
- net simplification：新增一张导航表 + 一行路由，消除「改哪里靠猜代码位置」的判断成本；不新增任何运行时控制面。

## Semantic-precision reflection（新增 reader-facing view：Where new behavior goes 归属表）

- **读者/有界问题**：一个拿到「新增行为」需求的 coding agent，问「这个改动应该落在哪一层、什么机制，升级条件是什么」。
- **必须保留的区别**：L0 配置 / L1 capability 契约 / L2 完整能力 seam / L3 core loop 四层各自的首选入口与升级条件；「本可用低层表达却升到高层」是被拦的对象。
- **正常推理停止点**：从归属表得到「首选入口 + 升级条件」后停止，细节交给对应 capability spec / cookbook；归属表是 descriptive 导航，不给出行为权威。

## 责任边界

- **User decision**：无新增 permission/risk 决策；本 change 是 guidance 导航面收敛。
- **Agent execution**：写归属表文档、在 Control Map 加路由行（ordinary authorized mechanical work）。
- **Engine verdict**：无新增 checker；归属表链接由既有 `check-guidance-pointer-targets.mjs` 覆盖，归属表「写得好不好」「语义对不对」仍归 review。
