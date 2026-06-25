---
{
  "requires": ["nonexistent-file.md"],
  "req": "WMD-001"
}
---

# Missing Dependency Entry

Entry point for missing dependency test. Requires nonexistent-file.md which does not exist.

## Role in Experiment
验证 missing dependency 错误包含缺失文件和 requester，且不加载任何文件。
