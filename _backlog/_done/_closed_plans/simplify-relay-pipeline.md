# Plan: 化簡 Relay Pipeline — 讓正道比捷徑更容易

**建立**: 2026-07-03
**來源 bugs**: BUG-014 (relay 旁路), BUG-015 (gate 質量規則過嚴), BUG-016 (queue 跨 bundle 污染), BUG-017 (trace 三層斷裂)
**關聯 change**: `openspec/changes/harden-relay-pipeline/`
**目的**: 寫清楚化簡邏輯，請另一個 Agent review 這個 design 是否有漏洞

---

## 1. 你到底要解決什麼問題

這個系統的核心矛盾一句話：**正道（relay pipeline）比捷徑（Phase Agent 直接搜索寫文件）難走十倍。**

Phase Agent（LLM）在執行研究任務時，有兩條產出路徑：

| | 正道 | 捷徑 |
|---|---|---|
| 步驟 | 10+ | 3 |
| 依賴 | queue-manager + subagent-relay + operate-queue + slot 狀態機 | 無 |
| 失敗機率 | 中等 | 極低 |
| Gate 能區分嗎 | — | **不能** |

只要捷徑存在且更短，Agent 就會走捷徑。這不是 compliance 問題——這是物理問題。修復方向不是「更嚴厲地告訴 Agent 不要走捷徑」，而是**拆掉捷徑**（讓不走 relay 的產出無法通過 gate）+ **鋪平正道**（讓 relay 比直接搜索更容易走）。

此前兩次修復（BUG-006 改 task card controller、harden-stop-contract 改靜默紀律）都是「約束 Agent 行為」。但根因是系統設計讓正道太難走。

---

## 2. 當前 Pipeline 的完整複雜度盤點

把整個 relay pipeline 從入口到出口的所有檢查點列出來，標明每個檢查的目的是什麼、有沒有 false positive、該不該留在這個位置。

### 2.1 Queue enqueue（入口）

| # | 檢查 | 層 | 做什麼 | 問題 |
|---|------|----|--------|------|
| 1 | QueueItem Zod schema | Engine | 校驗 20+ fields（work_id, targets, producer_rule, etc.） | 無。結構性正確是必要的 |
| 2 | topic_registry 一致性 | Engine (new) | enqueue 時驗證 task card 的 topic slug 在 rb_plan.md 的 topic_registry 中存在 | 無。防止 BUG-016 跨 bundle 污染 |
| 3 | bundle_name 一致性 | Engine (new) | 所有 operate-queue 操作前驗證 queue 的 bundle_name 匹配 rb_status.json | 無。防止 queue 文件被錯誤復用 |

Queue 層的檢查全部保留。它們都是結構性的（「這個 task card 屬於這個 bundle 嗎？」），不涉及內容品質判斷。

### 2.2 Relay commitSlotResult（執行 — 當前狀態）

| # | 檢查 | 層 | 做什麼 | 問題 |
|---|------|----|--------|------|
| 4 | Zod schema 校驗 | Engine | 校驗 SlotResult 結構（slotKey, roleAgentKey, output_files[], cache_trails[]） | 無 |
| 5 | output_files path escape | Engine | 拒絕絕對路徑和 `..` 逃逸 | 無 |
| 6 | cache_trails path escape | Engine | 同上 | 無 |

當前 relay 只做 schema + path safety。其他的品質檢查全在 gate。這導致 relay 旁路後 gate 變成唯一的品質防線——但 gate 的品質檢查假設 relay 格式，非 relay 產出被誤殺。

### 2.3 Gate wave0-complete（出口 — 當前狀態）

