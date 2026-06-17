---
{
  requires: ["this-is-not-valid-json"],
  req: "WMD-001"
}
---

# Malformed Entry

This file has a frontmatter block with invalid JSON (no quotes around keys).

## Role in Experiment
验证 malformed JSON frontmatter 导致 advance 返回 error，cursor 不前进，不执行任何文件。

```js
// This should never execute due to malformed frontmatter
state.executionOrder.push('malformed-entry.md');
```
