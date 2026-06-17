---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Wave Entry (simple step, no dependencies)

This is the first step in the workflow. It has no dependencies, so advancing to this step should load and execute only this file.

## Role in Experiment
验证 simple step dynamic load：advance 时只加载当前 step，不预读其他 step。

```js
state.executionOrder.push('wave-entry.md');
state.counters.wave = (state.counters.wave || 0) + 1;
```
