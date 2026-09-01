# Design: sweep-spec-references-and-prose

## Decisions
| # | 决策 | 理由 |
|---|---|---|
| D1 | CLASS-B 改写模式：实现引用→`Source of Record:` 指针（C3 已确立的 pattern） | 保留 spec 读者找到实现的通路，但不让 spec 层知道实现在哪个文件 |
| D2 | 小修按 AUD-4 逐条独立处理（不合并为大块重写） | 每处问题独立且规模小 |
