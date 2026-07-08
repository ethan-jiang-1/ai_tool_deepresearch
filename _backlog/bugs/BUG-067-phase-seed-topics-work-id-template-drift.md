# BUG-067 — `phase-seed-topics.md` 的 task-card / result 模板仍用已废弃的 `work_id` 队列身份；hygiene 守卫存在但不覆盖该文件

| 属性 | 值 |
|------|-----|
| ID | BUG-067 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P2 — 逐字照抄 canonical seed-topics playbook 会在首次 enqueue 失败；Agent 必须自行知道把 `work_id` 改成 `queue_item_id` |
| 来源 | `dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run（seed-topics phase，首次 enqueue 5/5 失败） |
| 相关 Bug | [[BUG-056]]（queue slug derivation）、[[BUG-060]] |
| 影响文件 | `workflows/nodes/phases/phase-seed-topics.md`（§3.1 task card 模板 line 61、§3.2 result 模板 line ~224）、`cli/validate-work-unit-hygiene.mjs`（`checkQueueTemplate` 覆盖范围）、`cli/validate-phase-templates.mjs` |

---

## 0. 一句话核心诊断

**`phase-seed-topics.md` 的 task-card 模板把队列需求身份写成 `"work_id"`，但 `QueueDemandItemSchema` 现在 require `queue_item_id` 且 superRefine 明令拒绝 `work_id`；照抄模板 → 首次 enqueue 直接被拒。更糟的是：hygiene 守卫 `validate-work-unit-hygiene.mjs` 恰好有一条 `"work_id"` token 规则，却只扫 `rb_templates/rb_queue.json.tmpl`，不扫 phase MD 节点——所以 `validate-work-unit-hygiene: passed`，守卫对它本应拦截的 drift 视而不见。**

---

## 1. 证据

### 1a. 模板 drift（`phase-seed-topics.md`）

- §3.1 task card 模板（line 61）：
  ```json
  { "work_id": "seed-topic-{topic.slug}", ... }
  ```
- §3.2 complete result 模板（line ~224）：
  ```json
  { "work_id": "...", "receipt": "file:seed_topics/{topic.slug}.md", ... }
  ```
- 而 schema 要求：
  - `QueueDemandItemSchema`（`schema/contracts/queue.mjs`）require `queue_item_id`，并有 superRefine：
    `Queue demand identity is queue_item_id; work_id is reserved for Engine-allocated delegated work-unit attempts.`
  - `QueueResultSchema`（`engine/queue-manager-core.mjs`）require `queue_item_id`。
- 实测：照模板 enqueue 报
  ```
  { "expected": "string", "code": "invalid_type", "path": ["queue_item_id"] }
  ```
  5 个 seed-topic 全部首次失败，改成 `queue_item_id` 后才通过。

### 1b. 不一致：`phase-wave0.md` 是对的

- `phase-wave0.md`（line 58）的 task card 模板用的是正确的 `"queue_item_id": "wave0-source-{topic.slug}"`。
- 即 drift 只落在 `phase-seed-topics.md`，两份 canonical phase 文档自相矛盾——更说明这是遗漏而非设计。

### 1c. 守卫存在但覆盖不到

- `validate-work-unit-hygiene.mjs` 的 `checkQueueTemplate()`（line ~296-310）有 `"work_id"` token 规则：
  ```js
  const rel = 'DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl';
  for (const token of ['"work_id"', 'slot_1_current', ...]) { ... }
  ```
  但它**只读 `rb_queue.json.tmpl` 这一个文件**，不扫 `workflows/nodes/phases/*.md`。
- 因此 `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs` → `passed`，尽管 `phase-seed-topics.md:61` 明明含 `"work_id"`。
- `COMMANDS.md` 宣称 hygiene checker「静态阻止…queue demand `work_id`」，但实际覆盖不到 canonical phase 模板 → 守卫与其声明的职责不符。

---

## 2. 影响

- 唯一入口级 playbook（seed-topics 是第一个 delegated-adjacent phase）逐字执行会在首次 enqueue 失败，Agent 必须"知道"schema 已从 work_id 迁到 queue_item_id 才能自愈——这对新 agent / 干净复跑不友好。
- 守卫的假阴性让这类 drift 可以长期潜伏而 CI 绿灯。

---

## 3. 修复方向

1. **改模板**：`phase-seed-topics.md` §3.1、§3.2 中的 `"work_id"` 全部改为 `"queue_item_id"`（task card 与 complete result 两处）。
2. **扩守卫覆盖**：让 `validate-work-unit-hygiene.mjs` 的 `"work_id"`-as-queue-identity 规则也扫 `workflows/nodes/phases/*.md`（或让 `validate-phase-templates.mjs` 增加"queue demand identity 必须是 queue_item_id"检查）。要点：**守卫必须覆盖它声称守卫的那类文件**，否则 [[BUG-066]] 式的模板漂移会反复出现。
3. **回归测试**：对所有 `phases/*.md` 里的内联 task-card / result JSON 代码块做静态解析，断言不含 `"work_id"` 作为队列身份 key。

---

## 4. 备注

本 bug 与 [[BUG-066]] 同源于同一次 run 的同一类问题——**"文档/契约漂移未被守卫拦截"**。BUG-066 是 emitted schema ↔ validator 漂移；本 bug 是 phase MD 模板 ↔ queue schema 漂移。两者都指向：需要把"契约一致性"做成常态化测试，而不是靠 Agent 在真实 run 里踩坑后逆向修复。
