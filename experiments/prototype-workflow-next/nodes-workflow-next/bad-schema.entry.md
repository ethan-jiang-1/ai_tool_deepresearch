---
{
  "requires": "not-an-array",
  "req": "WMD-001"
}
---

# Bad Schema Entry

Entry with valid JSON but wrong schema — `requires` is a string, not an array.

## Role in Experiment
验证 frontmatter 的 JSON 合法但 Zod schema 不匹配时，parseFrontmatter 抛干净的 Invalid frontmatter schema 错误。

```js
state.executionOrder.push('bad-schema.entry.md');
```
