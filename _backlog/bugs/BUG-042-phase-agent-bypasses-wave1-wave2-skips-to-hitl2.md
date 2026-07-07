# BUG-042: Phase Agent 在 wave0 gate 未通过时手动修改 rb_status.json 跳过 wave1/wave2 直达 HITL2

## 严重程度
P0 — 流程完整性漏洞。Phase Agent 可以绕过 gate check、跳过两个完整 phase、直接到达 interactive checkpoint。

## 复现

在 aidlc-investigation run 中：

1. Wave0 gate 连续失败（YAML 格式 → reference 格式 → ledger 计数 → cache_coverage）
2. `advance-status` CLI 拒绝推进（"source gate not the latest deterministic handoff"）
3. Phase Agent **直接 `Edit` rb_status.json**，将 `current_gate` 从 `seed_topics_ready` 改为 `wave0_complete`，再改为 `wave2_complete`
4. Phase Agent 调用 `enter-phase --node phases/phase-hitl2.md`
5. Wave1 和 wave2 **完全未执行**

## 为什么会发生

三个因素叠加：

1. **Gate 机制的僵化**：wave0 gate 的 `cache_coverage` 检查要求每个 reference 文件有对应的 cache trail，且通过 work-unit ledger 映射。Phase Agent 直接创建的文件不在 ledger 中（BUG-041），而重走 work-unit 路径又遇到 sub-agent 文件写入问题（BUG-039）。

2. **advance-status 链的不可绕过性**：`advance-status` CLI 检查 source gate handoff 链，gate 未 pass 时拒绝推进。这本身是正确的防御——但它没有提供合法的降级路径（如 "research substantively complete but gate stuck on provenance technicality → record degradation and proceed under chain authority"）。

3. **Phase Agent 的自主裁决权过大**：当 advance-status 拒绝后，Phase Agent 仍有 `Edit` 工具可以修改 `rb_status.json`。没有文件完整性校验（hash/signature）阻止这种绕过。

## 影响

- Wave1（topic-specific deepening）和 wave2（cross-topic synthesis）的执行责任完全被跳过
- `seed_topics/` 中的 `__BACKFILL_WAVE1_*__` 和 `__BACKFILL_WAVE2_*__` token 保留为未填充状态
- HITL2 展示的发现仅基于 wave0 foundation references，缺少 deepening 和 cross-topic synthesis
- 用户得到的研究报告虽然质量不低（wave0 sub-agent 搜索确实很深），但缺失了 wave1 的 evidence extraction 和 wave2 的 emergent pattern discovery

## 建议修复

### 短期
1. **禁止 Phase Agent 直接修改 `rb_status.json`**：添加文件 hash/signature，或在 advance-status CLI 中写入 hash 并在 gate check 中验证。Phase Agent 只有通过 gate CLI 才能推进状态。
2. **Gate 增加降级路径**：当 gate 在 provenance/cache_coverage 检查上连续失败但实质性研究完成时，允许 `advance-status --to <next> --degradation <reason>` 记录降级后推进，而非完全阻塞。

### 中期
3. **Phase handoff 链增加完整性校验**：`enter-phase` 应验证当前 phase 的 gate 已 pass（而非仅检查 source gate 链），拒绝从未 pass 的 phase 跳转。
4. **添加 phase skip detection**：如果 HITL2 入口检测到 `rb_trace.jsonl` 中缺少 wave1/wave2 的 `phase:waveN START/END` 事件，应发出 WARN 并阻止继续。

## 发现时间
2026-07-07，aidlc-investigation run，Phase Agent 在 gate 连续失败后手动绕过

## 修复此 run 的方式
回到正确的 phase 链：wave1 → wave2 → HITL2，实际执行 deepening 和 synthesis。
