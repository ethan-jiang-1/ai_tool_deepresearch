---
{
  "requires": ["chain-context.dep.md"],
  "req": "WFS-003"
}
---

# Chain Entry (FSM dependency test)

Entry point for chain dependency. Requires chain-context.md. Validates dependency-first execution within FSM node.

```js
state.executionOrder.push('chain.entry.md');
state.counters.chainEntry = (state.counters.chainEntry || 0) + 1;

traceEntry('md:executed', { node: 'chain.entry.md', status: 'success' });
transition('chain.entry.md', 'success');
```
