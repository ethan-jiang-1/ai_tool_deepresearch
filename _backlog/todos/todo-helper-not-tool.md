# TODO: 让系统成为"靠谱的同事"而非"工具"（北星 — 已收窄/延后实施）

> 状态: 北星保留 / 实施延后 | 优先级: 低–中（人格层） | 更新: 2026-07-15  
> 直接依赖: `DONE-hitl-ux` ✅（环机制已就位）  
> **硬前置:** ~~BUG-069 有进展 + `todo-coding-agent-setup-ux`~~ ✅ 两者均已解决 — BUG-069 已修复移入 `_done/_fixed_bugs/`，setup-ux 已关闭移入 `_done/_closed_plans/`。延后理由变为：等 quality/recover 稳定后再抬人格层，避免在流动地基上做皮肤。

## Why（北星仍成立）

用户感知仍偏「操作机器」而非「研究员同事」。四根支柱：记忆、主动、沟通、同频 — 工程骨架对，面向用户的皮肤偏机器。

## 地基对齐（2026-07-15）

| 旧期望 | 现状 |
|--------|------|
| 依赖活跃 `todo-hitl-ux` / `establish-hitl-ux` | ✅ **已 DONE/归档** — 用 `brief/hitl1.md`、`brief/hitl2.md`、`shared-agent-ux-guidance.md` |
| `shared-hitl-prompt-templates.md` | ❌ **已拆** — 现为 `brief/hitl*.md` |
| 全表面中文硬契约 + 改 wave 提示词 | ❌ **过重** — 见 `_backlog/plans/ux-user-facing-chinese-first-outside-waves.md`：内部 instruction 继续英语；只对漏给用户的输出 **prefer Chinese 软提示** |
| `shared-agent-persona.md` + `~/.dpt/user-memory` + CLI | ❌ 均未建 — 仍属本北星，但勿在 quality/recover 稳定前开工 |
| 静默阶段「同事自己干活」 | ✅ BUG-069 已修复，gate hints + contract lineage 落地，无人值守可达 |
| BUG-069 + setup-ux 硬前置 | ✅ 两者均已解决 |

## 收窄后的实施顺序（若抬起）

1. **极轻：** 在已有 UX shared 加 user-facing prefer-Chinese 软提示（可与 chinese-first plan 合并，甚至不单独立项）
2. **轻：** `shared-agent-persona.md` 只定义口吻/边界，**不改** wave/setup 等内部逻辑 instruction
3. **重（另开 change）：** cross-run user-memory — 等静默 run 真能关终端再做（细化见下文「记忆支柱细化：跨 run 双记忆」）

## Non-Goals（强调）

- 不为「同事感」翻译/改写内部 phase instruction 或 gate 逻辑
- 不把本 todo 排在 coding-agent-setup-ux / BUG-069 之前
- 不一次上齐记忆 CLI + 全 phase 主动性埋点

## Next Step

保持北星文档；**不要**现在 `/opsx:propose` 大人格 change。硬前置已满足（069 + setup-ux ✅）；等 quality/recover 稳定后再抬，避免在流动地基上做皮肤。

## 记忆支柱细化：跨 run 双记忆（Preference + Experience）— 北星细化

> 本节只细化四支柱之首「记忆」；仍属北星，**实施延后**（BUG-069 + setup-ux 未缓解前不抬）。正式行程计划回头落到 `_backlog/plans/`，本节不 propose。

### 词汇对齐（先钉死，防误解）

用户口中的「宽度 / 深度 / 综合 13 层 / wave 0·1·52」不是新参数，而是**现有 shape 面**的口语说法：

- **profile A/B/C** = `rb_profile.yaml#/research_profile`
- **综合 13 层 / 深度** = `research_style_params`（13 字段 Zod schema，`schema/contracts/profile.mjs`）
- **宽度** = `rb_plan.md#/topic_registry` 长度（topic 数）
- **wave 数**今天固定 3（wave0/1/2 硬编码）；「wave 52」是「想更深」的口语，落到 profile + style params，不是可变 wave 数

记忆记的是**这张 shape 面**。若将来 shape 面长大（如可变 wave 数），记忆 schema 跟着长，不另起炉灶。

### 两类记忆

| | Type A · 偏好 / 画像 | Type B · 经验 / 失败教训 |
|--|--|--|
| **记什么** | 默认 profile、`research_style_params` 覆盖、宽度胃口、语言、源口味 | `{ when, trigger（哪个 gate/phase/源类型/topic 形态）, 失败了什么, 有效的修法, tags }` |
| **像什么** | 「你一般要多深多广」 | 「上次这类事栽在哪、怎么翻过去的」 |
| **怎么学** | **确认后**写回（不静默改 profile） | **自动蒸馏**、advisory、可裁剪 |
| **今天缺口** | 每 run 从 `not_selected` 重来，跑完蒸发 | 零；同类失败每次重新踩 |

