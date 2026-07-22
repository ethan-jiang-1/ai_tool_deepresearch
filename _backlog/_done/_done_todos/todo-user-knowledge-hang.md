# TODO: user-knowledge-hang（小白可挂的「找 / 鉴 / 写」知识包）

> 状态: 待设计 | 优先级: 中 | 更新: 2026-07-22（v0.40 同步）
> 目标: **机制越简单越好**；小白能挂上；高度可定制  
> 相关但不等同: HITL1 `search_preference`（太薄）、`todo-helper-not-tool` 跨 run 记忆（太重）、活跃 `research-question-closure-and-evidence-judgment` plan（模型的证据/策略判断）

---

## Why

用户真正想挂进研究里的，往往不是又一套 schema，而是三句人话：

1. **往哪里找东西** — 信任哪些源 / 域名 / 人 / 库；避开什么  
2. **如何鉴别好坏** — 什么算够格、什么直接丢掉、什么只能当线索  
3. **写什么我满意** — 口吻、结构、详略、要不要对策/风险/对照表  

今天系统里只有：

| 已有表面 | 能挂什么 | 缺口 |
|----------|----------|------|
| HITL1 `search_preference` | 一句可选自然语言 | 太短，装不下「鉴 / 写」 |
| `seed_topics/*/search_guardrails` | per-topic 搜索约束 | Agent 写的，不是用户自带知识包 |
| `research_style_params` | floor / tier 等硬参数 | 不适合小白手改，也不是「口味」 |
| helper-not-tool 的 `~/.dpt/user-memory` | 跨 run 画像（未建） | 过重；本 todo **不走那条** |

需要的是：**一个可挂载的用户知识包**，研究开跑时挂上，Agent 当软约束读；不挂就用默认。

---

## 设计原则（先钉死）

1. **Markdown 优先，几乎零学习成本**  
   - 小白复制模板 → 用中文填空 → 保存 → 开跑时指一下路径  
   - 不要一上来上向量库 / RAG / 嵌入 / 专用 GUI

2. **三块固定标题，内容高度自由**  
   - 机制只认三个 section（或等价 frontmatter 指针）  
   - section **里面**随便写：列表、链接、反例、「我讨厌的写法」——定制空间在这里

3. **挂载，不内嵌进框架逻辑**  
   - 知识包是用户资产（可放在 repo 外、U 盘、团队共享盘）  
   - run 只 **引用** 它（profile 里一个 path，或 bundle 里一份拷贝）  
   - 不改 gate 硬规则；最多影响 Agent 搜索/取舍/写作软约束

4. **可选**  
   - 不挂 = 行为与今天完全一样  
   - 挂了 = HITL1 / wave / Final 读得到

5. **和 Engine 硬门槛分家**  
   - 「结构可数」仍归 `ref-count`；研究问题的语义判断归模型，不由知识包或 Engine score 取代
   - 知识包回答的是「**我对这个领域的口味**」，不是替代 CCC 字数

6. **先有 OpenSpec contract，再有 profile path / bundle copy**
   - 当前 profile schema、HITL1 writer 与 phase guidance 都没有 `knowledge_pack_*` owner
   - 任何新增 path、copy、frontmatter 或 reload behavior 都是 runtime contract change，必须先 propose；不得把外部 Markdown path 当作无授权的隐式 bundle truth

```
┌─────────────────────────────────────────────────────────┐
│  用户知识包（人写 Markdown）                              │
│  ## 往哪里找 / ## 如何鉴别 / ## 写什么我满意               │
└──────────────────────────┬──────────────────────────────┘
                           │ hang（path 或 copy）
                           ▼
┌─────────────────────────────────────────────────────────┐
│  本次 run：rb_profile 记 knowledge_pack_ref               │
│  Agent 在 HITL1确认后 / wave 搜索前 / Final 写作前读入     │
└─────────────────────────────────────────────────────────┘
        软约束 only —— 不改 gate schema，不改 stop:no 逻辑
```

---

## 建议形态（最小可行）

### 文件：一份模板就够

例如用户侧：

```text
my-research-taste.md          # 或 knowledge/我的口味.md
```

模板骨架（示意）：

