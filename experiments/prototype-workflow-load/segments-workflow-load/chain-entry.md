---
{
  "requires": ["chain-context.md"],
  "req": "WMD-001"
}
---

# Chain Entry

Entry point for the chain dependency test. Requires chain-context.md.

## Role in Experiment
验证依赖优先执行顺序：policy -> context -> entry。

```js
state.executionOrder.push('chain-entry.md');
state.counters.chainEntry = (state.counters.chainEntry || 0) + 1;
```