Type B 才是「像同事」的关键：agentic workflow 应该记住栽过的跟头，下回遇到同类情形主动借鉴、努力翻过去——而不是每个 run 都从零踩雷。

### 与 charter 的边界和解（核心 —— 这段是本节存在的理由）

跨 run 记忆**看起来**违宪：`project-charter.md` MUST「runtime state 只在 active bundle，不在 chat memory」；anti-cheating 规则 #4 禁止拿 chat memory 当 run state；system-logging design 禁止跨 run 聚合。

**和解点：charter 禁的是记忆当「真相 / 证据 / gate 权威」，不禁记忆当「用户已确认的默认 + advisory 提示」。** 记忆是 **Layer-1 advisory 输入，永不是 Layer-2 权威**：

- **永不算证据**：不能 back 报告里任何 claim，不能替代 bundle 内的验证
- **永不喂 gate**：gate 只读 bundle control files，确定性判定；记忆不进 gate 输入，不偏移 gate 结果
- **只 seed 提案**：在 HITL1 浮出「上次你选 C / 惯用中文，这次也这样？」由用户确认或改；**bundle 记录的是实际决定**（bundle 仍是唯一 run-truth）
- **provenance 标注**：任何被记忆 seed 的值在 bundle 里带来源标记（`seeded_from: global_pref` / `experience#<id>`），使该 run **仅凭 bundle 即可审计、复现**

这样四条 charter 不变量全保住——记忆是「把更准的输入放回 LLM 判断」，不是「让 Markdown/记忆夺取确定性权威」。本设计**尊重** charter MUST 与 anti-cheating #4，不是绕过它们。

### 存储形态（建议，非枚举）

全局根 `~/.dpt/`（XDG-aware：`$XDG_CONFIG_HOME/dpt`，否则 `~/.dpt`）：

| 文件 | 内容 | 读写 |
|--|--|--|
| `preferences.yaml` | Type A，结构化、schema 校验，镜像 shape 面 | 机器读 + **确认后**写回 |
| `experience.jsonl` | Type B，蒸馏 lesson，**append-only**（并发安全，参照 `run.log` 设计原则） | 自动追加、advisory 读、可裁剪 |
| `taste.md` | 人写的「找/鉴/写」口味包 | **归 [[user-knowledge-hang]]**，此处只引用不重复 |

### 读写路径 + 学习姿态（split：auto-experience / confirm-preference）

- **读**：`start-research` / HITL1 时读 `preferences.yaml` seed 默认（替代 `not_selected`）；在各决策点浮出**匹配 trigger** 的 Type-B lesson
- **写（分裂）**：
  - **Type B 自动**——当 repair/rerun 把某 gate 由 fail→pass，蒸馏一条 lesson 自动 append，带 trigger 上下文供将来匹配
  - **Type A 确认**——run 末提议「记住这个偏好？」，用户确认才写回，**杜绝 profile 静默漂移**

### 护栏清单

- advisory-only；永远 HITL 可确认可覆盖
- provenance 标注，run 可仅凭 bundle 复现
- 带时间戳，浮出时说「**上次**你…」而非「你**总是**…」（staleness：记忆反映写入当时）
- 写回：Type A 需同意、Type B 可裁剪
- append-only + 并发安全（多 run 并行）
- **domain-scoped**：`医疗政策` 的 lesson 不泄漏进 `竞品调研`
- 永不当证据、永不进 gate
- **没有 `~/.dpt/` 时，行为与今天完全一致**（纯增量、可选、零回归）

### 分期路径（可增量抬起）

1. **Phase 1**：只读 seeding + advisory recall（无写回）——最轻、charter 风险最低
2. **Phase 2**：确认式 preference 写回
3. **Phase 3**：自动 experience 蒸馏

每期独立有价值、可独立 gate、可独立走一个 OpenSpec change。

### 与 [[user-knowledge-hang]] 的边界

| | user-knowledge-hang | 本记忆支柱 |
|--|--|--|
| 形态 | 静态、人写、**单次挂载** | 自动、**跨 run**、结构化 |
| 内容 | 找/鉴/写 口味 Markdown | shape 偏好 + 失败经验 |

边界那份 todo 已声明（其 line 24/139/152：「自动跨 run 学习那是 helper-not-tool 记忆层」）；此处复述以防漂移。两者可共存：`taste.md` 是人写口味，本层是机器学的偏好 + 经验。

