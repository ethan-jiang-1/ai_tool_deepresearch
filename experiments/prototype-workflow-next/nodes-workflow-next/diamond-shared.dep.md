---
{
  "requires": [],
  "req": "WMD-001"
}
---

# Diamond Shared

Shared dependency required by both diamond-a.md and diamond-b.md.

## Role in Experiment
验证菱形依赖去重：在单次 closure 中只执行一次，即使被两条路径引用。

```js
state.executionOrder.push('diamond-shared.dep.md');
state.counters.diamondShared = (state.counters.diamondShared || 0) + 1;
```
