---
{
  "requires": ["diamond-shared.md"],
  "req": "WMD-001"
}
---

# Diamond A

Branch A, requires shared.md.

## Role in Experiment
验证菱形依赖的一条分支；shared 通过两条路径被引用但只执行一次。

```js
state.executionOrder.push('diamond-a.md');
state.counters.diamondA = (state.counters.diamondA || 0) + 1;
```
