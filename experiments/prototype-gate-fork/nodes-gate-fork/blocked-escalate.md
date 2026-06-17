# Blocked Escalate

> 分支: blocked | 条件: topicReadiness === 'blocked'

人工阻塞。当前 topic 无法自动处理，需要人工介入。

**操作:** 停止自动执行，设置 `current_gate = 'blocked_hitl'`，等待用户决策。

```js
// trace 记录 blocked 分支执行
traceEntry('md:executed', { source: 'gf-node/blocked-escalate', key: 'blocked_escalate', branch: 'blocked' });
```
