# BUG-093 — seed topic 研究轮次追加区 section 命名模糊，"本轮"不指明对应 wave

**报告日期**: 2026-07-18
**发现环境**: `dpt_rb_ai-era-bpm-process-disruption` 全部 13 个 seed topic
**严重度**: MEDIUM（不影响 gate，但导致 Agent 和人类读者无法从 section 名直接判断内容属于哪个 wave）

## 框架现状

`phase-seed-topics.md` §3.1（line 161-195）定义了"研究轮次追加区"的模板。模板用注释表格（line 166-171）明确了 wave→section 的映射关系：

| 触发 Phase | 追加内容 | 写入 Section |
|-----------|---------|-------------|
| Wave0 | source/reference return-map entries | `## 本轮新增证据` |
| Wave1 | mechanism/trend return-map entries | `## 本轮新增机制理解` + `## 本轮新增趋势与难点` |
| Wave2 | W2F finding entries | `## 当前判断` |

**section 名字**（line 182-195）：

```
## 本轮新增证据
## 本轮新增机制理解
## 本轮新增趋势与难点
## 当前判断
## 待验证问题
```

## 问题

### 问题 1："本轮"一词在 rerun 上下文中歧义

"本轮"指"当前 lifecycle pass"——不区分"第一轮 wave0"还是"rerun 的 wave0"。框架注释表格已明确映射关系（"本轮新增证据"=Wave0），但**注释不在生成的文件里**——读者（Agent 和人类）只能看到 `## 本轮新增证据` 这个 section 名，无法从名字本身判断它对应 Wave0 还是 Wave1。

在有 rerun 的场景下，一个 topic 可能有多个"本轮"——rerun wave0 的证据该往哪写？rerun wave1 呢？

### 问题 2：Agent 被迫自行补救

Topic 08（Maersk）和 Topic 09（BPM-improvement）的 Agent **绕过了模板**，自己在 section 名后加了括号注解：

- Topic 08: `## 本轮新增证据（wave0：source intake 已完成 ✅）`
- Topic 09: `## 本轮新增证据（wave0：方法论文献 ✅）`

这证明 Agent 在回填时意识到了命名歧义，并主动做了补救——但这是 Agent 的 ad-hoc 行为，不是模板规范。Topics 01-07 没有这样做，导致同一 bundle 内 section 命名风格不一致。

### 问题 3：`__BACKFILL_*__` 占位 token 机制未被遵守

模板要求（line 175）Agent 用 `grep` 定位 `__BACKFILL_WAVE0_EVIDENCE__` 等 token，然后替换为 return-map entry。但全部 13 个 seed topic 中**没有一个使用了这个 token 机制**。Agent 直接往 section 下写内容，跳过了 token→替换流程。这意味着：

- Token 机制在实践中无效
- Agent 不会在回填前检查 section 是否已有内容（没有 token 作为"已回填"的标记）
- 可能导致重复回填或内容覆盖

### 问题 4：Wave2 回填 section 缺失 wave 标注

`## 当前判断` 没有括号注解说明它是 Wave2 回填的。在一个有多个 rerun 轮次的 topic 中，可能有多个"当前判断"——读者无法区分。

## 根因

模板设计时用注释表格建立 wave→section 映射，但 section 名字本身没有包含 wave 标识。"本轮"一词在单轮执行时不会产生歧义，但在 rerun 场景下失去了语义锚定。

## 影响范围

- **全 bundle 的 seed topic**（13 个）都存在命名歧义
- Agent 回填行为不一致：有些 Agent（08-09）自行加了 wave 标签，有些（01-07）没有
- BUG-092（新 topic 完全没用结构化 evidence 格式）可能与此有关——新 Agent 读旧 seed topic 时无法从 section 名判断应该写什么格式

## 建议修复

1. **模板改名**：将 section 名从"本轮"改为明确的 wave 标识：
   - `## 本轮新增证据` → `## Wave0 新增证据`
   - `## 本轮新增机制理解` → `## Wave1 新增机制理解`
   - `## 本轮新增趋势与难点` → `## Wave1 新增趋势与难点`
   - `## 当前判断` → `## Wave2 当前判断`

2. **或者在 section 名后加 wave 后缀**（对齐 topic 08-09 的已有实践）：
   - `## 本轮新增证据（Wave0）`
   - `## 本轮新增机制理解（Wave1）`

3. **迁移已有 bundle**：对旧 topic 01-07 的 section 名做批量 rename

4. **token 机制要么强制要么去掉**：当前 `__BACKFILL_*__` token 在实践中完全没被使用——要么在 gate 中检查 token 已被替换（强制 Agent 使用），要么从模板中移除
