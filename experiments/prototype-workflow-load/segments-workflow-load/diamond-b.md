---
{
  "requires": ["diamond-shared.md"],
  "req": "WMD-001"
}
---

# Diamond B

Branch B, also requires shared.md.

## Role in Experiment
验证菱形依赖的另一条分支；shared 不应被执行两次。

```js
state.executionOrder.push('diamond-b.md');
state.counters.diamondB = (state.counters.diamondB || 0) + 1;
```
