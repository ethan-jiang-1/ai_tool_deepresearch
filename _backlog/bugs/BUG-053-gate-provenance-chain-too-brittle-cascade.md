# BUG-053: Gate provenance chain 过于脆弱，单一文件缺失触发全链 distrust

## 严重程度
P0 — 质量流程自身的崩溃。这是最高级别的缺陷：Gate 的职责是控制质量，但当前 gate 的脆弱逻辑本身就是整个系统最大的质量风险源。一个 root cause（如 content_dedup 假阳性）触发 6 条规则级联失败（`cache_coverage` → `ledger_record_hash` mismatch → `wave0_work_unit_ledger_exists` → `wave0_work_unit_output_coverage` → `wave0_work_unit_submission_presence` → `wave0_delegated_bypass_suspected`），原始根因淹没在噪音中。更致命的是：controller 被逼到墙角后试探性修复，方向一错就反过来主动破坏 ledger、cache、queue —— gate 不是没守住质量，是主动摧毁了质量。

## 复现

在 `engelberg-tech-retreat-2026` run 中：

1. `content_dedup` 规则将 `robert-glaser.de/agentic-engineering-thoughtworks-paper-loops/` 误判为 homepage URL（BUG-050）
2. Agent 尝试修复：`rm -rf _cache/wave0/primary/04_outputs-conclusions-followups/robert-glaser-same-loop`
3. 删除后重跑 gate：

```
之前（cache 完整）:
  FAIL: shared_ref_count_floor, content_dedup  ← 2 条

之后（cache 缺失）:
  FAIL: shared_ref_count_floor
  FAIL: cache_coverage                          ← 直接后果
  FAIL: wave0_work_unit_ledger_exists           ← 级联
  FAIL: wave0_work_unit_output_coverage         ← 级联
  FAIL: wave0_work_unit_submission_presence     ← 级联
  FAIL: wave0_delegated_bypass_suspected        ← 级联
  + ledger_record_hash mismatch × 5            ← 级联（因为 Agent 被迫手动修 ledger）
```

从 2 条 → 6 条 + 5 个 hash mismatch。原始 root cause（content_dedup 假阳性）完全消失在了噪音中。

4. 恢复需要：找到 `stableStringify` → 理解 `hashValue` → 读 `buildLedgerRow` 源码 → 从 work-unit index + result.json 逐行重建 ledger → 重建缺失的 cache 文件 → 重跑 gate。这是 forensic reconstruction，不是正常运维。

## 根因分析

### 为什么一级联就全塌

gate 的规则之间有隐式依赖链：

```
cache 文件缺失
  → cache_coverage fail（规则检查文件存在性）
    → Agent 尝试修 ledger（删除缺失 cache 的引用）
      → ledger_row 内容变化
        → ledger_record_hash != 原始值
          → readWorkUnitLedgerRows 抛出 "hash mismatch for ALL rows"
            → wave0_work_unit_ledger_exists fail（"No submitted ledger rows found"）
              → wave0_work_unit_output_coverage fail（"outputs not covered by ledger"）
                → wave0_work_unit_submission_presence fail
                  → wave0_delegated_bypass_suspected fail
```

**每一层都是上一层的结果，但 gate 把它们平铺为并列的 `failed_rule_ids[]`，Agent 看不到依赖图。**

### 为什么 Agent 修不好

1. **Advice 没有优先级。** 6 条 failure 产生 15 条 advice，Agent 无法区分哪个是 root cause、哪个是 symptom
2. **Advice 引导 Agent 做更多破坏。** "Repair work-unit submit/index/ledger drift" → Agent 手动改 ledger → 更多 hash mismatch
3. **没有 "回到已知好状态" 的路径。** 没有 CLI 能做 `restore-ledger-from-index`。Agent 必须自己实现 `stableStringify` + `hashValue` 来重建——这是框架内部的实现细节

### 设计问题

