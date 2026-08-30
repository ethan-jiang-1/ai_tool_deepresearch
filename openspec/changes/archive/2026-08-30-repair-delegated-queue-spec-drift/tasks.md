
- [x] 0.1 openspec-feedback:plan-review —— 于首次 target edit 前完成（2026-08-30 polish Pass 1-3：proposal/delta/design/tasks/verification-plan 全件整体连贯性审查 + 3 项风险主导审查 + plan 模式检查基线（closure/verification PASS、reqs 预期基线确认）+ list-doc-locks 盘点）；review 发现均已当轮修复并复验，无遗留 pending task。

- [x] 0.2 openspec-feedback:closeout-review —— 归档前完成（2026-08-30）：change 范围实际 diff 复核（2 main spec + registry + 2 test 文件 + change 工件；_backlog 簿记改动为独立提交，不入本 change 边界）；semantic-closure not_applicable 理由对实际 diff 复核成立（DEEP_RESEARCH_HARNESS/ 零改动，git status 确认 0 文件）；delta↔main 逐字同步验证 ALL SYNCED；验证证据：锁测试 5/5、术语锁 9/9、governance:check 全绿、npm test 2866/2866 exit 0、plan/archive 检查 exit 0；无 open finding。

## 1. Apply 前置检查

- [x] 1.1 运行前置检查并记录基线：`node openspec/governance/check-project-reqs.mjs --mode plan`（注意：plan 模式不接受 `--change`）；`node openspec/governance/check-semantic-closure.mjs --change 2026-08-30-repair-delegated-queue-spec-drift --mode plan`；`node openspec/governance/check-verification-routing.mjs --change 2026-08-30-repair-delegated-queue-spec-drift --mode plan`。Done condition：closure 与 verification-routing 两查 PASS；reqs plan 检查预期 exit 1 且报告恰为 `Unregistered IDs: AGQ-028`（2026-08-30 已验证的现状基线，其修复即任务 3.3 的 registry 同步；DEW-027..029 尚未出现在任何 delta/main spec 故不报告）——输出与预期一致即视为通过，并在 5.1 归档检查处最终清零。
- [x] 1.2 运行 `node scripts/list-doc-locks.mjs openspec/specs/agent/delegated-work-units/spec.md` 与 `node scripts/list-doc-locks.mjs openspec/specs/agent/agentic-queue/spec.md`。Done condition：锁清单已列出；若存在锁定涉改文本的测试，其更新任务已并入 4.x，不存在"apply 后才发现红锁"。

## 2. DEW 落地（agent/delegated-work-units）

- [x] 2.1 按 delta（`specs/agent/delegated-work-units/spec.md`）修改 main spec：把 DEW-009 内重复 scenario "Claimed task contains absolute runtime paths" 的正文替换为合并声明（标题保留为 delta-sync key；行为唯一归属 "Claimed task contains one canonical absolute runtime root"；正文含 retention 注记）。Done condition：`git diff openspec/specs/agent/delegated-work-units/spec.md` 仅显示该 scenario 块的正文替换。
- [x] 2.2 确定 DEW 无 ID requirement 最终集合并分配 DEW-027..029。已由 git 考古定案的部分：`Dry-submit cache-URL mismatch diagnostics SHALL carry the recorded leaf urls` 与 `Dry-submit runtime-receipt schema diagnostics SHALL carry the raw value, all affected lines, and the expected format` 由 `2026-08-26-improve-dry-submit-diagnostic-feedback` 以无 `> req:` 头的 delta 新增、registry 从未同步——两者确定无 ID（各得一席）。第三席（候选："Sub-agents SHALL NOT own workflow authority"，其 heading 早于 2026-08-06 rebaseline）：先以 `git log -S "<heading>"` 与彼时 registry sync 比对确认其确无现有 ID 覆盖，再分配；若考古发现其已被某条现有 ID 覆盖，则该席顺延给下一候选并如实记录。Done condition：29 个 requirement 恰好对应 29 个不同 DEW ID（26 现有 + 3 新），映射表（heading → ID → 证据坐标）记录在本任务完成备注；不修改 registry 既有条目的松散标题。
- [x] 2.3 修改 main spec 头部 `> req:` 行为完整 29 ID 集合，并为全部 29 个 requirement 加内联 `> req: DEW-0xx` 行（格式先例：现 L69）。Done condition：头部 ID 数 = 29；`grep -c "^> req: DEW-"` = 30（头部 1 + 内联 29）。
- [x] 2.4 同步 `openspec/governance/req-registry.yaml`：新增 DEW-027..029 三条（Apply 期 live sync，遵循 config 规则）。Done condition：registry 含新 ID；此时 `node openspec/governance/check-project-reqs.mjs --mode plan` 的 unregistered 报告从 `AGQ-028` 缩为不变（DEW 新 ID 已登记，AGQ-028 留待 3.3 清零）。