| # | 規則 | Check type | 做什麼 | 該不該留在 gate |
|---|------|-----------|--------|-----------------|
| 7 | reference_index_md_exists | file_exists | reference/_INDEX.md 存在 | ✅ 結構檢查 |
| 8 | reference_readme_exists | file_exists | reference/README.md 存在 | ✅ 結構檢查 |
| 9 | reference_dir_exists | dir_exists | reference/ 目錄存在 | ✅ 結構檢查 |
| 10 | shared_ref_count_floor | count_floor | 00-shared-*.md ≥ threshold | ⚠️ **走 ledger**，relay 旁路後 fail |
| 11 | no_example_com_shared_ref_url | pattern_match (negate) | 沒有 example.com placeholder | ✅ 反作弊（negate pattern） |
| 12 | per_topic_source_yaml_exists | file_exists | artifacts/wave0/{topic}/source.yaml 存在 | ✅ 結構檢查 |
| 13 | per_topic_reference_schema_valid | schema_valid | source.yaml 通過 ReferenceMetadata schema | ✅ 結構檢查 |
| 14 | per_topic_count_floor | count_floor | source.yaml entries ≥ threshold | ✅ 結構檢查（filesystem YAML count） |
| 15 | status_current_gate | status_value | rb_status.json current_gate = wave0_complete | ✅ 狀態檢查 |
| 16 | status_next_gate | status_value | rb_status.json next_gate = wave1_complete | ✅ 狀態檢查 |
| 17 | content_dedup | content_dedup | Jaccard 相似度 ≥ 0.8 → 判定為 clone | ❌ **要移除** |
| 18 | cache_coverage | cache_coverage | _cache/ trail 存在且含三文件 | ❌ **降為 WARN** |

### 2.4 Gate wave1-complete（出口 — 當前狀態）

