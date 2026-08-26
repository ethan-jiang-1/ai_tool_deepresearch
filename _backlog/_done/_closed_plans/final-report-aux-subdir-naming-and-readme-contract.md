# Plan: Final 主报告 ↔ 辅助子目录命名关系 + final/README 引导契约

**性质:** 第一性原则 + 能力立项计划（pre-OpenSpec，设计验证待开始）
**状态:** completed（2026-08-27；实现、验证和 OpenSpec 归档均已完成，change `final-auxiliary-directory-contract` 已归档，commit `a11f48f4b`）
**触发:** 对 `chinese-ai-inference-chips-vs-nvidia` run bundle 做 V3（`final/final_v2.md`）交付时，反复暴露一个**缺失的可复用命名/结构契约**：主报告 `final/final_vN.md` 与其配套的辅助详细档案（子目录）之间应该是什么命名关系？`final/` 下的 `README.md` 如何引导后续版本遵循该约定？每次交付都要靠人工操心，说明这个约定还没有被固化成 Engine/契约能强制执行、或至少被文档权威覆盖的规则。

**前置参照:** 已归档 plan/change `iterative-final-delivery-versioned-output`（`iterate-final-delivery-in-place`，commit `860f65234`）**只定了“主报告”的版本化命名**（`§7.2`：首版 `final/final.md`，修订 `final/final_v1.md`、`final_<feature>_v<N>.md`，canonical inventory 分配版本）。它**没有定义**：
- “辅助详细档案”放在哪个目录、与主报告文件名的对应关系（本 run bundle 实践中是 `final/final_v1/`、`final/final_v2/`——目录名 = 主报告文件名去 `.md`）；
- `final/README.md` 的存在与它作为“命名/独立性约定的唯一文档权威”的角色；
- 每个版本“完全自包含、不依赖其他版本”（历史只读、新信息只进新版本目录）的强制语义。

**本 plan 的目标:** 补齐上述缺口，把实践中已采用的约定（`final_vN.md` + `final/final_vN/` 同名辅助目录 + `final/README.md` 引导 + 版本独立自包含）固化为**可复用、可校验**的契约，让后续每个版本交付时 Agent 不用再每次操心。

---

## 0. 现状 vs 期望

| 现状 | 缺口 | 期望 |
|------|------|------|
| 实践中用 `final/final_vN/` 存放该版本配套档案，但无契约强制 | 命名关系靠口头/人工约定，每次交付要重新操心 | 固化规则：**版本 N = `final/final_vN.md`（主报告）+ `final/final_vN/`（同名辅助目录）**，目录名 = 主报告文件名去 `.md` |
| `final/chips/` 曾被误当“V1 辅助目录”，后又改名 `final/final_v1/` | 辅助目录没有“跟版本名走”的强制命名，易产生 `chips/`、`supplement/` 这类与版本脱钩的命名 | 每个版本辅助目录必须 `final/final_vN/`，不存在与版本无关的辅助目录 |
| 每个版本应“完全自包含、不依赖其他版本” | 曾出现主报告引用 `final/chips/`（V1 目录）、子目录引用其他版本的情况 | 强制**版本独立**：主报告只引用自身 `final/final_vN/`，新版本只写自身文件，历史（更小 N）全部只读 |
| 需要一个文档引导后续版本如何命名主 MD 与辅助子目录 | 无权威，靠人记 | `final/README.md` 作为命名/独立性约定的**唯一文档权威**，随版本演进更新 |

**为什么必须固化成契约（第一性）：** `final/` 是跨多轮交付的累积区。没有明确的“主报告↔辅助目录”命名与“版本独立”规则，每个版本要么误覆盖旧版本内容、要么产生与版本脱钩的目录、要么主报告引用到错误版本的档案——每次都靠 Agent 现场判断，正是本次反复“操心”的根源。把约定做成 Engine 可校验（或至少文档权威覆盖）的契约，交付才能稳定、可追溯、可回滚。

## 1. 设计原则（候选写入 guidelines）

1. **一个交付版本 = 主报告 + 同名辅助目录。** 版本 N 的主报告是 `final/final_vN.md`，配套详细档案统一放 `final/final_vN/`（目录名 = 主报告文件名去 `.md`）。这是唯一合法的“版本 + 其辅助材料”命名对。
2. **不存在与版本解耦的辅助目录。** 旧 `final/chips/` 是历史遗留，按本约定应归入 `final/final_v1/`（本 bundle 已如此改名）；后续不允许再出现 `chips/`、`supplement/` 等脱离版本号的辅助目录。
3. **版本完全独立、自包含。** 阅读/交付版本 N 只需 `final/final_vN.md` + `final/final_vN/` + 公共证据底座（`reference/`、`artifacts/`）；不依赖、不引用任何其他版本的辅助目录；新版本不覆盖、不改写旧版本。
4. **历史只读。** 已提交版本（含其辅助目录）不可变；对旧结论的修订作为新版本内容进入新版本，不在旧文件上改动。
5. **`final/README.md` 是命名/独立性约定的唯一文档权威。** 它汇总上述规则与版本发布记录，每发布新版本同步更新；后续 Agent 遵循它行事，Engine 可据此校验（见 §3 开放问题）。

