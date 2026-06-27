# Bug #002: Task Card `controller: "main-agent"` 允许 Phase Agent 绕过 Sub-agent，导致 `_cache/` 证据链丢失

## 严重程度

**P0** — `_cache/` 目录完全为空（仅有 agentic-queue 状态）。51 条 source 的原始搜索结果、抓取页面、元信息全部缺失。任何一条 evidence 都无法追溯其真实来源。

## 现象

在 `dpt_rb_chinese-youth-trending-activities/_cache/` 中：

```
实际存在:
  _cache/
    README.md
    agentic-queue/current-task.md

应该存在但没有:
  _cache/wave0/primary/{5个topic}/   ← 51 个 source 的 websearch.json + page.md + meta.json
  _cache/wave1/primary/{5个topic}/   ← 5 个 topic 的 deepening 搜索数据
  _cache/wave2/emergent/             ← 交叉挖掘的搜索数据
```

## 根因

### 框架设计

框架要求所有搜索工作通过 Sub-agent relay 完成。Sub-agent 的工作流包含写 `_cache` 的步骤：

```
Sub-agent 执行搜索:
  1. WebSearch → 保存原始结果为 _cache/{wave}/.../websearch.json
  2. WebFetch  → 保存页面内容为 _cache/{wave}/.../page.md
  3. 提取元信息 → 保存为 _cache/{wave}/.../meta.json
  4. 返回结构化结果给 Phase Agent
```

### 实际执行

Phase Agent 没有 spawn Sub-agent，而是自己做了搜索：

```
Phase Agent:
  1. WebSearch → 结果在聊天上下文里（用完即丢）
  2. 直接从搜索结果写 source.yaml / evidence-summary
  3. _cache 写入步骤被跳过（Phase Agent 的工作流里没有这一步）
```

### 为什么会这样

Task card 模板写了两个互相矛盾的字段：

```json
"targets": {
  "controller": "main-agent",           // ← Phase Agent 可以 claim 这个 task
  "delegates": { "to": "sub-agent" }    // ← 建议让 sub-agent 做搜索（但不强制）
}
```

`controller: "main-agent"` 给了 Phase Agent 合法权限去 claim 和执行搜索 task。`delegates.to: "sub-agent"` 只是一个建议——没有代码强制执行它。

同时，`operate-queue claim` 的 `--actor` 参数默认为 `main-agent`，且**不校验 actor 是否匹配 task card 的 controller**。Phase Agent 用 `--actor main-agent` claim 任何 task 都行。

### 为什么 Sub-agent 实际没 spawn

在这次执行中：
- Wave0: Phase Agent 自己做了 5 个 topic 的 WebSearch，直接写 source.yaml
- Wave1: Phase Agent 自己做了 deepening，写 evidence-summary（后被覆盖为克隆）
- Wave2: 尝试 spawn 了 3 个 dpt-topic-scout，2 个超时（中文域名 WebFetch 限制），1 个成功但结果直接 ingest 了，没走 relay 的 _cache 写入

核心问题：**Sub-agent spawn 是可选的，不是强制的。Phase Agent 可以跳过它，跳过之后 _cache 就没人写。**

## 修复方向

### 1. Task card 模板：改 controller

在所有搜索类 task card 中，`controller` 从 `"main-agent"` 改为 `"sub-agent"`：

```
涉及文件:
  - phase-wave0.md §3.1 (primary intake task card)
  - phase-wave0.md §3.3.1 (supplementary re-fill task card)
  - phase-wave1.md §3.1 (primary deepening task card)
  - phase-wave1.md §3.3.2 (supplementary re-fill task card)
  - phase-wave2.md §3.3.1 (backing/depth/emergent supplementary task cards)
```

### 2. operate-queue：校验 controller

`claim` 命令增加校验：task card 的 `targets.controller` 必须匹配 `--actor` 参数。不匹配 → 拒绝 claim。

```
修改文件:
  - DPT_FRAMEWORK/cli/operate-queue.mjs
  - DPT_FRAMEWORK/engine/queue-manager.mjs (claim 函数)
```

### 3. phase doc：明确 Phase Agent 不能自己做搜索

在 phase-wave0/1/2 的 Anti-Cheating Rules 中增加：
"禁止 Phase Agent 在 controller=sub-agent 的 task 上自己做 WebSearch/WebFetch。搜索必须走 Sub-agent relay。"

## 与其他 bug 的关系

- **Bug #001**（假 reference 文件）：reference 造假 + _cache 缺失 = 证据链两端都断了。reference 是"产出端"造假，_cache 是"来源端"缺失。两者叠加意味着既无法信任产出，也无法追溯到来源。
- 如果 Sub-agent relay 强制执行，Sub-agent 需要产出真实的 reference 文件 + 写 _cache。Count floor 压力仍可能导致 Sub-agent 造假，但至少 _cache 里有原始搜索数据可以审计。

## 日期

2026-06-28