```markdown
# 我的研究口味

## 往哪里找
- 优先：…
- 可以：…
- 避开：…

## 如何鉴别
- 够格：…
- 只能当线索：…
- 直接丢掉：…

## 写什么我满意
- 结构：…
- 口吻：…
- 必须有：…
- 不要：…
```

**小白路径：** 复制模板 → 填中文子弹 → 开跑时说「用这个文件」或放进约定目录。

### 挂载方式（选最笨的一种先做）

| 方案 | 做法 | 小白友好度 |
|------|------|------------|
| **A. 开跑时给路径（推荐先做）** | `start-research` / HITL1：「知识包路径？」→ 写入 `rb_profile.yaml#/knowledge_pack_path` | 高：指文件即可 |
| B. 丢进 bundle | 复制为 `dpt_rb_*/user_knowledge.md` | 高：拖文件 |
| C. 全局默认 | `~/.dpt/default-knowledge.md` | 中：要会放家目录 |

倾向 **A + 可选 B**；C 留给以后，别和 helper 记忆搅在一起。

### Agent 怎么用（仍要简单）

- **HITL1**：若已挂包，入口可一句确认「将按你的知识包找/鉴/写；要改包还是先跑？」  
- **wave0/1/2**：搜索与取舍时 **读** 前两节作软约束（不改 phase 逻辑大段；最多 shared 一句「if knowledge pack present, prefer it」）  
- **Final**：第三节约束交付口吻/结构  

**刻意不做：** 自动从知识包生成 gate 规则、自动改 `count_floor`、自动建 topic。

---

## 高度定制化怎么保证

定制点放在 **Markdown 正文**，不放在新 enum 森林里：

- 领域包：`taste-医疗政策.md` / `taste-竞品调研.md` 换挂即可  
- 团队包：共享盘一份，每人开跑指同一 path  
- 个人包：自己的「讨厌营销软文」「只要表格结论」  
- 进阶用户以后可加 YAML frontmatter（`version`、`domain`）——**v1 不要求**

机制只保证：**三个标题在 + 能被 run 引用**。其余全是用户的。

---

## Non-Goals

- 不做向量知识库 / RAG pipeline  
- 不做跨 run 自动学习用户口味（那是 helper-not-tool 记忆层）  
- 不把知识包变成第四套 research_style JSON  
- 不翻译/改写内部 wave instruction 来「适配」知识包  
- 不在 BUG-069 未缓解时做成复杂 Engine 子系统  

---

## 与现有 todo 的边界

| 项 | 关系 |
|----|------|
| `search_preference` | 可被知识包「往哪里找」吸收或并存；知识包更完整 |
| `research-question-closure-and-evidence-judgment` | 模型按问题判断证据/策略；知识包是用户口味软约束，可作 Agent 输入，不替代 provenance 或问题交接契约 |
| `todo-helper-not-tool` | 人格/跨 run 记忆；本 todo 是 **单次挂载的静态包**，更简单、可先做 |
| chinese-first plan | 第三节可写「用中文写」；不单独为语言开机制 |

---

## 开放问题（explore 时拍板）

1. 挂载字段名：`knowledge_pack_path` vs 直接 `user_knowledge.md` 拷进 bundle？  
2. HITL1 是否必问「要不要挂」还是完全静默可选？  
3. 知识包缺失 section 时：忽略 vs 警告一句？  
4. 模板放哪：`DPT_FRAMEWORK/templates/user-knowledge-pack.md` 还是 `command_playbook/`？  

---

## Next Step

1. `/opsx:explore user-knowledge-hang` — 先确认现有 `search_preference`、`research_style_params`、Wave2/HITL2 guidance 缺少的用户软约束事实，再钉死三节模板、一种受控挂载方式与读取时机
2. 若确有缺口，再 propose 一个文档 + 单一受控 reference/copy contract + shared soft guidance 的小 change；不得绕过 OpenSpec 直接加 profile 字段，若 tasks 长出 schema 森林则停止

## 一句话

**给小白一个三节 Markdown 口味包（找 / 鉴 / 写），开跑时挂上路径即可；机制只负责挂载与读取，定制全在用户自己写的正文里。**
