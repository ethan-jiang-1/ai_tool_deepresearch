## 0. 反馈生命周期评审（openspec/operations/change-feedback-loop.md）

- [x] 0.1 openspec-feedback:plan-review 按 §Apply Review 对 proposal / delta specs / design / tasks 做 scoped 评审。评审结论：无未决 finding
- [x] 0.2 openspec-feedback:closeout-review 按 §Closeout Review 对实际 diff 做 scoped 评审（change-scoped 边界、semantic-closure 重评估、验证证据）。评审结论：无未决 finding

## 1. 契约实现（final-delivery-backing）

- [x] 1.1 @impl FDB-002 在 `DEEP_RESEARCH_HARNESS/engine/helpers/final-delivery-backing.mjs` 的 backing 判定循环中，`reference/` 分支后增加自包含明细分支：`resolved.relPath` 匹配 `^final/final(?:_[a-z0-9]+(?:_[a-z0-9]+)*)?_v([1-9][0-9]*)/` 且该版本号等于报告目标版本（从 target 解析）时，文件已存在（inspectRegularBackingFile 通过）即接受。验证：确定性测试覆盖「主报告 backing 指向同版本目录内文件通过」「指向其它版本目录被拒」
- [x] 1.2 @impl FDB-002 07-evidence-details.md 自身 Evidence Map 改为自包含引用（指向自身锚点或外部 URL，不再引用 `../../artifacts/` / `../../reference/`）；若 persist admission 对同文件锚点不接受，则 07 的 Evidence Map backing 指向 07 自身相对路径或保留外部 URL 形式并确认 admission 通过。验证：persist-final-report 对 07 提交成功

## 2. 交付应用

- [x] 2.1 更新 `dpt_rb_glm-5-3-deepseek-v4-domestic-chips/final/final_v4.md`：Evidence Map backing 列改为指向 `final_v4/07-evidence-details.md`（28 行），正文与 §5 导航不变。验证：publish-final-report --polish 提交成功（version 4 不变）
- [x] 2.2 更新 `final_v4/07-evidence-details.md` 自身 Evidence Map 为自包含引用。验证：persist-final-report 提交成功
- [x] 2.3 全交付单元零内部路径检查：主报告 + 07 中不含 `../artifacts/` / `../reference/` 引用（仅外部 URL 与目录内引用）。验证：grep 确认

## 3. 测试与收尾

- [x] 3.1 新增/扩展 `tests/engine/final-delivery-backing.test.mjs`（或对应测试）：覆盖「同版本目录自包含 backing 通过」「其它版本目录被拒」「symlink/missing 仍拒」。验证：node --test 全绿
- [x] 3.2 npm test 全绿 + openspec validate --strict + check-all 通过 + git diff --check 干净。验证：三命令 exit 0
- [x] 3.3 归档 change（finalize-change-archive）。验证：归档命令 committed