## 2. 建议的契约面（OpenSpec change 候选）

按“先命名契约、再校验/文档”顺序，建议 1 个 change（可拆 2 个 slice，视 scope）：

- **Change 1 — 主报告 ↔ 辅助目录命名关系契约 + 版本独立性**:在 Final delivery 契约里显式定义：辅助目录 `final/final_vN/` 与主报告 `final/final_vN.md` 的同名对应；版本自包含（主报告只引用自身目录）；历史版本的辅助目录只读；旧 `final/chips/` 之类的历史遗留目录归入对应版本（`final_v1/`）或显式废弃。可选的 Engine 校验：Final backing admission 或 inventory 层拒绝“主报告引用其他版本辅助目录”的链接。
- **Change 2 — `final/README.md` 权威化**:把 `final/README.md` 定为命名/独立性约定的唯一文档权威，明确其内容模板（结构示例、命名规则、版本发布记录、独立性原则、给后续 Agent 的提醒）与更新时机（每发布新版本一次）。

**明确排除/不做的:**
- 不改主报告版本号的分配机制（仍由 Engine `publish-final-report` / canonical inventory 分配，见既有 change）。
- 不把“辅助目录内容该写什么”做成强制 schema（内容是 Agent/用户语义，Engine 只校验结构与追溯）。
- 不为旧版本写回补丁（历史只读）。

## 3. 开放问题 / 实现陷阱（接手 Agent 必读）

1. **Engine 应否强制“主报告只引用自身辅助目录”？** 现状 `final-delivery-backing.mjs` 只校验 backing 链接是 safe bundle 路径 + submitted 输出，不校验“是否属于本版本目录”。若要强制版本独立，需在 backing 或 inventory 层加规则：主报告 `final/final_vN.md` 的链接目标若指向 `final/final_vM/`（M≠N）则拒绝。需评估这是否过度约束（有时跨版本引用 reference 是合理的，但跨版本引用辅助目录应被拒）。
2. **辅助目录纳入 canonical Final inventory 的方式。** 实测 `final/final_v2/` 已被 `readFinalReportSeries` 识别为 ”directory | supplementary”（见 run bundle）。需确认这个识别是否稳定、是否需要在解析器里显式声明“版本 N 的辅助目录与主报告文件同名”的关联，以便校验『每个 revision 主报告都有一个同名辅助目录』。
3. **既有 `iterative-final-delivery-versioned-output` 的兼容。** 该 change 已归档、`final/final*.md` 命名已定案。本 plan 只**新增**“辅助目录 + README”两个面，不应推翻已定案的主报告命名。合并文档或明确本 plan 是它的后继扩展。
4. **README / 辅助档案也是 Final Markdown，feedback 边界。** 实测 `final/` 下所有 `.md`（含 README、辅助档案）都强制走 `persist-final-report`（Evidence Map admission），generic `persist` 会被拒（`final_markdown_requires_admission`）。本 plan 对 README/辅助目录的更新同样走该路径——任何改 `final/` 内容的操作都需带 Evidence Map，这是既有约束，不是本 plan 新增。

## 4. 验收（期望行为）

- 一个版本 N 交付后：`final/` 下存在 `final/final_vN.md` 与其同名辅助目录 `final/final_vN/`（内容各自带 Evidence Map）。
- `final/final_vN.md` 主报告内对辅助档案的引用指向 `final/final_vN/`，不指向其他版本目录。
- 历史版本（更小 N）的主报告与辅助目录字节不变。
- `final/README.md` 存在并准确描述命名/独立性约定，随新版本更新。
- 不存在脱离版本号的辅助目录名（如 `chips/`、`supplement/`）。

## 5. 给接手 Agent 的操作指引

1. 复现本次痛点：阅读当前 run bundle `final/` 结构（`final_v1.md` + `final/final_v1/`、`final_v2.md` + `final/final_v2/`、`README.md`），以及本 turn 中「`chips` → `final_v1` 改名、主报告引用更改为指向自身目录」的过程。
2. 读既有归档 change `iterative-final-delivery-versioned-output` 的 §7（命名定案），确认本 plan 是它的后继扩展而非推翻。
3. 走 OpenSpec propose：按 §2 建 change（先命名关系 + 独立性，若有则 README 权威化）。
4. 权衡 §3.1 的 Engine 强制力度：是否在 backing/inventory 层拒绝“主报告引用其他版本辅助目录”。
5. 补验收测试：覆盖「主报告↔同名辅助目录关联」「版本独立性（不引用他版目录）」「README 权威化」「历史只读」。

**约束提醒:** Node.js >=20 纯 ESM `.mjs`、无 Python、无新增依赖（仅 zod/yaml）、测试在 `tests/`（repo root）、`DEEP_RESEARCH_HARNESS/` 在 `/opsx:apply` 前只读。本 plan 是 run-scoped 实践的沉淀，可作为跨 run bundle 的框架级契约，但需经 OpenSpec governance 落地。
