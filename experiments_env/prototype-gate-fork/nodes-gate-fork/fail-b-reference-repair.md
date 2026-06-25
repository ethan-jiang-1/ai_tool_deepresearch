# Fail-B: Reference Repair

> 分支: fail_b | 条件: topicReadiness !== 'ready' (not_ready)

话题分解未就绪。需要重新审视话题结构。

**修复策略:**
- 检查话题分解逻辑，确认 topic 粒度合理
- 设置 topicReadiness = 'ready'
- 修好后重回 Gate 重判

```js
// trace 记录 fail_b 分支执行
traceEntry('md:executed', { source: 'gf-node/fail-b-reference-repair', key: 'fail_b_reference_repair', branch: 'fail_b' });
```
