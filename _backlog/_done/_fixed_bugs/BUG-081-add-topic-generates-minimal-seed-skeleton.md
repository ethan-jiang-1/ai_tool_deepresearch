# BUG-081: `add_topic` 生成的 seed file 骨架过于简陋，Phase Agent 无法直接使用

## 发现时间
2026-07-13，rerun 中通过 `operate-topic-state apply add_topic` 新增 topic 06、07 后审计 seed 质量。

## 严重程度
**P1** — seed 是 Phase Agent 在整个研究 pipeline 中的知识地图入口。骨架缺失导致 Agent 在 wave0/wave1/wave2 中缺少必要的上下文锚点，回填区缺失导致证据无法结构化落盘。

## 症状

`add_topic` 生成的 seed file 仅包含：

```markdown
---
{topic_uid, id, slug, title, must_answer, scope_role, depends_on_topic_uids}
---
# {title}

## 主题定位
primary    ← 仅 scope_role 字符串，不是真正的主题定位叙述

## must_answer
1. ...
2. ...

## 本轮重跑方向    ← 由 phase-rerun Agent 追加，非 add_topic 产出
```

对比正常 seed（如 01_deer-valley-retreat-feb-2026.md），缺失以下关键 sections：

| 缺失 section | 用途 | 谁应该产出 |
|---|---|---|
| `## 主题定位`（叙述性段落） | 解释为什么选这个 topic、在研究中的角色 | add_topic 应生成 placeholder 引导 Agent 填充 |
| `## 初始假设、缺口或张力` | 已知/未知/张力，给 wave0 搜索提供方向 | seed-topics phase Agent |
| `## why now` | 触发事件、时间窗口、里程碑 | seed-topics phase Agent |
| `## 研究边界与不深挖范围` | 在范围内/不深挖 | seed-topics phase Agent |
| `## 证据锚点与优先来源` | 优先搜索目标、噪音规避 | seed-topics phase Agent |
| `## 为什么对最终交付物重要` | 对 final report 的贡献 | seed-topics phase Agent |
| `## 下游位置（可选）` | 流向哪些 downstream sections | seed-topics phase Agent |
| `## ═══ 研究轮次追加区 ═══` | 回填区 marker | add_topic 应预埋 |
| `## 历史摘要` | 历史轮次摘要 | `__BACKFILL_PREVIOUS_SUMMARY__` token |
| `## 本轮新增证据` | evidence_meaning/relationship/refs/status/next_hop | wave0/wave1 backfill |
| `## 本轮新增机制理解` | 同上，深度机制层面 | wave1 backfill |
| `## 本轮新增趋势与难点` | 同上，趋势/局限层面 | wave1/wave2 backfill |
| `## 当前判断` | 综合判断 + supports/partial/opens | wave2 backfill |
| `## 待验证问题` | 开放问题 + refs + next_hop | wave2 backfill |

## 根因

`canonical-topic-state.mjs:94` 的 `renderSeed()`：

```javascript
const body = existingBody || `# ${topic.title}\n\n## 主题定位\n\n${topic.scope_role}\n\n## must_answer\n\n${topic.must_answer.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`;
```

- `seed_binding: 'new'` 时 `existingBody` 为空，走 else 分支，仅生成 `# Title\n\n## 主题定位\n\n{scope_role}\n\n## must_answer\n\n{numbered_list}`
- scope_role 是 enum 值（`primary|synthesis|comparison|supporting`），不是叙述性段落
- 回填区 token（`__BACKFILL_*__`）完全没有预埋
- 没有 placeholder 或引导注释告诉 Phase Agent 需要补充哪些 sections

## 复现条件

1. 在 rerun 或 HITL1 中通过 `operate-topic-state apply` 的 `add_topic` action 新增 topic
2. `seed_binding: 'new'`
3. 检查 `seed_topics/{slug}.md`

## 影响范围

- 所有通过 `add_topic` 新创建的 seed file（当前 bundle: 06、07）
- Phase Agent 在 seed-topics phase 需要手动补全所有缺失 sections，增加遗漏风险
- 回填区缺失意味着 wave0/wave1 产出的证据无处结构化落盘，只能追加到 seed 尾部或留在 artifacts 中
- BUG-080 中描述的"回填质量差"问题部分根因在此——没有预埋回填区 token，Agent 不知道往哪里回填

## 建议修复

### 短期（当前 bundle 手工修复）
1. 以现有完整 seed（如 01）为模板，手工补齐 06/07 的所有缺失 sections
2. 预埋 `__BACKFILL_*__` token 供后续 wave 回填

### 中期（框架改进）
1. **`renderSeed()` 在 `seed_binding: 'new'` 时生成完整骨架**，包含：
   - `## 主题定位` → placeholder `__FILL_TOPIC_POSITIONING__`（非 scope_role 字符串）
   - `## 初始假设、缺口或张力` → placeholder
   - `## why now` → placeholder
   - `## 研究边界与不深挖范围` → placeholder
   - `## 证据锚点与优先来源` → placeholder
   - `## 为什么对最终交付物重要` → placeholder
   - `## 下游位置（可选）` → placeholder
   - `## ═══ 研究轮次追加区 ═══`
   - `## 历史摘要` → `*(新建 topic，无历史轮次)*`
   - `## 本轮新增证据` → `__BACKFILL_EVIDENCE__`
   - `## 本轮新增机制理解` → `__BACKFILL_MECHANISM__`
   - `## 本轮新增趋势与难点` → `__BACKFILL_TRENDS__`
   - `## 当前判断` → `__BACKFILL_JUDGMENT__`
   - `## 待验证问题` → `__BACKFILL_QUESTIONS__`

2. **或者**：将 seed 骨架定义为 `rb_templates/seed_topic.md.tmpl` 模板文件，`add_topic` 和 `migrate_legacy` 均从此模板渲染，保持一致性。`seed-topics` phase 的 gate 检查骨架完整性（至少检查 `__BACKFILL_*__` 和 `__FILL_*__` token 是否存在）。

## 相关

- BUG-080: Rerun seed backfill quality（回填质量问题，部分根因在此）
- `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs:94` — `renderSeed()` 函数
- `DPT_FRAMEWORK/cli/operate-topic-state.mjs` — add_topic 入口
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` — seed-topics phase 指令
