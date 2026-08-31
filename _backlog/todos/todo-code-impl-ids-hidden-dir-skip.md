# todo: check-code-impl-ids 跳过隐藏目录（tests/.test-tmp 残留噪音）

> 创建: 2026-08-31 | 来源: `2026-08-31-add-code-impl-registry-guard` 归档后的首次真实使用观察 | 优先级: 低

## 问题

RET-011 的 `openspec/governance/check-code-impl-ids.mjs` 扫描三个 first-party 代码面时会把 `tests/.test-tmp/`（npm test 的临时 fixture 残留，`.gitignore` L60 已忽略、非 first-party 代码）一并扫入：归档当天的 green 基线从 809 files 漂到 953 files（npm test 两次运行后），计数随测试运行波动。当前仍全绿（残留多为真实 CLI 文件的副本，`@impl` token 可解析），但存在未来 false-red 风险：任何测试 fixture 若在 `.test-tmp` 下写入含未注册 ID 的 `@impl` 行，checker 会对非 first-party 残留报红。

## 处置建议（最小修复）

`check-code-impl-ids.mjs` 的 `walkMjs` 增加一条规则：跳过以 `.` 开头的隐藏目录（`SKIPPED_DIRS` 从两个具体名扩为"隐藏目录一律跳过"，同时覆盖 `.git` 与 `.test-tmp` 及未来同类残留）。隐含语义：隐藏目录不是 first-party implementation code surface，与 RET-011 的覆盖面声明一致，不需要改 main spec。

## 边界

- 归档后不改目标代码，故本 todo 独立成最小 change（Modify `governance/requirement-traceability` 之外的纯工具修正——RET-011 的 requirement 文本已写「`*.mjs` files」，隐藏目录跳过不改变 requirement 语义，无需 delta；若 explore 期判定需要 delta 再升级）。
- 顺带核验：`walkMjs` 的 `statSync` 对残留内符号链接的行为（当前 fixture 残留均为实体文件，无阻塞）。

## Done condition

- checker 在 `npm test` 运行前后对三面的扫描文件计数稳定（不含 `.test-tmp` 波动）；
- `node openspec/governance/check-code-impl-ids.mjs` 全绿；
- `npm run governance:check` 与全量 `npm test` 全绿。
