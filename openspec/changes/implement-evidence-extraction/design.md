## Context

当前 Agent 端到端的 evidence pipeline 有三个阶段只有第一个阶段有实现：

```
Stage 1: Source Intake → _cache/        ← 部分实现（guidance-only MD 约定）
Stage 2: Triage + Promotion → reference  ← 未实现（直接写 reference，跳过 cache）
Stage 3: Reference Counting → Gate       ← 未实现（Gate glob 数文件，Agent evidenceCount 声明数）
```

`_cache/` 目录约定已文档化于 `shared-subagent-protocol.md`（`_cache/waveN/{batch}/{scope}/sNN_slug/` 含 `websearch.json`/`page.md`/`meta.json`），spec `cache-raw-web-content` 定义了 CRC-001..004。但这套约定是 **guidance-only**——Engine 从不验证 cache 是否存在或内容是否完整。

实际后果（从 `dpt_rb_china-japan-relations-since-april-2026` bundle 实测）：53 条 declaration 的 `cache_trails` 全为 `[]`。6 个 topic 中，原始 4 个 topic 各有 31-36 个 cache 目录，rerun #1 新增的 topic 05（Korea）只有 10 个（密度 ~1/3），rerun #2 新增的 topic 06（Switzerland）有 **0 个** cache 目录——它的 8 个 reference 文件无法追溯到原始 websearch/page/meta。queue projection 中也没有 topic 06 的 source intake task——Sub-agent 直接写了 reference 文件但跳过了 `_cache/` 写入流程。

BUG-007 修复提供了关键基础设施：file-observability 可独立于 ledger 扫描文件系统，checkpoint/reentry 可检测 phase 间状态漂移，`creation_reason` 在 ledger 中记录了产出上下文。现在可以用这些基础设施来硬化 cache trail。

## Goals / Non-Goals

**Goals:**
1. 让 `cache_trails` 从空数组变为 Engine 强制填充——`complete()` 验证 `_cache/` 目录存在且含 3 文件
2. 实现 `isCountable(ref)` 和 `countReferences(baseDir)` Engine helper
3. `ref_count` 改为 Engine 计算，替换 Agent 的 `evidenceCount`
4. 修复 rerun `action: add` 的 cache 缺失——新增 topic 必须走完整 source intake
5. Gate 新增 `cache_coverage` 规则交叉验证 declaration 与文件系统

**Non-Goals:**
- 不实现完整的 CandidateCard 系统（promote/cache→triage→enriched reference pipeline）——那是后续 TODO
- 不实现 `web_substance`/`commercial_intent`/`content_retention` 质量判定字段——那是 `todo-evidence-quality` 的范畴
- 不改变 reference 文件格式——已有 9 字段 metadata block + 5 section
- 不改变 wave0/wave1 的 dispatch/collect 层——cache trail 验证插入在 `complete()` 中，对 Sub-agent 透明

## Decisions

### D1: cache_trails 填充点在 `validateDelegatedCompletion()` + `appendOutputDeclarationLedger()`

**选择**：分两步。`validateDelegatedCompletion()` 负责验证——读取 `slotResult.cache_trails`，逐一验证每个路径在 bundle 内、目录存在、含 3 文件。`appendOutputDeclarationLedger()` 负责写入——将验证通过的路径（`string[]`）写入 `OutputDeclarationLedgerRecord.cache_trails`。Schema 保持 `z.array(z.string())` 不变——只存路径字符串，不存 `{path, status}` 对象。

**失败等级**：slot result 里的 `cache_trails` 是 Sub-agent 提供的 candidate declaration，不是 ledger authority。Engine 对 path escape、绝对路径、非 `_cache/` 路径、parent cache directory（不是 leaf）保持 hard-fail，防止安全边界被 warning 化。对于 leaf directory 存在性或三文件完整性，Phase 1 采用 filter + warning：不写入 ledger、不让该 trail 获得 authority，但允许 `complete()` 在其他 provenance/receipt 检查通过时继续，由 `cache_coverage` gate 承担两阶段 enforcement。

**替代方案 A**：在 Sub-agent 端验证 → 拒绝。Sub-agent 是 Agent 进程，不做 Engine 级验证。

**替代方案 B**：将 `cache_trails` 从 `z.array(z.string())` 改为 `z.array(z.object({path, status}))` → 拒绝。这会 breaking 所有现有 bundle（`validate-bundle.mjs` 和 gate CLI 都会 parse 失败），增加不必要的 migration 负担。验证状态（verified/incomplete）由 gate 在门控时动态判定，不需要固化在 schema 中。

**原因**：`validateDelegatedCompletion()` 已经有 slot result 验证管道。零 schema 变更 = 零 migration = 现有 bundle 不受影响。