### Non-Goals（本节补充）

- 不做向量库 / RAG / embeddings
- 不静默改偏好；不让记忆进 gate 输入或当证据源
- 不在 BUG-069 + setup-ux 前抬起
- 不做全局 telemetry / 跨 run trace 聚合（trace 仍 per-bundle，charter 要求）

---

以下为历史长文设计（归档对照；实施以「收窄后」为准，勿按全文 Phase 1–5 开干）。

# TODO: 让系统成为"靠谱的同事"而非"工具"

> 状态: 待设计 | 优先级: 最高（UX 层的北星） | 创建: 2026-06-27
>
> 本 TODO 的核心问题：**当前系统是一个你操作的机器，不是一个跟你一起工作的同事。**
> 一个靠谱的同事有四个特质——记忆、主动、沟通、同频。这四个在当前系统里几乎为零。
>
> 直接依赖: `todo-hitl-ux.md`（HITL 环设计已就位——本 TODO 把 HITL 环的"交互约定"升级为"人格层"）
> 上游 of: 所有用户可见交互——HITL1/HITL2 的 prompt 语气、静默阶段的出口语、Final 的交付话术、错误恢复时的表达方式、跨 run 的上下文延续

## Why

### 当前是一个工具，不是一个同事

用户对当前系统的感知：**一个你要操作的机器。**

```
用户的内心模型（当前）：
  "我给它一个话题 → 它跑一堆 phase → 它回来问我要几个参数 → 它继续跑 → 它给我报告"
  
用户的感觉：
  - 我在填表
  - 我在等一个 batch job 跑完
  - 我不知道它在干什么（也不想被它打扰，但……）
  - 它不认识我，每次都是从头开始
  - 它跟我说的话像 CLI 输出
```

这不是信任关系。这是操作员和机器的关系。

**一个靠谱的同事给予用户的感知是：**

```
"我有一个研究员同事——他记得我上次关心什么、会主动想到我没想到的角度、
 说话像人不像机器、理解我真正想问的是什么。"

用户的感觉：
  - 我跟他说话就行，不用填表
  - 他自己去干活，干完回来找我聊
  - 他会告诉我"这个方向可能更有意思"
  - 他记得我上次偏好什么
  - 他交付的时候会告诉我哪里靠谱哪里不太靠谱
```

### 四根支柱：记忆、主动、沟通、同频

| 特质 | 同事的表现 | 当前系统 | 缺口 |
|------|----------|--------|------|
| **记忆** | "上次你对这个角度很感兴趣，这次要不要也深挖？" | 每次 run 是全新的——没有用户画像、没有偏好记忆、没有跨 run 上下文 | **零记忆** |
| **主动** | "我注意到你问 X，但 X 的前提假设是 Y——要不要我先验证一下 Y？" | 严格只做被要求的事——不质疑用户的问题、不建议更好的角度、不补充盲区 | **零主动性** |
| **沟通** | 自然说话，有判断、有情感、有分寸。不确定时直说，有好消息时能感受到 | CLI 式结构化输出——phase/gate/progress 的机器语言。HITL 目前是 5 问问卷 | **机器口吻** |
| **同频** | 理解你的真实意图——你说"帮我看看这个电影为什么火"，他知道你可能在关心"哪些营销手段有效""这个题材的市场空间" | 字面执行 user question——不理解背后的真实关切，不主动 align | **字面理解** |

**当前 HITL UX（`todo-hitl-ux.md`）解决了"环"的机制——用户可以在 HITL 里打转、问 BTW 问题、得到帮助后再决定。但它没有解决"这个人是谁"。环是一个交互结构；人格是环里的那个人。**

本 TODO 是 UX 层的北星——把"交互结构"升级为"人格层"。所有用户可见的交互（HITL1/HITL2/Final/静默出口语/错误恢复）都是这个"同事"在说话，不是一个机器在输出。

---

## 核心挑战

### 不是加功能——是换一层表达

当前系统的工程骨架是对的：10-phase lifecycle、3 个浮出水面点、静默自主执行、gate/checkpoint 反馈闭环。这些不动的。

问题是：**这个骨架面向用户的"皮肤"是机器语言。**

**两个版本的信息相同（A/B/C 三选一），但前者是问卷，后者是对话。**

### 核心挑战不是文案——是让 Agent 能持续扮演这个角色

1. **角色一致性**
2. **记忆持久化**
3. **主动性的边界**
4. **同频的机制**

（完整 Phase 1–5 设计见 git 历史 2026-06-27 原文；2026-07-09 起以文首「收窄后」为准，避免按过时路径改 brief 文件名与 wave instruction。）
