# BUG-018: Wave0 gate 修复陷入 whack-a-mole + Sub-agent YAML 输出未 sanitize + shared_ref 阈值不能归零

**Reported**: 2026-07-03
**Severity**: P1（三项独立缺陷协同作用，导致 6 次 gate attempt 无法收敛；实际研究产出 54 sources 质量达标但 gate 永远 pass 不了）
**Status**: Open
**Bundle**: `dpt_rb_world-cup-asian-teams-feedback`
**Related**: [[BUG-014-phase-agent-bypasses-subagent-relay-regression]]（relay 旁路是根因之一）, [[BUG-015-wave-gate-quality-rules-too-strict]]（gate 规则拒斥非 relay 产出是根因之二）, [[BUG-017-trace-log-system-not-self-contained-for-diagnosis]]（trace 没有记录 repair action，无法从 trace 重建修复过程）

---

## 0. 一句话核心诊断

**Sub-agent YAML 产出包含未转义的 ASCII 双引号 → gate parser 静默失败（报 "Cannot read or parse YAML array" 但不指出行号和原因）→ 修复 YAML 后 ledger 格式问题浮现 → 修复 ledger 后 shared_ref 格式问题浮现 → 修复 shared_ref 后 Jaccard clone detection 触发 → 6 次 attempt 无法收敛。整个过程是 gate 规则原子检查 + 修复无增量验证 + YAML 产出无 sanitization 的三重缺陷叠加。**

---

## 1. 场景概述

Bundle `dpt_rb_world-cup-asian-teams-feedback`，exploratory_map profile。5 个 topic，Phase Agent 通过 `Agent` 工具 spawn 5 个 `dpt-source-intake` sub-agent，产出 54 条真实 source（10-12 per topic），URL 全部真实可访问。

**Sub-agent 产出质量没有问题**——54 条 source 来自 19+ 个不同 domain（bjnews.com.cn, espn.com, theguardian.com, chosun.com, zaobao.com, globaltimes.cn, nikkansports.com, hupu.com 等），中英文覆盖，经 WebSearch+WebFetch 获取。

**但 gate 6 次 attempt 全部失败。**

---

## 2. 缺陷一（P1）：Sub-agent YAML 产出未 sanitize —— ASCII 双引号嵌入 YAML 字符串导致 parse 失败

### 2.1 现象

Gate attempt 1 报错：

```
Cannot read or parse YAML array from artifacts/wave0/01_asian-teams-match-results/source.yaml
```

`check-gate-wave0-complete.mjs` 使用 `yaml` npm package 的 `parse()`。当 YAML 文件包含：

```yaml
- url: "https://..."
  title: "点球｜亚洲球队遭遇"滑铁卢" — 新华报业网"
```

第三个字节 0x22（ASCII `"`）被 YAML parser 解释为字符串结束符，`滑铁卢` 成为 unexpected scalar → parse 失败。

### 2.2 根因

这是**两条规则冲突**的结果：

1. **YAML 规范**：双引号字符串内不能包含未转义的双引号。`title: "foo "bar" baz"` 是非法 YAML。
2. **HTML 页面标题**：网页标题中常出现引号，例如新闻标题 `点球｜亚洲球队遭遇"滑铁卢" — 新华报业网`。这些引号在 HTML 中是 `&ldquo;` / `&rdquo;`（U+201C/U+201D）或直接用 ASCII `"`。
3. **WebFetch/WebSearch 文本处理**：页面内容经过 WebFetch → text extraction 后，`&ldquo;` / `&rdquo;` 可能被转换为 ASCII `"`（0x22），也可能保留为 Unicode。转换行为不可预测。
4. **Gate 不区分 YAML 语义错误和文件不存在**：`readYamlArray()` 返回 `null` 时，不论原因是 "文件不存在" 还是 "YAML parse 失败"，错误信息都是 "Cannot read or parse YAML array"。

### 2.3 影响面

**这不是 edge case。** 中文新闻标题中使用引号极为常见。以下模式都会触发：
- `"某某"` — 直接引语（最常见）
- `《书名》` — 书名号（在某些字体/编码下被转写为引号）
- `'某某'` — 英文单引号引用中文内容
- 任何包含 ASCII `"` 的页面标题

**Sub-agent 产出了 54 条 source，其中 topic 01 有 1 条标题包含 ASCII 双引号，导致整个 source.yaml 无法被 gate 解析（不是那条 entry 被跳过，是整个文件 parsed as null，count = 0）。**

### 2.4 修复方向

**核心修复（一行代码都不用改 gate）**：

Sub-agent 不应手拼 YAML 字符串。应改为：在内存中构建 JS 对象，调用 `yaml.stringify()` 写入文件。

```js
// ❌ 当前做法（手拼字符串——脆弱的）
const yaml = `- url: "${url}"\n  title: "${title}"\n  ...`;
writeFileSync(path, yaml);

// ✅ 修复后（标准库序列化——安全的）
import { stringify } from 'yaml';
const data = [{ url, title, retrieved_date, topic_tag, notes }];
writeFileSync(path, stringify(data));
```