**边界说明**：这不是放弃 Engine 验证。Engine 仍是唯一 ledger writer，并且只把 verified path strings 写入 `rb_output_declarations.jsonl`。warning 的含义是"candidate cache trail 未获得 ledger authority"，不是"cache trail 被接受"。

### D2: isCountable 的条件选择

**选择**：首版 `isCountable(ref)` 使用 4 个最小条件：
1. `acceptance_status === 'accepted'`
2. `## Core Content Capture` section 非空 ≥ 100 chars
3. `source_url` 是 article-level URL（复用 `isHomepageUrl()`）
4. `## Key Facts` 含 ≥ 5 bullet lines（复用 `checkReferenceKeyFactsMinLines()`）

**替代方案**：一次加入全部质量字段（`web_substance`/`commercial_intent`/`content_retention`）→ 拒绝。这些字段尚未加入 reference template，加入会导致所有现有 reference 不可计数。先用在 template 中已有字段的组合达到基本门槛，后续 `evidence-quality` 再加新字段。

**原因**：这些条件都可以从现有 metadata block + section 内容中判定，不需要新字段。它们保证了：(1) 来源被接受、(2) 有实质性内容、(3) URL 是具体文章、(4) 有足够事实条目。

### D3: ref_count 切换策略

**选择**：新增 Engine helper `ref-count.mjs`，导出 `countReferences(baseDir, options?)`。默认 `options.source` 为 `"ledger"`：只从 Engine-written `rb_output_declarations.jsonl` 的 role=`reference` declarations 取得候选 reference，再调用 `isCountable()`。filesystem scan 只允许用于 observability diagnostics，不能用于 gate/fork pass。

两处切换：(1) `subagent-relay.mjs` 的 `mergeResults()` 不再累加 Agent 的 `evidenceCount`，改用 committed SlotResult declarations 或 Engine ledger + `isCountable()` 计算；函数签名需要携带 `baseDir`，并且只能消费 schema-validated declaration paths。(2) `check-gate-wave0-complete.mjs` 和 `check-gate-wave1-complete.mjs` 的 glob-based `count_floor` 实现从 `readdirSync` + regex glob 改为调用 `countReferences(baseDir, { targetGlob, topic, source: "ledger" })`。

**注意**：gate CLI 的 `count_floor` 是独立实现（直接用 `readdirSync` 数文件），不受 `mergeResults()` 影响。两处必须分别迁移，否则 fork router 用 Engine 数字但 gate 用 glob 数字——结果不一致。`countReferences()` 必须保留 target scope：`shared_ref_count_floor` 只数 `reference/00-shared-*.md`，`per_topic_ref_md_count_floor` 只数当前 topic 的 matching target，不能用全局 reference count 满足 per-topic floor。**另外**：当前 `validateDelegatedCompletion()` 已有 cache trail 验证代码（queue-manager.mjs:434-450）——本次改动不是新增验证，而是将现有 hard-fail 改为"验证通过的路径写入 ledger，失败的 emit warning 不阻塞 complete()"，将 enforcement 从 complete() 移至 gate。

**authority 边界**：`countReferences()` 是 quality/count helper，不是 output discovery authority。默认 ledger 模式不会让 orphan reference 帮助 gate/fork pass；orphan 只能由 file observability / ledger coverage 报告。`content_dedup` 等需要 Agent-produced content inputs 的 gate 仍然从 `rb_output_declarations.jsonl` 读取。

**原因**：fork router 和 gate 必须使用同一个 `ref_count` 来源。向后兼容：如果 ledger 不存在或无 declared references，`countReferences()` 返回 0，Gate 自然 fail——safe default。

### D4: Rerun cache 修复方式

**选择**：在 `phase-wave0.md` 和 `phase-wave1.md` 的 Rerun-Aware Behavior 中，为 `action: add` 场景明确要求"与首次运行一致——走完整 source intake（含 `_cache/` 写入）"。task card 模板的 `action` 字段和 `_cache/` 路径说明不区分首次/rerun。

**原因**：问题是 prose 层的——phase MD 的 rerun-aware 段落描述了增量行为但没有明确 cache 要求。修复在 prose 层就够了，Engine 不需要区分"首次"和"rerun"——`complete()` 的 cache 验证对两者一视同仁。

### D5: cache_coverage gate 规则

**选择**：在 gate-wave0-complete 和 gate-wave1-complete 中新增 `cache_coverage` 规则，作为独立规则（不合并到 `ledger_coverage`——两者检查不同的东西：ledger_coverage 查"文件是否在 declaration 中"，cache_coverage 查"declaration 声称的 cache 是否存在且能支撑具体 reference"）。

