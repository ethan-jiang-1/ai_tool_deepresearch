# Fail-A: Topic Repair

> 分支: fail_a | 条件: ref_count < ref_floor && topicReadiness === 'ready'

参考数量不足 floor。需要补充共享参考。

**修复策略:**
- 扩大搜索范围，增加 official + academic 来源
- 每次迭代补充 ref_count +2
- 修好后重回 Gate 重判

```js
// trace 记录 fail_a 分支执行
traceEntry('md:executed', { source: 'gf-node/fail-a-topic-repair', key: 'fail_a_topic_repair', branch: 'fail_a' });
```
