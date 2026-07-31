# Evidence C — 语义对象卡的 10 个维度：已声明 / 未表示 / 未 enforce

> 来源：Explore agent 对 specs/guideline/registry 的只读勘察（已核实）。
> 用于回答：“一张能挡住 bug 类的对象卡需要哪些维度？哪些已经被表示？”

## 维度表

| # | 维度 | 抓哪类 bug | 在 repo 的状态 |
|---|---|---|---|
| 1 | 对象 identity/kind（state/projection/status/concept/field-group/Module/view） | 一切的地基 | **已声明**：`config.yaml:173,230-235` 枚举需反思的 kind；GCO-007（`spec.md:85`）。仅 stated |
| 2 | 有界问题 + 预期读者（问题） | “多个问题塞进一个名词” | **已声明为 requirement**：guideline `:82,92-96`；GCO-007 `:87`；`config.yaml:173`。仅 stated |
| 3 | 必须保留的区别（区别） | “不同 artifact 被一 grammar 读” | **已声明**：guideline `:83,98-102`；GCO-007 `:88`；GCO-005 不可互换 `:57-63`。仅 stated |
| 4 | authority class / 不可互换 | “不同概念被混同” | **已声明**：GCO-005（`req-registry.yaml:318`；`spec.md:57-63`）。仅 stated |
| 5 | 停止点 + 诚实 unknown/unresolved | 过度声称 closure | **已声明**：guideline `:84,104-108`；GCO-007 `:89`；GCO-006 `:69-79`。仅 stated |
| 6 | closure 受 provenance/scope/proof-distance 约束 | 越界证据自动关掉更强 claim | **已声明**：GCO-006（`req-registry.yaml:319`；`spec.md:69-79`）。仅 stated |
| 7 | producing authority / Source of Record + net simplification | 竞争 writer | **已声明**：`config.yaml:172`；simple-reliable-control；如 `DEW-001`“ledger rows 是唯一 production delegated completion authority”。仅 stated |
| 8 | capability 边界正交（4 条件测试） | scope 混淆 / 错误归属 | **已声明**：`RET-003`（`req-registry.yaml:619`）；4 条件复现于 `config.yaml:230-235`。仅 stated |
| 9 | provenance / 时间边界（submission-bound vs live-bytes vs snapshot vs mtime） | **“不同时间事实被一 projection 处理”**（BUG-151：可变 `source.yaml` ordinal 被重赋给每个历史 work ID） | **部分、多数未表示**。GCO-006 只点到“provenance, actor/host, proof class”（`spec.md:71`）。**无** requirement 强制 change 为受触对象声明其事实的时间/证据边界。active change 的 Decision 1（`design.md:63-106`）只能用 prose 做——因为没人要求 |
| 10 | 枚举 consumer 列表 + 每 consumer reconciliation | **“同一 authority 被多 evaluator 处理”**（BUG-176：writer+reader 同判 reference；BUG-178：reentry vs Wave gate） | **完全未作为 per-change requirement 表示**。不变量**按 capability operationally 存在**（如 RRM“一个纯 projection-readiness evaluator … inspect 与 gate SHALL consume 同一 evaluator result”，`research-return-map/spec.md:264,349-353`；CTS“一个纯 canonical resolver”），但**无** requirement 强制 change 声明 consumer 集合并对账。**最大缺口** |

## 底线

- 维度 1–8 **早已是 stated requirement**（集中在 GCO-005/006/007 + `config.yaml` + guideline）。
- 维度 9–10——**最直接**指向 bug 类的两个——**基本未作为 declared discipline 表示**。
- **1–10 全部没有 machine-enforce。** 这就是全部问题。GCO-007（`spec.md:91`）明确说反思“SHALL be
  short connected reasoning, **not a required field schema … deterministic validator**”——**这正是**
  conflation 每次溜过去的原因。

## guideline 的卡片形式（要照搬的 form）

`guidelines/evolution-abstraction-semantic-precision.md:80-84`（`## Core Direction`）：

- `:82` **问题**：明确回答哪个有界问题，而非笼统“描述系统”。
- `:83` **区别**：保留会改变该问题答案的差异，只合并真正等价的情况。
- `:84` **停止点**：正常读者可在这一层得出结论或准确承认 unknown/unresolved，不必重建底层。

展开的“退后一步”子问在 `:92-108`。同一三段式作为 hard spec requirement 复现于 **GCO-007**
（`spec.md:85-91`），关键告诫在 `:91`。

## 插入点判定（若仍要做 Tier-B——已被 `03` 否决，此处仅记录）

- **首选**：扩 `verification-plan.yaml` 加 `semantic_objects[]`，由 `VerificationRoutingPlanSchema`
  Zod 校验（`contract.mjs:72-110`），用现有 closing-task gate channel（`config.yaml:197-204`）。
  cross-check：change 的每个 `> req:` ID 须出现在 ≥1 张卡；每卡须有 ≥1 consumer + reconciliation stance。
- **伴随**：`design.md` 里一个 `### Semantic Object Card` 的 fenced ```yaml 块，由同一 checker 读
  （`stripFencedCodeBlocks` `:42-74` 可反转来 extract）。

## GCO-007 张力（必须正面处理）

GCO-007（`spec.md:91`）**故意**禁止把反思做成 schema/validator。任何 Tier-B 机制需要 accepted change
**区分**“自由推理（留在 design.md prose）”与“机器校验的 identity/reconciliation 事实（可解析卡）”。
干净分界（合 guideline 的“Precision Is Scoped”`:110-119`）：卡只校验 **对象 identity、consumer 枚举、
reconciliation 立场**，不校验研究相关性或语义质量——以此保住 GCO-007 的“no Engine semantic judgment”边界。

> **注**：`03` 的 S1/S5 进一步表明，即便做此分界，Tier-B 仍撞 GCO-007:91 意图 + 可 game + 与
> `req-registry.yaml` dual truth。故最终判定 **drop Tier-B 作为机器检查**。

## 可验证的真实样例

- `openspec/changes/make-canonical-topic-state-projections-coherent/{proposal.md:22-41, design.md:63-106,144-156}`
- `openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators/design.md:47-64`（现成 consumer-reconciliation 矩阵）
