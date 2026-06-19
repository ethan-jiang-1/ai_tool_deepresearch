---
{
  requires: ["this-is-not-valid-json"],
  req: "WMD-001"
}
---

# Malformed Entry

This file has a frontmatter block with invalid JSON (no quotes around keys).

## Role in Experiment
验证 malformed JSON frontmatter 导致 load 返回 error，且不加载任何文件。