| # | 規則 | Check type | 做什麼 | 該不該留在 gate |
|---|------|-----------|--------|-----------------|
| 19 | wave1_dir_exists | dir_exists | artifacts/wave1 存在 | ✅ |
| 20 | per_topic_evidence_summary_exists | file_exists | evidence-summary.md 存在 | ✅ |
| 21 | per_topic_question_list_exists | file_exists | question-list.md 存在 | ✅ |
| 22 | per_topic_ref_md_count_floor | count_floor | reference/*{topic}*.md ≥ threshold | ⚠️ **走 ledger** |
| 23 | no_example_com_ref_url | pattern_match (negate) | 沒有 example.com | ✅ |
| 24 | reference_format | reference_format | 9 fields + 5 sections | ❌ **要移除** |
| 25 | source_url_article_level | reference_source_url_article_level | isHomepageUrl() → fail | ❌ **要移除** |
| 26 | key_facts_min_lines | reference_key_facts_min_lines | ≥ 5 bullet lines | ❌ **要移除** |
| 27 | ledger_coverage | reference_ledger_coverage | 文件在 ledger 中声明 | ❌ **合併到 ledger_exists** |
| 28 | question_list_has_four_sections | pattern_match | 四個 section 都存在 | ✅ 結構檢查 |
| 29 | source_url_present | pattern_match | evidence-summary 含 markdown link | ✅ 結構檢查 |
| 30 | key_findings_non_empty | pattern_match | Key Findings section 非空 | ✅ 結構檢查 |
| 31-33 | no_stale_*_token | pattern_match (negate) | backfill token 已替換 | ✅ |
| 34 | status_current_gate | status_value | current_gate = wave1_complete | ✅ |
| 35 | status_next_gate | status_value | next_gate = wave2_complete | ✅ |
| 36 | content_dedup | content_dedup | Jaccard | ❌ **要移除** |
| 37 | cache_coverage | cache_coverage | _cache/ trail | ❌ **降為 WARN** |

---

## 3. 逐項分析：什麼要砍、為什麼

### 3.1 content_dedup (Jaccard) — 砍掉

**當初為什麼加**：wave1 生產後發現同一個 topic 生成多個 reference 文件，內容一模一樣，只有文件名不同。加 Jaccard 檢查來檢測 clone。

**為什麼現在要砍**：

1. **False positive**：不同 topic 的 reference 由同一個 sub-agent 撰寫，文風相似，Jaccard 把它們判為 clone。BUG-015 中 15 個文件的 Key Facts 被 gate 判定 insufficient——事實上是 prose 格式而非 bullet 格式，內容完全不同。

2. **False negative**：稍微改幾個詞、調語序，Jaccard 就降到閾值以下。作為安全網它不可靠。

3. **放錯層**：Jaccard 在 gate 跑，Agent 已經花了 20 分鐘 spawn sub-agent、搜尋、寫文件，然後 gate 告訴它「產出是 clone，全部重來」。Agent 疲勞時從 Jaccard inspect（兩個文件名 + 一個數字）中無法理解「哪裡重複了」。如果在 relay slot 內檢測，slot 當場 fail，Agent 立刻知道。

4. **本質問題**：Jaccard 問的是「文本像不像」——但兩個不同來源說相似的事（例如都報導了同一場比賽結果），文本像但來源不同，這不是 bug。真正的重複問題是「兩個文件指向同一個來源 URL 但文件名不同」——這是 URL identity 問題，用 URL dedup 解決。

**替代方案**：URL-based dedup，在 relay 層做。

### 3.2 key_facts_min_lines (≥5 bullets) — 砍掉

**為什麼要砍**：

1. BUG-015 的實際案例：sub-agent 寫了 prose paragraph 而非 bullet list，內容品質很好（有事實、有數據、有來源），但 gate fail 因為 `0 bullets, need 5`。

2. Engine 不應該判斷「bullet 還是 prose」——這是寫作風格。內容品質是 HITL2 時人類判斷的，不是 engine 判斷的。Engine 的角色是「文件結構能不能被系統正確解析」，不是「文件寫得好不好」。

3. 如果真的要檢查 Key Facts 是否夠充實，應該檢查的是「Key Facts section 存在且非空」，不是「有幾條 bullet」。

**保留什麼**：Key Facts section 存在且非空的結構檢查（已在 `pattern_match` 中部分覆蓋）。

### 3.3 source_url_article_level — 砍掉

**為什麼要砍**：

1. `isHomepageUrl()` 有 false positive：`newsDetail_forward` 模式的 URL 明明是文章頁，但 path depth < 2 被誤判為 homepage。

2. Sub-agent 的 system prompt 已經要求它提取 article-level URL。Engine 不需要重複做 semantic judgment。

3. 某些合法來源的 URL 結構確實比較淺（如 `/news/2024-12345` 可能被判定為 homepage）。

**保留什麼**：source_url 非空且是合法 URL（已在 schema 中強制——`role=reference` 必須有 source_url，Zod `refine()` 檢查）。

### 3.4 reference_format (9 fields + 5 sections) — 砍掉

**為什麼要砍**：

1. 這是在檢查「sub-agent 有沒有按照模板寫作」，不是檢查「產出能不能被系統正確處理」。

2. 9 個 metadata fields（source_url, acceptance_status, source_type, tier, evidence_role, trust_level, why_it_matters, accessed_at, related_topic）中，真正對 provenance 關鍵的只有 source_url。其他是分類用的 metadata——缺失不影響系統正確性。

3. 5 個 sections（Key Facts, Core Content Capture, Relevance, Quotable Terms, Risks）中，缺失不影響系統解析——gate 的其他規則（pattern_match for example.com, schema_valid）已經覆蓋了關鍵的結構性問題。

4. BUG-015 中這條規則阻擋了內容完全正確的產出——因為 metadata block 格式和 YAML frontmatter 格式互斥，而 sub-agent 用了 frontmatter。

**保留什麼**：
- No YAML frontmatter（reference 文件不能用 frontmatter，因為和 metadata block 衝突）——這可以作為一個簡單的 negate pattern_match 保留在 gate
- source_url 非空——已在 schema 強制

### 3.5 cache_coverage — 從 FAIL 降為 WARN

**為什麼降級**：

1. Cache trail（websearch.json + page.md + meta.json）是**可重建的中間產物**。它不是證據本身——reference 文件（含 source_url）才是證據。

2. Sub-agent 做了真實搜索、產出了有真實 URL 的 reference 文件——cache 缺失不影響 evidence 的可追溯性。你仍然知道這個 reference 來自哪個 URL。

3. WARN 就夠了：告訴 Agent「cache 不完整，下次跑 relay 時確保 sub-agent 正確寫入 cache」。不應該因為 cache 缺失就 block 整個 phase。

4. BUG-015 中 cache_coverage 是最大的阻塞點之一——30+ 個 cache trail 缺失導致 gate fail。但這些 reference 文件都有真實 source_url，證據鏈是完整的。

**保留什麼**：WARN on cache trail 缺失或 incomplete。這提供診斷信息但不阻止進展。

### 3.6 ledger_coverage — 合併到 ledger_exists

**為什麼合併**：

`ledger_coverage` 檢查「每個 reference 文件是否在 rb_output_declarations.jsonl 中有對應的 entry」。
`ledger_exists` 檢查「rb_output_declarations.jsonl 是否存在且 ≥ N 行」。

如果 ledger 存在且行數正確（通過 relay `complete()` 正規寫入），那 reference 文件自然會被 declare。`ledger_coverage` 是多餘的——它是對同一個事實（「relay 被正確使用了」）的冗餘檢查。

**保留什麼**：`ledger_exists`（count_floor mode，threshold = topic_registry 長度）。

---

## 4. 化簡後的 Pipeline

### 4.1 Queue enqueue（3 個檢查，2 個 new）

```
Queue enqueue
├── QueueItem Zod schema              (existing — 結構正確性)
├── topic_registry 一致性              (new — 防 BUG-016)
└── bundle_name 一致性                (new — 防 queue 誤用)
```

### 4.2 Relay commitSlotResult（5 個檢查，2 個 new）

```
commitSlotResult
├── Zod schema 校驗                   (existing)
├── output_files path escape          (existing)
├── cache_trails path escape          (existing)
├── URL dedup within slot → FAIL      (new)
│   同 slot 內兩個 reference 文件的 source_url
│   normalize 後相同 → slot failed。
│   原因: 同一個 sub-agent 不應該對同一個 URL
│   產出兩個不同的 reference 文件。
└── cache trail WARN only             (simplified)
    cache trail 缺失或 incomplete → WARN 寫入 trace/log。
    不 block slot commit。
```

### 4.3 collectAndMergeSubagentResults（1 個 new）

```
collectAndMerge
├── collect results from slots        (existing)
├── cross-slot URL dedup → WARN       (new)
│   不同 slot 產出的 reference 文件指向同一個 URL。
│   可能是合法的（兩個 topic 引用同一個來源），
│   但如果大規模發生，表示 sub-agent 搜索策略有問題。
│   寫 WARN，不 block collection。
└── merge into workflow state         (existing)
```

### 4.4 Gate wave0-complete（8 條規則）

```
gate-wave0-complete
├── reference_index_md_exists         file_exists
├── reference_readme_exists           file_exists
├── reference_dir_exists              dir_exists
├── shared_ref_count_floor            count_floor (filesystem glob mode)
├── no_example_com_shared_ref_url     pattern_match (negate)
├── per_topic_source_yaml_exists      file_exists
├── per_topic_reference_schema_valid  schema_valid
├── per_topic_count_floor             count_floor (YAML array)
├── status_current_gate               status_value
├── status_next_gate                   status_value
├── ledger_exists                     (new — provenance)
└── subagent_dir_nonempty             (new — provenance)
```

### 4.5 Gate wave1-complete（12 條規則，移除 6 條）

```
gate-wave1-complete
├── wave1_dir_exists                  dir_exists
├── per_topic_evidence_summary_exists file_exists
├── per_topic_question_list_exists    file_exists
├── per_topic_ref_md_count_floor      count_floor (filesystem glob mode)
├── no_example_com_ref_url            pattern_match (negate)
├── question_list_has_four_sections   pattern_match
├── source_url_present                pattern_match
├── key_findings_non_empty            pattern_match
├── no_stale_mechanisms_token         pattern_match (negate)
├── no_stale_trends_token             pattern_match (negate)
├── no_stale_pending_questions_token  pattern_match (negate)
├── status_current_gate               status_value
├── status_next_gate                  status_value
├── ledger_exists                     (new — provenance)
└── subagent_dir_nonempty             (new — provenance)
```

移除的 wave1 gate 規則：content_dedup, cache_coverage, reference_format, source_url_article_level, key_facts_min_lines, ledger_coverage。

### 4.6 匯總對比

```
                  Before     After
Queue checks        1          3  (+2 input validation)
Relay checks        3          5  (+2 URL dedup + cache WARN, removed 0)
Gate wave0         13 →        11  (removed content_dedup, cache_coverage; added ledger_exists, subagent_dir_nonempty)
Gate wave1         21 →        14  (removed 6 quality rules; added 2 provenance)
                  ───        ───
Total (unique)    ~25        ~17  (unique check types across all layers)

Quality checks in gate:  7 → 0
Provenance checks:        0 → 2
```

關鍵變化：
- **gate 不再做品質判斷**（0 條 quality check）
- **relay 做 URL identity 檢查**（這是真正的重複檢測）
- **provenance 檢查進入 gate**（ledger_exists + subagent_dir_nonempty）
- **cache 降為診斷信號**（WARN 不 block）

---

## 5. 設計原則

### Principle 1: Gate 問 provenance，不問 quality

```
Gate 的職責:   「這些產出有沒有經過 relay？」
Gate 不該問:   「產出長什麼樣？」

品質是 sub-agent 的 system prompt 和 HITL2 人類審閱的責任。
Engine 的角色是確保執行路徑正確，不是確保寫作風格正確。
```

### Principle 2: URL identity > content similarity

```
重複檢測問:     「兩個文件指向同一個來源 URL 嗎？」
重複檢測不問:   「兩個文件的文本像不像？」

URL identity 是確定性的、零 false positive。
Content similarity 受寫作風格、語言、模板影響，false positive 不可避免。
```

### Principle 3: 在哪發現問題就在哪拒絕

```
relay slot 的問題 → commitSlotResult 拒絕（不等到 gate）
gate 的問題 → gate 拒絕

不要在 gate 重複檢查 relay 已經保證的東西。
不要讓 Agent 做完 20 分鐘的工作才被告知 slot-level 的錯誤。
```

### Principle 4: WARN 不 block

```
可重建的中間產物缺失 → WARN
不影響證據可追溯性的格式差異 → WARN

只有結構性缺失和 provenance 缺失才應該 block。
```

---

## 6. 潛在風險和邊界情況

### 6.1 如果 sub-agent 真的對同一個 URL 從不同角度寫了兩個文件呢？

合法場景：同一個長篇報告的不同章節，或者同一事件的不同方面。

回應：在 slot 內 URL dedup 只檢查**同一個 sub-agent slot** 內的產出。同一個 sub-agent 在同一個 slot 裡不應該對同一個 URL 產出兩個 reference 文件——如果內容真的需要分兩個文件，sub-agent 應該把它們合併成一個。跨 slot 的 URL 重複只是 WARN（不同 topic 引用同一個來源是正常的）。

### 6.2 沒有 Jaccard 後，如何檢測「文件名不同但內容完全一樣」？

這個問題的根因不是 content dedup 沒做好——根因是 relay 沒有被正確使用。當 relay 被正確使用時：
- 每個 slot 有明確的搜索任務
- Sub-agent 產出的每個 reference 對應一個具體的 source URL
- URL dedup 確保同一個 URL 不會產生兩個文件

如果 Agent 繞過 relay 直接寫文件，gate 的 provenance 檢查（`ledger_exists` + `subagent_dir_nonempty`）會阻止它——不需要 content dedup。

### 6.3 key_facts_min_lines 移除後，Key Facts 可能空泛

回應：Key Facts 的品質是 sub-agent 的 system prompt 和 HITL2 人類審閱的責任。如果 sub-agent 產出的 Key Facts 太空泛，問題在於 sub-agent 的指令不夠好，不在於 engine 應該在 gate 檢查 bullet count。

可以通過改進 sub-agent 的 system prompt（「Key Facts 必須包含具體數字、日期、名稱，每條至少 20 字」）來解決，比在 engine 做機械的 bullet count 更有效。

### 6.4 count_floor 走 ledger → relay 旁路後 fail

`shared_ref_count_floor` 和 `per_topic_ref_md_count_floor` 目前走 ledger 計數（`source: 'ledger'`）。Relay 旁路後 ledger 不存在 → count = 0 → gate fail。這是對的（provenance 缺失應該 fail），但 inspect 信息需要清楚說明**為什麼** count 是 0——是因為文件不存在，還是因為 ledger 不存在。

改進：當 ledger 缺失時，`countReferences()` 應該 fallback 到 filesystem glob 計數，但在 inspect 中標註 "ledger missing, count from filesystem"。這樣 gate fail 時 inspect 的信息更精確：文件存在但 ledger 不存在 → provenance 問題，不是產出問題。

---

## 7. Open Questions for Review

1. **URL dedup 的 normalize 策略**：`normalizeUrl()` 目前做 lowercase + 去 fragment + 去 trailing slash。這夠嗎？是否需要處理 `http→https` 升級、`www.` 前綴、tracking params（`?utm_source=...`）？

2. **count_floor 的 filesystem fallback**：當 ledger 缺失時 fallback 到 filesystem glob，是否會削弱 provenance 檢查？還是說 `ledger_exists` 已經單獨 fail 了，count_floor 的 fallback 只是提供更精確的診斷信息？

3. **cache_coverage 完全降為 WARN 是否太激進**：Cache trail 缺失意味著無法驗證 sub-agent 是否真的 fetch 了頁面內容。如果 sub-agent 只看了 search result snippet 就寫了 reference 文件——這算不算 provenance 問題？

4. **cross-slot URL dedup 的 WARN 閾值**：跨 slot 的 URL 重複什麼時候從 "正常" 變成 "可疑"？如果 5 個 slot 中有 4 個引用了同一個 URL——這應該 WARN 還是應該 block？

5. **reference_format 移除後，No YAML frontmatter 檢查放哪**：這是一個結構性問題（frontmatter 和 metadata block 互斥）。作為 negate pattern_match 留在 gate，還是放進 commitSlotResult？

---

## 8. 下一步

如果這個 plan 的邏輯經 review 確認沒有漏洞，下一步是：

1. 更新 `openspec/changes/harden-relay-pipeline/` 的 proposal、design、specs、tasks
2. 將 Jaccard 相關的 `tokenizeForSimilarity`、`jaccardSimilarity`、`checkContentDedup` 從 gate-helpers.mjs 中移除（或移到 subagent-relay.mjs 作為 optional warn-only check）
3. 實現 URL dedup（slot 內 FAIL，跨 slot WARN）
4. 更新 gate definitions 移除品質規則
5. 更新 phase MD 和 shared-silent-execution

---

## 9. Review Addendum — 保守化簡版（2026-07-03）

這份 plan 的主方向被採納：Gate/Relay 的職責需要拆清楚，正道要比捷徑更容易，URL identity 比 Jaccard 更適合作為 deterministic duplicate signal，品質問題也應該盡量在 relay/complete 邊界早發現，而不是等到 phase gate 才讓 Agent 修格式。

但 review 後不建議直接按本文原方案實作。原因是有幾個化簡點會削弱 accepted specs 已經建立的 authority boundary：

1. **`count_floor` 不得用 filesystem fallback 參與 gate pass。** Filesystem scan 可以做診斷，指出「文件存在但未 ledgered」，但 pass/fail 仍必須只認 Engine-written `rb_output_declarations.jsonl`。否則 orphan reference 又能幫助 gate 通過，BUG-014 的 direct path 會復活。

2. **`cache_coverage` 不應全面降為 WARN。** `_cache/` 本身不是 authority，但被 Engine-written ledger 引用的 cache leaves 在 gate/reentry verdict 前是 provenance evidence。沿用 accepted Phase 1 策略：空 `cache_trails` 可作過渡期 WARN；非空 trails 缺失、三件套不全、或不能映射到 reference，仍是 blocking gap。

3. **`key_facts_min_lines`、`source_url_article_level`、`reference_format` 不能在沒有 delta spec 的情況下消失。** 它們已出現在 `evidence-extraction`、`reference-flat-format`、`rerun-topic-integration` 等 accepted specs 中。若要放寬，必須明確修改相應 capability；本次 `harden-relay-pipeline` 不應暗中改寫這些 accepted contracts。

4. **`content_dedup` 應拆分而不是整體刪除。** URL duplicate 是 deterministic signal，可優先保留或移到更早的 relay/diagnostic 邊界；Jaccard near-clone 更適合降級為 warning/diagnostic，除非另有 delta spec 將其 hard-fail 語義改掉。

結論：本文保留為思考草稿。Active change `openspec/changes/harden-relay-pipeline/` 應採用「保守化簡版」：拆掉 direct path、強化 queue/relay provenance、改善 trace 診斷，同時保留 ledger authority、cache 兩階段策略、以及已接受的 countability/reference format contracts。