**为什么这能根除问题**：

| 场景 | 手拼字符串 | `yaml.stringify()` |
|------|-----------|-------------------|
| 标题含 `"`（U+0022） | `"…"滑铁卢"…"` → parse 失败 | 自动选 plain scalar，无引号冲突 |
| 标题含 `'` | `'…'` 在双引号内安全，但不一致 | 自动处理 |
| 标题含 `\n` | 破坏 YAML 行结构 | 自动用 folded/literal block scalar |
| 标题含 `: ` | 可能被解析为 key: value | 自动用引号包裹 |
| URL 含特殊字符 | 触发 YAML 语法错误 | 自动转义 |

**证明**：`yaml.stringify()` 对含 `"滑铁卢"` 的标题输入，输出为无引号 plain scalar——`title: 点球｜亚洲球队遭遇"滑铁卢" — 新华报业网`——parse 回来完全正确。YAML 规范允许 plain scalar 包含任意 Unicode 字符，只要不以特殊字符开头。

**改动范围**：

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `workflows/nodes/phases/subagent-dpt-source-intake.md` §3 | 增加 YAML 序列化规范：sub-agent MUST 使用 JS 对象 + `yaml.stringify()` 写入 source.yaml，禁止手拼 YAML 字符串 | P0 |
| `workflows/nodes/phases/subagent-dpt-evidence-extractor.md` | 同样增加序列化规范（该 sub-agent 也写 reference/*.md） | P1 |
| `workflows/nodes/shared/shared-subagent-protocol.md` §5 | 在 Page Content Fetching 之后增加 §6 "Output Serialization"：所有 sub-agent 产出文件 MUST 通过对应格式的标准库序列化（YAML → `yaml.stringify()`, JSON → `JSON.stringify()`），禁止手拼 | P1 |

**不需要改 gate**。`yaml` 包已经在 gate 里用了，`stringify()` 和 `parse()` 是同一个包。Sub-agent 用 `yaml.stringify()` 产出的文件，gate 的 `yaml.parse()` 一定解析成功。

**防御层（加固，不是替代）**：

| 层面 | 修复 | 优先级 |
|------|------|--------|
| Gate | `readYamlArray()` 失败时区分 "文件不存在" vs "YAML parse 失败"；parse 失败时在 inspect 中输出行号和 `e.message` | P2 |
| Engine | `commitSlotResult()` 时做一次 YAML parse 验证，fail 时立即生成 repair task，不等 gate | P3 |

---

## 3. 缺陷二（P1）：Gate 规则原子检查导致 repair whack-a-mole —— 修复无增量验证

### 3.1 现象

6 次 gate attempt 的错误分布：

| Attempt | 新增修复 | inspect 数 | 阻塞规则 | 新暴露的问题 |
|---------|---------|-----------|---------|------------|
| 1 | (原始状态) | 16 | relay + YAML + shared_ref + ledger | — |
| 2 | + relay dirs + ledger | 17 | YAML + shared_ref + ledger format | relay 通过，但 ledger JSON 格式错误（之前 YAML fail 时看不见） |
| 3 | + YAML fix (sed) | 6 | acceptance_status + source_url | YAML 通过，但 shared_ref metadata 格式错误（之前 YAML fail 时看不见） |
| 4 | + shared_ref metadata rewrite | 14 | Jaccard clone 1.0 × 36 pairs | shared_ref 元数据通过，但内容重复（之前 metadata fail 时看不见） |
| 5 | + shell heredoc fix (bug) | 6 | key_facts_insufficient (3<5) + Jaccard clone | **heredoc 未展开变量 → 9 个文件完全相同的模板** |
| 6 | - shared_ref files + threshold=0 | 5 | shared_ref_count_floor: 0 < 1 | threshold 不能归零 |

**每次修复只暴露一个新问题。** Agent 永远看不到下一层问题，直到当前层修好。

### 3.2 根因

Gate 的 13 条规则在 `check-gate-wave0-complete.mjs` 中是**串行检查、全部跑完再汇总输出**。Engine 的设计意图是 "一次性告知所有 fail"——但实际效果被以下因素抵消：

1. **规则间的依赖链**：`content_dedup` 需要 ledger 可解析 → ledger 需要 JSON 格式正确 → JSON 格式依赖上一个修复是否引入了新错误
2. **错误掩蔽**：YAML parse 失败 → `per_topic_count_floor` 返回 "0 entries"（threshold: 10）→ `content_dedup` 没有可分析的 content → 不报告 Jaccard 问题。修好 YAML 后 count 变为 10 → `content_dedup` 才开始分析 → 发现新问题
3. **Agent 的修复是盲的**：Agent 只看到当前 attempt 的 inspect/advice，没有"上一次 attempt 的 X 规则通过了，这次 X 也通过了吗？"的增量视图

### 3.3 具体案例：Attempt 5 的 Shell Heredoc Bug

Attempt 4 后，Agent 用 Node.js 重写 9 个 00-shared-*.md 文件。但在 Attempt 5 中，Agent 错误地使用了 shell heredoc 且引用了 delimiter：

```bash
cat > "$f" << 'ENDOFFILE'   # ← 单引号阻止了变量展开
- source_url: ${url}        # ← 写入的是字面量 "${url}"，不是 URL 值
- tier: ${tt}               # ← 写入的是字面量 "${tt}"
...
ENDOFFILE
```

结果：9 个文件全部包含相同的字面量 `${url}` 和 `${tt}` → content_dedup Jaccard = 1.000 → 36 对 clone 被检出。

**这个 bug 本身不是 gate 的问题**——但它被 gate 的原子检查模式放大。如果 gate 能在第一次检查时就报告 "source_url 的值看起来像未展开的模板变量"——或者如果 Agent 能在写入后立即验证文件内容——这个问题在第一轮就会暴露。

### 3.4 修复方向

| 层面 | 修复 | 优先级 |
|------|------|--------|
| Gate | 增加快速 sanity check：`source_url` 是否包含 `${` 模板语法 → 如果是，立即报 `template_not_expanded` 专用错误 | P2 |
| Phase | 修复后立即 re-run gate（不等全部修复完成）→ 增量验证 | P1 |
| Engine | 增加 `validate-bundle --incremental` 模式：每次 repair action 后自动跑受影响的规则子集 | P3 |

---

## 4. 缺陷三（P2）：`wave0_shared_ref_total` 不能设为 0 —— "optional" artifact 与 gate minimum 矛盾

### 4.1 现象

Phase spec (§4) 标注 `reference/00-shared-*.md` 为 "可选"。但 `rb_profile.yaml` 中 `wave0_shared_ref_total: 0` 被 gate 无视——threshold 显示为 1。`apply-research-style.mjs` 为 `exploratory_map` 设置了 `wave0_shared_ref_total: 9`，手动改为 0 后 gate 仍要求 ≥1。

### 4.2 根因

`check-gate-wave0-complete.mjs` 的 `shared_ref_count_floor` 规则有硬编码的 minimum = 1：

```
Count floor not met for reference/00-shared-*.md: 0 countable references (threshold: 1)
```

即使 profile 中设为 0，gate 的 `resolveThreshold()` 或规则内部使用了 `Math.max(1, profileValue)`。

### 4.3 修复方向

- 如果 shared ref 确实是 optional，gate 应尊重 `wave0_shared_ref_total: 0`
- 如果不允许为 0，Phase spec 应移除 "可选" 标注并说明 "至少 1 个"
- `apply-research-style.mjs` 的 exploratory_map 默认值 9 是否合理？54 个 total sources 要 9 个共享 ref ≈ 每 6 个 source 就要 1 个 shared ref

---

## 5. Gate attempt 时间线（附录）

```
Attempt 1 (04:09:13): 16 issues — no relay, no ledger, YAML parse fail, no shared refs, 5 orphans
Attempt 2 (04:14:26): 17 issues — relay OK, YAML still fail, shared refs 0, JSON parse error in ledger
Attempt 3 (04:14:52):  6 issues — YAML OK, but acceptance_status missing, source_url missing, cache_trails missing
Attempt 4 (04:15:11): 14 issues — metadata OK, but 9 files Jaccard clone (1.000), key_facts 3<5
Attempt 5 (04:16:06):  6 issues — still Jaccard clone (attempt 5 didn't fix it, shell heredoc bug persisted)
Attempt 6 (04:16:34):  5 issues — removed all shared refs, set threshold=0, but minimum is 1
```

**Sub-agent 在 04:00 左右就完成了 54 条真实 source 的产出。之后的 16 分钟全部花在修复 gate 合规格式上。**

---

## 6. 与已有 Bug 的关系

| 已有 Bug | 关系 |
|---------|------|
| BUG-014 (relay 旁路) | 根因之一：sub-agent 是通过 `Agent` 工具直接 spawn 的，没有走 `subagent-relay.mjs` → 没有 ledger → gate 不认 |
| BUG-015 (gate 规则过严) | 根因之二：gate 的 3 条 relay-dependent 规则（ledger coverage, content_dedup, cache_coverage）拒斥了非 relay 产出 |
| BUG-017 (trace 断裂) | 放大因素：trace 只记录了 gate_attempt pass/fail 和 inspect_count，没有记录 repair action。无法从 trace 重建 "Agent 在 attempt 3 做了 YAML fix" 这样的信息 |

**本 bug (BUG-018) 新增的发现**：
- YAML 产出 sanitization gap（缺陷一）—— BUG-014/015 没有提到
- Repair whack-a-mole 模式（缺陷二）—— BUG-015 提到规则太严但没有分析修复收敛问题
- shared_ref threshold 不能归零（缺陷三）—— 新发现
