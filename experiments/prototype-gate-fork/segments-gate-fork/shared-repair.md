# Shared Repair

> 汇聚点: fail_a ∪ fail_b → shared_repair

多 fail 分支汇聚到此共享修复段。同时处理两类问题：

1. **参考不足** (fail_a): ref_count += 2, 上限 ref_floor
2. **话题未就绪** (fail_b): topicReadiness = 'ready'

修复完成后，state 重回 Gate (`evaluateBranch()`) 重新分叉。Gate 可能返回不同分支（例如原为 fail_a，修复后 topic 也暴露问题 → 下一次 fork 变为 fail_b，或直接 pass）。

```js
// trace 记录 shared repair 执行
traceEntry('segment_load', { key: 'shared_repair', role: 'converge_point' });
```
