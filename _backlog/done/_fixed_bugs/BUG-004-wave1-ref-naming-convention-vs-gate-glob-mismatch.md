# Bug #4 — Wave1 reference 命名约定与 gate glob 不匹配（`0N-<slug>.md` 会 fail `per_topic_ref_md_count_floor`）

## 现象 / 上下文

在真实研究 run `dpt_rb_meal-timing-chrononutrition`（chrononutrition，profile=exploratory_map，5 topics）执行 **phase-wave1** 时发现：**按 phase 文档约定命名的 topic reference 文件会 fail `wave1-complete` gate 的 `per_topic_ref_md_count_floor` 规则。**

## 复现

1. phase-wave1.md（及其内部叙述、wave0→wave1 衔接、`reference/_INDEX.md` 占位说明）一致要求 wave1 把 topic 细粒度 reference "升格为 `0N-<slug>.md` topic 专属 reference"。
   - 例：为 t1 创建 `reference/01-meal-timing-blood-glucose-insulin.md`。
2. 运行：
   ```bash
   node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs \
     --bundle dpt_rb_meal-timing-chrononutrition --current-node phases/phase-wave1.md
   ```
3. `per_topic_ref_md_count_floor` **fail**，advice: "Topic meal-timing-blood-glucose-insulin has fewer than 1 reference/*meal-timing-blood-glucose-insulin-*.md rich MD file."

## 根因（已挖到代码层）

- gate 规则 `per_topic_ref_md_count_floor`：`check: count_floor`，`target: "reference/*{topic}-*.md"`，`threshold: 1`。
- `{topic}` 在 `check-gate-wave1-complete.mjs`（`getTopicKeys()`，约 L63–92）里被替换为 **slug**（`plan.topic_registry.map(t => t.slug)`），不是 topic id `t1`。
- `count_floor` 的 glob 模式（约 L224–245）把 `*` 编译成正则 `[^/]*`：
  ```js
  const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
  ```
  故 `reference/*meal-timing-blood-glucose-insulin-*.md` 编译为 `^[^/]*meal-timing-blood-glucose-insulin-[^/]*\.md$`。
- **关键**：该正则要求 slug 之后**紧跟一个字面量 `-`**。而约定名 `01-meal-timing-blood-glucose-insulin.md` 中 slug 之后是 `.md`（无 `-`）→ **不匹配** → 计数 0 → fail。
- 即：文档约定（`0N-<slug>.md`）与 gate glob（`*{slug}-*`）对文件名的形态要求**互斥**。

## 影响面

- 任何按 phase 文档命名 wave1 topic reference 的真实 run，都会在 `wave1-complete` gate 的该规则 fail，且 advice 误导（要求"创建 `*{slug}-*` 文件"，但文档教的是 `0N-<slug>.md`）。
- 用户指令"按文档走 → gate fail → 看 advice → 修"，此处 advice 与文档冲突，会让 Phase Agent 在两种命名间反复横跳。

## 临时绕过（本次 run 已采用）

命名为 `0N-<slug>-<qualifier>.md`，**同时**满足 `0N-` 排序约定与 gate glob：
- 例：`reference/01-meal-timing-blood-glucose-insulin-sutton-etrf.md`、`02-front-vs-back-calorie-loading-weight-jakubowicz-2013.md` 等 5 个。
- 验证：本次 run `wave1-complete` gate **PASSED**（passed:true，0 inspect/0 advice）。

## 建议修复（任选其一，二选一即可消除冲突）

1. **改 gate glob**（推荐，改动小且语义更宽松）：把 `per_topic_ref_md_count_floor` 的 `target` 从 `reference/*{topic}-*.md` 改为 `reference/*{topic}*.md`（去掉强制 slug 后连字符），即可同时接受 `0N-<slug>.md`、`0N-<slug>-<qualifier>.md`、`<slug>-...`。需同步检查 `gate-wave2-complete` / 其它 wave gate 是否有同形 glob。
2. **改文档约定**：把 phase-wave1.md（及衔接叙述、_INDEX 占位）统一改为 `0N-<slug>-<qualifier>.md` 或 `<slug>-<qualifier>.md`，并在 `shared-reference-template.md` 写明文件名须含 `{slug}-`。

## 相关文件（file:line）

- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json` — rule `per_topic_ref_md_count_floor`
- `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs:63-92`（`{topic}`=slug 替换）、`:224-245`（count_floor glob→regex）
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`（§3 / §4 约定 `0N-<slug>.md`）

## 严重度

P1（真实 run 会稳定复现 gate fail；不阻塞——可用 `0N-<slug>-<qualifier>.md` 命名绕过，本次已验证）。

## 状态

已修复（2026-06-26，OpenSpec change `establish-topic-slug-nn-prefix-convention`，与 bug #3 合并修复）

---

## Resolution

**修复内容** (与 bug #3 合并修复):
- Gate glob: `per_topic_ref_md_count_floor` 的 target 从 `reference/*{topic}-*.md` 改为 `reference/*{topic}*.md`（去掉强制 `-`），接受含 qualifier 和不含 qualifier 两种形态
- Reference 命名约定: `0N-<slug>.md` → `{slug}-<qualifier>.md`（slug 已自带 `NN_`，不需额外 `0N-` 前缀，消除与 gate glob 的互斥）
- `inspect-wave1-output.mjs`: 删 `numericId()` → 改用 `startsWith(topic.slug)` 直接匹配，适配新命名约定
- 文档同步: `shared-schemas.md` Reference Layer / `START_FROM_HERE.md.tmpl` / `reference/README.md.tmpl` / `gate-wave1-complete.definition.json` 全部更新

**根因消除**: topic slug 含 `NN_` 前缀后，`{slug}-<qualifier>.md` 命名自然满足 gate glob `*{topic}*`——slug 本身以 `NN_` 开头，文件名以完整 slug 开头，glob 匹配无需额外 `-` 分隔符。
