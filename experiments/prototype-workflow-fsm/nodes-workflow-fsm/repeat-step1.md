---
{
  "requires": ["shared-lib.md"],
  "req": "WFS-003"
}
---

# Repeat Step 1

First step that requires shared-lib.md. Validates file_read on first encounter.

```js
state.executionOrder.push('repeat-step1.md');
state.counters.repeatStep1 = (state.counters.repeatStep1 || 0) + 1;

transition('repeat-step1.md', 'success');
```