## 3. AGQ 落地（agent/agentic-queue）

- [x] 3.1 按 delta（`specs/agent/agentic-queue/spec.md`）修改 main spec：给 "Phase drain includes queue demand and in-flight attempts" requirement 顶部加入判据分工 scope note（英文，指向 DEW-014 "Timeout terminalization SHALL be guarded by progress-aware preflight" 与 `engine/queue-manager-lifecycle.mjs`），scenario 文本不变。Done condition：note 存在且同时含 `deadline_at`、`lease_anchor_at + idle_timeout_ms`、DEW-014 requirement 标题三个锚点。
- [x] 3.2 修改 main spec 头部 `> req:` 行为完整 28 ID 集合（AGQ-001..028，含新 AGQ-028）。**（2026-08-30 apply 期修订：取消 AGQ 逐 requirement 内联行——@impl 注解 + registry 比对证实 AGQ 存在多 ID 合并 heading（AGQ-001 与 AGQ-019 的标题内容均落于 "Queue state and item schema are structured"），heading↔ID 非 1:1，强行单 ID 内联会制造新漂移；内联行仅限确证 1:1 的 DEW。合并 heading 的逐条考证另立后续工作。）** Done condition：头部 ID 数 = 28；`grep -c "^> req: AGQ-"` = 1（仅头部）。
- [x] 3.3 同步 `openspec/governance/req-registry.yaml`：新增 AGQ-028 一条。Done condition：registry 含 AGQ-028 且 `node openspec/governance/check-project-reqs.mjs --mode plan` exit 0（0 unregistered）。

## 4. 回归锁与验证

- [x] 4.1 新增 `tests/engine/delegated-queue-spec-text-locks.test.mjs`（node:test + node:assert，unit 类），断言：DEW 重复 scenario 已改为合并声明（含 retention 注记锚点句 "retained only as the OpenSpec delta-sync key" 所在块，且旧独立断言行 `- **THEN** the generated task SHALL include \`bundle_dir: /repo/dpt_rb_aidlc-investigation\`` 不再出现）；AGQ drain requirement 含 3.1 的三个注记锚点；两篇头部 `> req:` ID 集合大小分别为 29 / 28 且与正文 requirement 计数一致；registry 含 DEW-027..029 与 AGQ-028。Done condition：`node --test tests/engine/delegated-queue-spec-text-locks.test.mjs` 全绿。若 1.2 盘点出涉改锁测试，先同 change 更新之。
- [x] 4.2 运行 `npm run governance:check`。Done condition：全部 check PASS（content-drift / pointer-targets / spec-req-ids / project-reqs / project-specs / surface-inventory 等）。

- [x] 4.3 修复被本 change 暴露的陈旧术语锁 `tests/integration/md/agent-experiment-autorun-terminology.test.mjs`（"follows every active delta spec..." 子测试）：原逻辑要求 agent/agentic-queue 的任何活跃 delta 自含 "native completion" 锚点，但锚点实际位于本 delta 未触碰的 requirement（H129/H140/H151/H792），archive 合并后必然保留。改为 post-archive retention 语义：delta 替换的 heading 由 delta 携带锚点、未触碰的 main 块保留各自锚点，并集匹配即通过。Done condition：该测试 9/9 绿（已验证）。**顺带发现 list-doc-locks 盲点**：该测试动态构造 spec 路径、文件内无 basename 字面量，故未被盘点命中——盲点本身另立后续工作，不在本 change 范围。

## 5. 收尾硬性检查（归档前置）

- [x] 5.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-08-30-repair-delegated-queue-spec-drift` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired，新增 ID 已 transition 为 live identity）。Done condition：命令退出码 0。
- [x] 5.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。Done condition：命令退出码 0。
- [x] 5.3 全量 `npm test` 退出码 0（finalizer 归档机械前置）。Done condition：直接重跑确认非偶发后退出码 0。