Provenance chain 的设计是正确的（防止伪造），但它在 **degraded operation** 场景下过于刚性：
- 一个 cache 文件缺失不意味着整个 work unit 的 provenance 是假的
- `cache_coverage` fail 不应该让 `ledger_record_hash` 变成 mismatch——这两个是完全独立的检查
- Gate 应该在报告 cache 缺失的同时，仍然接受那些 hash 正确的 ledger rows

## 设计原则：KISS — Gate 是质量守护者，不是质量风险源

Gate 的定位是**控制质量**——确保 Agent 产出的东西符合最低标准。但当前的 gate 本身成了最大的质量风险源：

- **脆弱的规则（content_dedup、cache_coverage、ledger_record_hash）一旦假阳性，controller（主 Agent）就会挣扎。** Controller 不知道哪个规则是真 fail、哪个是级联症状，advice 按字母序平铺，没有优先级。
- **Controller 挣扎 → 试探性修复 → 方向错了 → 越修越烂。** 修 content_dedup → 删 cache → cache_coverage fail → 改 ledger → hash mismatch → 全链 distrust。Controller 不是恶意的，它是被脆弱的 gate 逼到墙角乱撞。
- **最终状态全面漂移：queue 卡死、ledger 损坏、work unit 终端态但 queue 未同步、gate 的 inspect/advice 全是症状噪音。** Controller 面对的是一个所有信号都错位的系统——它不知道该往哪个方向走，因为每个方向都是错的。

**Gate 的逻辑必须保持 KISS（Keep It Simple, Stupid）。** 每一条 rule 都要问自己：

1. **这条 rule 的假阳性概率是多少？** 如果 >5%，它就没资格做 blocking rule
2. **如果它 false-fail，controller 的第一个修复动作会是什么？** 如果那个动作可能造成级联破坏，这条 rule 必须降级为 advisory diagnostic
3. **这条 rule 有没有独立于其他 rule 的 pass/fail 路径？** 如果有隐式依赖，必须拆开
4. **这条 rule 能否被 controller 自己验证和修复？** 如果 controller 修不了（比如需要 `stableStringify` + `hashValue` 重建 ledger），那 fail 了就 fail 了，再跑 50 次也 pass 不了——gate 变成了 permanent blockade

**一个质量控制系统，如果自身的逻辑有 bug，就不只是"没守住质量"——它会主动破坏质量。** Ledger 被写坏、cache 被误删、queue 状态错位——这些不是 Agent 恶意操作，是脆弱 gate 把 Agent 逼到墙角后的必然结果。

## 建议修复

### P0 — 规则去耦合 + 移除脆弱规则

1. **`cache_coverage` fail 不应级联到 ledger 检查。** Gate 应该：
   - 独立验证 ledger hash（与 cache 无关）
   - 独立验证 cache 存在性
   - 分别报告两个结果
   - 不因为 cache 缺失而 distrust ledger

2. **Agent 修改 ledger 删除缺失 cache 时，gate 应提供 `--recompute-hash` 模式。** 如果 Agent 需要从 ledger 中移除一个缺失的 cache trail（这是合法操作），gate 应该支持重新计算 `ledger_record_hash`：
   ```bash
   node DPT_FRAMEWORK/cli/operate-work-unit.mjs recompute-ledger-hash <bundle> --work-id <id>
   ```
   这会更新 work-unit index 中的 `ledger_record_hash` 以匹配修改后的 ledger row。

### P1 — Advice 优先级和依赖图

3. **Gate 输出应区分 root cause 和 symptom。** 在 `inspect[]` 中标记级联关系：
   ```json
   {
     "rule_id": "wave0_work_unit_ledger_exists",
     "caused_by": ["cache_coverage"],
     "is_root_cause": false
   }
   ```

4. **Advice 按 root cause 排序。** Root cause 的 advice 排在最前面，symptom 的 advice 标记为 "may resolve when root cause is fixed"。

### P2 — 恢复工具

5. **提供 `restore-ledger-from-index` CLI。** 从 work-unit index + result.json 重建 `rb_output_declarations.jsonl`：
   ```bash
   node DPT_FRAMEWORK/cli/operate-work-unit.mjs rebuild-ledger <bundle>
   ```

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，修复 content_dedup 时触发

