---
{
  "requires": [],
  "req": "WFS-003",
  // trailing comma makes JSON invalid
---
# Malformed Entry

Has a frontmatter block but the JSON is invalid. Should halt with Malformed JSON error.

```js
state.executionOrder.push('malformed-entry.md');
state.counters.malformedEntry = (state.counters.malformedEntry || 0) + 1;

transition('malformed-entry.md', 'success');
```
