---
{
  "requires": [],
  "req": "WDM-001"
}
---

# Audit (self-contained entry, no dependencies)

Independent entry used to prove the caller explicitly chooses each load.

## Role in Experiment
验证没有 cursor 语义；只有调用 `loadNextMarkdown('audit.md')` 时才加载该文件。

```js
state.executionOrder.push('audit.md');
state.counters.audit = (state.counters.audit || 0) + 1;
```
