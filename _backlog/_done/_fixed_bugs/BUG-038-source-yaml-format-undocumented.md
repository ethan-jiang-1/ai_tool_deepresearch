# BUG-038: `artifacts/waveN/{topic}/source.yaml` 格式未文档化——Agent 连续 4 次尝试才写出合法文件

## 严重程度
P1 — Phase Agent 反复写出不合法的 source.yaml 格式，导致 gate `per_topic_reference_schema_valid` 和 `per_topic_count_floor` 连续失败。从第一次写出到 gate 接受，经历了 5 次格式修正。

## 复现

### 第一次尝试：内联 YAML 格式（失败）
```yaml
# source.yaml
wave: 0
topic: 01_aidlc-origin-provenance
sources:
  - url: "..."
    tier: tier_1; trust: high; substance: substantive  ← 分号分隔，非法 YAML
```
Gate 报错：`Nested mappings are not allowed in compact mappings`

### 第二次尝试：对象包装 + key_data 含特殊字符（失败）
```yaml
sources:
  - url: "..."
    key_data: "Canonical definition. 3 phases: Inception→Construction→Operations."
    # ↑ 冒号被 YAML 解析为 mapping separator，→ 字符导致 parse error
```

### 第三次尝试：对象包装格式（失败）
```yaml
wave: 0
topic: 02_aidlc-core-model
sources:
  - url: "..."
    ...
```
Gate 报错：`Cannot read or parse YAML array` — 因为 `readYamlArraySafe` 期望**顶层是数组**，不是 `{ sources: [...] }` 对象。

### 第四次尝试：顶层数组格式（成功，但缺字段）
```yaml
- url: "..."
  title: "..."
  tier: tier_1
  trust: high
  substance: substantive
  key_data: "..."
```
文件可解析，但 gate 报错：`[0.retrieved_date] expected string, received undefined; [0.topic_tag] expected string`

### 第五次尝试：补全 required 字段（成功）
添加 `retrieved_date: "2026-07-07"` 和 `topic_tag: "origin"` 后通过。

## 根因分析

1. **source.yaml 的 schema contract 未在 phase-wave0.md 中明确说明**。Phase Agent 不知道：
   - 文件必须是顶层 YAML 数组（不是 `{ sources: [...] }` 对象）
   - 每个 entry 的 required fields：`url`, `title`, `retrieved_date` (YYYY-MM-DD), `topic_tag`
   - gate 会通过 `Array.isArray(parsedYaml)` 判断文件是否为合法数组格式

2. **reference 文件的 metadata 格式完全不同于直觉**。直觉上会用 YAML frontmatter (`---`)，但 gate 的 `parseReferenceMetadata()` 只解析 bullet metadata 格式 (`- key: value`)。

## 建议修复

1. **在 `phase-wave0.md` §4 (Expected Artifacts) 中明确 source.yaml 的 required schema**：
   - 必须是顶层 YAML 数组
   - 每个 entry 最小字段集：`url`, `title`, `retrieved_date`, `topic_tag`
   - 推荐字段：`tier`, `trust`, `substance`, `key_data`

2. **在 `shared-reference-template.md` 中明确 reference 文件的 bullet metadata 格式**（非 YAML frontmatter）

3. **gate `readYamlArraySafe` 的错误信息应更友好**：当前 "Cannot read or parse YAML array" 对 Agent 没有足够的修复指向性。建议改为 "source.yaml must be a top-level YAML array (entries starting with '- '). Found object with keys: wave, topic, sources"

## 发现时间
2026-07-07，aidlc-investigation run，wave0 phase