## content_dedup：最脆弱的触发源，应直接移除

### 为什么 content_dedup 是 cascade 的第一推手

`content_dedup` 规则（`gate-helpers-checks.mjs:209`）的实现有三个极度脆弱的检查，任何一个假阳性都是整个 provenance chain 崩盘的导火索：

1. **Homepage URL 检测**（`isHomepageUrl`, line 79-87）。判断逻辑：URL path 去掉末尾斜杠后，如果 `depth < 2` 就是 homepage。这意味着任何 `/article-slug/` 形式的合法文章 URL（depth=1）都会被误判为 homepage。BUG-050 就是这个——`robert-glaser.de/agentic-engineering-thoughtworks-paper-loops/` 是一篇真实博文，但 depth=1，被标记为 homepage。

2. **Jaccard 文本相似度 ≥ 0.8**（line 210）。对 `reference/*.md` 的 Key Facts section 做 Jaccard 相似度检测。阈值 0.8 是拍脑袋的——两个 sub-agent 如果引用同一篇源文章的不同段落，Key Facts 有大量重叠是完全正常的，不代表是 template-generated 作弊内容。

3. **Self-Referential Language 检测**（line 291-295）。用正则匹配 "this reference supplements"、"本文档用于" 等元语言。这批正则是枚举式的，既不全也不准——很容易漏掉真正的模板文件，也容易误伤正常文件。

### 这些检测一旦有 bug，后果不是"这一个规则 fail"

`content_dedup` fail → Agent 收到 advice "Replace homepage URL" → Agent 去修 → 修的路径经常是删 cache → `cache_coverage` fail → Agent 修 ledger → `ledger_record_hash` mismatch → 全链 distrust（见上面 §复现）。

**一个 depth 数的 bug 就能让这 case 过不去 gate。历史上 `content_dedup` 的做法是项目不成熟阶段的产物——当时不确定 sub-agent 会不会作弊，所以加了一层薄弱的检测。现在 sub-agent 产出的质量已经有 work-unit submit + runtime receipt + output contract 三层验证，`content_dedup` 的增量价值几乎为零，但破坏力巨大。**

### 建议：直接从 gate rule 中移除 content_dedup

- `isHomepageUrl` 的 `depth < 2` 太粗糙——正常文章 URL 经常 depth=1。修它没意义，因为 homepage 检测本身对 research quality 不重要（一个 homepage URL 若包含会议基本信息，为什么不算有效的 evidence source？）
- Jaccard 相似度检测放到 gate 里不合适——它应该是 Agent 自查工具（"嘿，你这两篇 reference 的 Key Facts 有 85% 重叠，确认一下不是复制粘贴？"），不是 blocking gate rule
- Self-referential language 检测也是 Agent 自查层的事，不应该成为 gate block

**移除方案**：
- Wave0 gate: `check-gate-wave0-complete.mjs:393` 删掉 `content_dedup` 分支
- Wave1 gate: `check-gate-wave1-complete.mjs:377` 同样删除
- `gate-helpers-checks.mjs` 中 `checkContentDedup` 函数保留（不删代码），但不再作为 gate rule 被调用——可以改为 `operate-work-unit inspect` 中的 diagnostic warning，不 blocking

### 不移除的后果

只要 gate 里还有 `content_dedup`，任何一个 depth=1 的合法 source URL 就会：
1. content_dedup fail
2. Agent 尝试修 → 牵动 cache/ledger
3. 触发 BUG-053 全链 cascade
4. Gate 不可通过 → Agent 卡死或跳过 phase（BUG-048, BUG-049）

这是一个**确定性 cascade 触发器**——不是偶发 bug，是每当 URL 恰好 depth<2 就必然触发。而这种情况在真实 source 收集中极其常见。

## 关联
- [[BUG-050]] — content_dedup 的 homepage 检测假阳性的具体案例
- [[BUG-051]] — 下游：手动修 ledger 触发更多 distrust
- [[BUG-048]] — 根因：没有降级路径，Agent 被迫在 gate 上反复尝试
