---
{
  "requires": [],
  "req": "WFS-002"
}
---

# Retry Node

Fails on first execution (counter < 1), succeeds on second. FSM maps error → self, success → next.

```js
state.executionOrder.push('retry-node.entry.md');
state.counters.retryNode = (state.counters.retryNode || 0) + 1;

if (state.counters.retryNode < 2) {
  traceEntry('md:executed', { node: 'retry-node.entry.md', status: 'error' });
transition('retry-node.entry.md', 'error');
} else {
  traceEntry('md:executed', { node: 'retry-node.entry.md', status: 'success' });
transition('retry-node.entry.md', 'success');
}
```