**两阶段策略**：首版对空 `cache_trails` 只 emit warning 不 fail（当前 53 条全空），对非空 `cache_trails` 中路径缺失或 reference 无法映射到 cache leaf 的 fail。等 prose 层更新（task card 模板含 cache 路径指令、修复 rerun cache 缺失）后，升为对空 `cache_trails` 也 fail。此策略在 spec 中明确标注。

Phase 1 warning 只兼容旧 bundle / 旧 declaration 的空 trail 缺口。新 rerun `action:add` 的成功路径必须产出非空 verified cache trail；如果新 rerun 仍为空，file observability 应用现有 classification 报告 `kind/check: cache_gap`，不能新增第七个 `FILE_CLASSIFICATIONS` 值。

**reference-to-cache 映射**：仅证明 declaration 有非空 `cache_trails` 不够。`cache_coverage` 必须对每个 role=`reference` output 找到至少一个 cache leaf，优先以 `meta.json.url == output_files[].source_url` 判定；若 URL normalization 后仍无法匹配，可用 `output_files[].source_slug` 或 reference filename qualifier 与 `sNN_<slug>` leaf 匹配。无法映射时作为 blocking cache gap。

**cache retention**：accepted CRC-004 允许 `_cache/` 在 wave 完成后删除；本 change 收紧为"被 ledger 引用的 cache leaves 在 `cache_coverage` / reentry verdict 记录前不可删除"。检查完成并记录 gate attempt / trace 后，可以继续按 non-authority cache 清理。

**替代方案 A**：合并进 `ledger_coverage` → 拒绝。两者错误消息、修复策略、severity 都不同。分开便于 Agent 理解具体缺什么。

**替代方案 B**：首次直接 fail 空 `cache_trails` → 拒绝。会导致所有现有 bundle gate fail，过渡期不可接受。

**顺序**：`cache_coverage` 在 `ledger_coverage` 之后、`content_dedup` 之前执行——先确认文件有 provenance，再确认 provenance 有 cache trail，最后做内容去重。**Wave0 gate 无 `ledger_coverage` 规则**，`cache_coverage` 直接插入在 `content_dedup` 之前（最后一个实质性规则之后）。

### D6: 实验资产分层与编号

**选择**：新增独立实验族 `experiments_playbook/exp_evidence-extraction/`，case 编号使用空置的 16 段，从 `case-161` 开始。该段位于 `case-151..154` wave-chain 之后、`case-181..182` topic-rewrite 之前，语义上比跳到 500 段更贴近 research-wave evidence mechanism；同时不顺接 `exp_engine-boundary` 的 401 段或 `exp_file-observability` 的 310 段。那些实验族提供可复用模式，但本 change 是新的机制组合：reference countability + cache trail authority + gate coverage + reentry diagnostics + rerun Agent compliance。

**case 矩阵**：

| Case | Cost | 证明什么 | 不证明什么 |
|------|------|----------|------------|
| `case-161-light-complete-cache-trails.md` | light | fixture slot result 进入 delegated `complete()` 后，verified cache trails 写 ledger；incomplete leaf warning + 不写 ledger；unsafe/non-leaf hard-fail | 不证明 Agent 会搜索或写 cache |
| `case-162-standard-gate-reentry-cache-coverage.md` | standard | disposable bundle 中 `cache_coverage`、`count_floor`、file observability `cache_gap`、`check-reentry` 的 legacy warning / verified pass / missing fail 组合 | 不证明真实 Sub-agent 遵守 phase prose |
| `case-163-heavy-rerun-add-real-cache-trail.md` | heavy | 新 rerun `action:add` prose/task card 能否驱动真实 Agent/Sub-agent 写 `_cache` 三文件 leaf、reference、slot result `cache_trails`，并经 Engine 写 ledger；同时记录 coverage / grounding / countable-rate 指标 | 不作为日常 regression；无 real actor surface 时只能 NOT RUN，不能 PASS，且不能作为 archive/release 的质量证明 |

**原因**：传统 regression 能覆盖 deterministic helper、schema、gate CLI、queue-manager 边界；但不能单独证明这个 change 修复的真实断裂链。controlled experiments 必须证明跨边界路径，heavy canary 才能证明 Agent prose compliance。若 case-163 因缺少 real actor surface 只能 NOT RUN，则本 change 最多声明 Engine auditability 已实现，不能声明 Agent extraction quality 已被验证；archive 前必须二选一：case-163 PASS，或在 proposal/tasks 中明确降级范围。

**最小质量指标**：
- cache trail coverage: new rerun `action:add` references 100% have non-empty verified and mapped cache trails
- grounding spot-check: sampled Key Facts are supported by `page.md` / source text
- URL precision: counted references have article-level URLs, no homepage/shallow URL counted
- countable rate: produced declared references vs `isCountable()` pass count is reported
- gap rate: new-run `cache_gap`, orphan, empty-trail findings are zero for success verdict

