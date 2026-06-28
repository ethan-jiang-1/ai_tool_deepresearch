## 1. Agent 产出声明——Schema 扩展

- [ ] 1.1 实现 AGO-001, AGO-002: 扩展 `subagent-relay.mjs` 的 `SlotResult` schema，加入 `output_files` 和 `cache_trails` 字段（Zod 验证），`commitSlotResult()` 写入前校验
- [ ] 1.2 更新 `subagent-relay.mjs` 的 `ingestAgentReceipt()` 和 `collectAndMergeSubagentResults()` 传递声明数据到 queue manager

## 2. content_dedup Gate 规则实现

- [ ] 2.1 实现 GAC-001: `tokenizeForSimilarity(text)` — 中文 bigram + 英文 word tokenization
- [ ] 2.2 实现 GAC-001: `jaccardSimilarity(tokensA, tokensB)` — Jaccard 系数计算
- [ ] 2.3 实现 `extractSection(mdContent, sectionName)` — 从 Markdown 提取指定 section
- [ ] 2.4 实现 `parseReferenceMetadata(refPath)` — 从 reference/*.md 提取 source_url + Key Facts
- [ ] 2.5 实现 GAC-002, GAC-003, GAC-004, GAC-005: `checkContentDedup(bundlePath, options)` — 主函数，消费 `output_files[]` 声明，执行 URL 去重 + 首页检测 + 自指检测 + 两两 Jaccard 比较，返回 `{ passed, inspect, advice }`
- [ ] 2.6 实现 RWG-015: 更新 `gate-wave0-complete.definition.json` 和 `gate-wave1-complete.definition.json`，加入 `content_dedup` 规则（含 threshold 配置）
- [ ] 2.7 更新 `check-gate-wave0-complete.mjs` 和 `check-gate-wave1-complete.mjs`，在 rule iteration 中 dispatch `content_dedup` check type
- [ ] 2.8 写 `tests/engine/content-dedup.test.mjs`：单元测试覆盖 4 种检测机制（URL dedup、Jaccard clone、homepage detect、self-ref detect）和正常放行场景

## 3. complete() Cache Trail 校验

- [ ] 3.1 实现 AGQ-018: 在 `queue-manager.mjs` 的 `complete()` 中加入 delegated task 的 `_cache/` trail 检查——遍历 `cache_trails[]`，验证每目录存在 + 含 `sNN_*/` 子目录 + 3 文件（websearch.json + page.md + meta.json），任一缺失 reject
- [ ] 3.2 更新 `operate-queue.mjs` CLI 的 complete 命令，确保 `--result` JSON 中的 `cache_trails` 传递到 `complete()` 检查
- [ ] 3.3 写 `tests/engine/complete-cache-trail.test.mjs`：4 种边界场景（目录不存在、空目录、缺 meta.json、完整）

## 4. claim() Controller 校验 + Task Card 模板修复

- [ ] 4.1 实现 AGQ-017: 在 `queue-manager.mjs` 的 `claim()` 中加入 `--actor` 与 `targets.controller` 匹配校验，不匹配时 reject 并指明期望 actor
- [ ] 4.2 实现 AGQ-017: 更新 `operate-queue.mjs` CLI 的 claim 命令，解析 `--actor` flag 并传入 `claim(queue, { actor })`
- [ ] 4.3 更新 `phase-wave0.md` §3.1 task card 模板：`source_intake_fan_in` 的 `controller` 从 `"main-agent"` 改为 `"sub-agent"`；§3.3.1/§3.3.2 supplement 模板同步修改
- [ ] 4.4 更新 `phase-wave1.md` §3.1 task card 模板：`topic_deepening` 的 `controller` 从 `"main-agent"` 改为 `"sub-agent"`
- [ ] 4.5 更新 `phase-wave0.md` 和 `phase-wave1.md` 的 Sub-agent prompt section：加入 `output_files` + `cache_trails` 声明要求
- [ ] 4.6 更新 `shared-subagent-protocol.md`：加入产出声明协议说明（output_files + cache_trails 在 result JSON 中的位置和 schema）

## 5. 统一 Trace 文件

- [ ] 5.1 实现 TRW-005: 改 `queue-manager.mjs` 的 `QUEUE.TRACE` 常量从 `'_logs/_trace_agq_cli.jsonl'` 改为 `'rb_trace.jsonl'`
- [ ] 5.2 实现 TRW-005: 改 `subagent-relay.mjs` 的 `ensureTrace()` 路径从 `_logs/_trace_subagent.jsonl` 改为 `rb_trace.jsonl`
- [ ] 5.3 实现 TRW-005: 改 `experiments_env/shared/wff-playbook-utils.mjs` 的 `recordCheck()` / `verdict()` 默认 trace 路径从 `_logs/_trace.jsonl` 改为 `rb_trace.jsonl`
- [ ] 5.4 实现 TRW-005: 简化 `inspect-bundle.mjs --timeline`——从读 4 个 sink（rb_trace + 3 个 _logs/ trace）简化为 2 个（rb_trace.jsonl + run.log），移除 `[queue]` 和 `[subagent]` sink 标签
- [ ] 5.5 批量替换 ~30 个实验 playbook 中的 trace 路径：`$B/_logs/_trace.jsonl` → `$B/rb_trace.jsonl`（机械替换，每个文件验证 frontmatter 一致性）
- [ ] 5.6 更新 `case-211-heavy-wave0-happy-path.md`（exp_wfn_wave0）中的 `_trace_agq_cli.jsonl` 路径引用
- [ ] 5.7 更新 `command-experiments.md` guideline 中 trace 路径描述（如有 `_logs/_trace.jsonl` 引用）

## 6. 长期防御——Schema 快照

- [ ] 6.1 在 `validate-bundle.mjs` 中加入 required gate rule ID 检查：定义 `REQUIRED_GATE_RULES` 常量（wave0-complete 必须有 content_dedup，wave1-complete 必须有 content_dedup），gate definition 中缺失 key rule ID 时退出码 1
- [ ] 6.2 新建 `validate-phase-templates.mjs`：解析 phase-wave0/1/2.md §3.1 中 task card 模板的 JSON code block，验证 `targets.controller` 和 `targets.delegates.to` 关键字段不被意外改动，不匹配时退出码 1

## 7. Engine 层实验（Light，无需 Agent，核心：result.json fixture → 声明汇聚）

- [ ] 7.1 实现 EXR-001: 创建 `experiments_playbook/exp_ref_integrity/case-16-light-complete-cache-rejection.md` — 4 种边界场景，每个场景写 result.json fixture（含 `output_files[]` + `cache_trails[]`），`complete()` 消费声明做逐项检查（不扫描 `_cache/` 目录），走与生产完全相同的代码路径
- [ ] 7.2 实现 EXR-002: 创建 `experiments_playbook/exp_ref_integrity/case-17-light-gate-content-dedup.md` — 5 种造假类型，每个场景写 result.json fixture（含 `role=reference` 的 `output_files[]` + `source_url`），gate `content_dedup` 从声明读 reference 列表做去重（不扫描 `reference/` 目录），走与生产完全相同的代码路径
- [ ] 7.3 验证 Engine 层实验：在空环境跑 case-16 和 case-17，确认 verdict PASS（全部场景 expected 匹配）

## 8. Agent 层实验（Heavy/Standard，真实 Sub-agent + WebSearch，核心：Sub-agent 产出声明 → 生产路径）

- [ ] 8.1 实现 EXR-003: 创建 `experiments_playbook/exp_ref_integrity/case-12-heavy-wave0-real-agent-intake.md` — 1 topic wave0 全链路，真实 Sub-agent (dpt-source-intake) 做 WebSearch→WebFetch→写 _cache/ + 产出文件 → **返回含 `output_files[]` + `cache_trails[]` 的 result JSON** → `commitSlotResult()` schema 验证 → `complete()` 消费声明 → gate pass
- [ ] 8.2 实现 EXR-004: 创建 `experiments_playbook/exp_ref_integrity/case-13-standard-wave0-count-floor-refill.md` — floor=2，首轮产出不足 → gate fail → supplement task → Sub-agent 补充搜索 → 两轮 Sub-agent 均返回含 `output_files[]` + `cache_trails[]` 的 result JSON → gate pass，完整 fail→repair→pass 循环
- [ ] 8.3 实现 EXR-005: 创建 `experiments_playbook/exp_ref_integrity/case-14-heavy-wave1-real-agent-deepening.md` — 预置 wave0 产出 → Sub-agent (dpt-evidence-extractor) deepening → 返回含 `output_files[]`（role=evidence_summary/question_list）+ `cache_trails[]` 的 result JSON → `commitSlotResult()` schema 验证 → gate pass
- [ ] 8.4 实现 EXR-006: 创建 `experiments_playbook/exp_ref_integrity/case-15-standard-wave0-wave1-pipeline.md` — 同一 topic wave0→wave1 连续流水线，wave0 和 wave1 的 Sub-agent 各返回含声明的 result JSON，两次 `complete()` 各自消费对应声明，两级 _cache/ 不覆盖，状态正确推进

## 9. Phase Docs + Guidelines 更新

- [ ] 9.1 更新 `phase-wave0.md`：Sub-agent action 指令中明确要求搜索中间结果写入 `_cache/wave0/primary/{topic}/sNN_{source}/`（websearch.json + page.md + meta.json），返回 result JSON 含 `output_files[]` + `cache_trails[]`
- [ ] 9.2 更新 `phase-wave1.md`：同上——Sub-agent action 指令加入 `output_files[]` + `cache_trails[]` 要求，_cache 路径为 `_cache/wave1/primary/{topic}/sNN_{source}/`。**额外**：Phase Agent 的 complete 步骤加"读取 Sub-agent 返回的 result.json，将其 `output_files[].path` 填入 `complete()` 的 `writes[]` 数组"
- [ ] 9.3 更新 `shared-anti-cheating-rules.md`：加入"禁止不写 output_files 声明"和"禁止不写 _cache/ trail"的禁令
- [ ] 9.4 更新 `guidelines/command-experiments.md` §Framework Code Rules（line 393-408）：在现有规则列表末尾加一条——"Engine 消费结构化 Agent 产出声明，不扫描目录。Agent 的文件产出必须以 schema-validated 的声明形式记录。Engine 从声明中获取文件列表做 receipt 检查、content dedup 和跨文件一致性验证，不从 glob/readdir 推断。生产由 Sub-agent 在 result JSON 中提供声明，实验由 playbook 提供同样 schema 的 fixture 声明。声明之后的下游管道完全相同。"
- [ ] 9.5 更新 `guidelines/command-experiments.md` §Anti-Patterns（line 430-448）：在现有列表加一条——"Gate 或 Engine 代码通过 fs.readdir / glob 扫描目录来'发现' Agent 产出文件，而不是从结构化 Agent 产出声明中读取。声明之后的检查和验证均应以声明为合同。"

## 10. Governance & 收尾验证

- [ ] 10.1 更新 `openspec/governance/req-registry.yaml`：登记 AGO、GAC、EXR 前缀映射；新增 AGO-001~004、GAC-001~005、EXR-001~006、AGQ-017~018、TRW-005、RWG-015 条目
- [ ] 10.2 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [ ] 10.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
- [ ] 10.4 跑全部现有回归测试 `node --test tests/engine/ tests/schema/ tests/integration/` 确认无退化
- [ ] 10.5 跑 `validate-bundle.mjs` + `validate-playbook.mjs` 确认新代码不引入 schema violation
