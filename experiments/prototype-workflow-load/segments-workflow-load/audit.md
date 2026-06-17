---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Audit (simple step, no dependencies)

Second workflow step. Should NOT be loaded when wave-entry.md is advanced.

## Role in Experiment
验证第二次 advance 才加载第二个 step。

```js
state.executionOrder.push('audit.md');
state.counters.audit = (state.counters.audit || 0) + 1;
```