## Risks / Trade-offs

- **[Risk] 现有 bundle 的 cache_trails 全空** → 如果在 `complete()` 中强制要求 cache_trails 非空，已完成的 bundle 重跑 gate 会全挂。缓解：gate 的 cache_coverage 规则只检查 declaration 中已声明的 trail，不要求 declaration 必须有 trail（那是 content_dedup 和 ledger_coverage 的职责）。首次实现时 cache_trails 验证是 warn 不是 reject，给现有 bundle 过渡期。
- **[Risk] `isCountable` 条件太松** → 4 个条件全部满足可能仍然包含低质量 reference（如 AI 生成的 filler text）。缓解：这是证据提取的**最低门槛**，不是质量判断。质量判断（`todo-evidence-quality`）在后续层做 discard。
- **[Risk] `countReferences` 替换 `evidenceCount` 改变 fork 路由行为** → fork router 之前用 Agent 声明数做 branch decision，现在用 Engine 计算数。如果 Engine 数出来的比 Agent 少（例如 reference 文件缺 Core Content Capture section），以前 pass 的场景可能 fail。缓解：这是预期行为——之前 pass 是假阳性（Agent 夸大了 ref_count），现在 fail 是真阴性。
- **[Risk] directory scan accidentally reintroduces orphan pass** → 如果 `countReferences()` 默认扫描 `reference/`，orphan reference 可能帮助 `count_floor` pass，违反 ledger authority。缓解：默认只读 Engine ledger / committed declarations；filesystem scan 只用于 diagnostics，tests 覆盖 orphan cannot help pass。
- **[Risk] per-topic count_floor 被全局 reference count 满足** → `countReferences(baseDir)` 如果不带 target scope，topic-a 可能被 topic-b 的 references 误判通过。缓解：gate 必须传 `targetGlob` / `topic`，tests 覆盖 scope-preserving count。
- **[Risk] cache_coverage fail 无法被现有 repair loop 修复** → 当前 repair loop（`subagent-relay.mjs`）通过 +2 `ref_count` 修复 `count_floor` 不足。cache_coverage fail 需要重新 spawn Sub-agent 产生 cache trail——不是加数字能解决的。缓解：首版 cache_coverage 只对非空 trail 的路径缺失 fail（这种情况极少——Sub-agent 要么写全、要么不写）。空 `cache_trails` 的 warn 不触发 repair loop。等到 prose 层更新、新 bundle 都有 cache trail 后，空 trail 升为 fail 时 repair loop 已有正常的 cache 产出路径。
- **[Risk] 现有测试因 `evidenceCount` 移除而 break** → `tests/engine/subagent-relay.test.mjs` 大量使用 `evidenceCount`（~12 处）。缓解：测试更新必须与 `mergeResults()` 改动在同一个 task 中完成，不能排在 §8 之后。任务排序已调整。
- **[Risk] `isCountable` 需要逐文件 MD 解析，性能高于 glob** → glob 是 sub-millisecond，解析 100 个 reference 文件（~500KB I/O + regex）可能需要 50-100ms。缓解：对于 wave0 scope 可控——wave0-complete gate 执行时 reference 文件数通常 < 30。后续如有性能问题，可加 simple LRU cache（bundlePath → count，在 `writeGateAttempt()` 时 invalidate）。
- **[Risk] Cache 文件内容不做验证——只查存在性** → `validateDelegatedCompletion()` 检查目录含 3 文件但不对内容做校验（`websearch.json` 可以是 `{}`，`page.md` 可以是空字符串）。这是故意简化的——内容质量判定是 `evidence-quality` 的范畴。在 design 中承认此局限，防止 reviewer 误以为是遗漏。Sub-agent 若写空文件，gate `cache_coverage` 会 pass 但 `isCountable` 最终要看 Core Content Capture 的实质性内容——空 `page.md` 不会让 reference 变成 countable。
- **[Known] count_floor 阈值保持 1 不变** → glob→countReferences 切换后有效门槛提高（之前任何匹配文件都计数，现在需通过 4 个 isCountable 条件），但阈值数字保持 1。这是故意选择——1 是"至少需要 1 条有实质内容的 reference"，方向正确。后续 `evidence-quality` 引入 discard 后可调高阈值。
- **[Known] Agent bypass 检测是启发式，非可靠防护** → AGO-006 通过检查 `cache_trails` 是否为空来判断 Agent 是否跳过了 `complete()`。但恶意 Agent 可以同时伪造 cache 目录和 cache_trails 路径来绕过硬编码检查。完全防御需要 Engine 对 ledger 条目签名（超出本 change 范围）。当前设计假设 Agent 不主动恶意绕过——目的是防止 Agent 因疏忽或流程缺失而跳过 cache 写入。
