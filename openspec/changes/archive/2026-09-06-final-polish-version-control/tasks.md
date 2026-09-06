## 0. 反馈生命周期评审（openspec/operations/change-feedback-loop.md）

- [x] 0.1 openspec-feedback:plan-review 按 §Apply Review 对 proposal / delta specs / design / tasks 做 scoped 评审（整变更一致性 + 触及 surface 的风险；semantic-closure.yaml 对实际 surface 成立）。评审结论：无未决 finding
- [x] 0.2 openspec-feedback:closeout-review（apply 完成后按 §Closeout Review 执行） 按 §Closeout Review 对实际 diff 做 scoped 评审（change-scoped 边界 = 本 change 触及文件清单；delta/main 同步已重比对且保真；semantic-closure 重新评估仍成立；验证证据：openspec validate --strict 全过、check-project-specs / check-project-reqs 全过、git diff --check 干净）。评审结论：无未决 finding

## 1. ARP delta 应用（artifact-persistence-recovery）

- [x] 1.1 @impl ARP-004 在 `DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs`（或对应 engine 模块）为 `publish-final-report` 增加**打磨修订路径**（决策 A：`--polish` flag，无 flag 保持现状）：当 staging 被判定为 presentation-only（Evidence Map backing 集合与提交事实集不变、仅呈现变化）时，用 CAS（expect-sha256=当前 digest）原地更新当前 latest primary 文件字节、不分配新全局版本、不创建新 primary revision 文件、不改 `latest`/`next_version`，并在绑定 auxiliary 目录的 `REVISIONS.md` 追加一行（时间、摘要、更新前 digest、更新后 digest）；非 latest 历史 primary 字节 SHALL NOT 被打磨更新。验证：`openspec validate --strict` 通过；确定性测试覆盖「presentation revision 不改变 inventory latest/next_version、仅 CAS 更新 latest 字节、非 latest 不可打磨」与「evidence-expanding 仍分配 latest+1」
- [x] 1.2 @impl ARP-004 新增 `retire-final-version` 操作（`operate-artifact-persistence.mjs retire-final-version`）：接受 `--version <N>` 与可选 `--feature`，将指定 primary revision 文件移至 `final/attic/`（原文件名或统一 retired 后缀），写 retired marker（retired_at、retired_by=user、原版本/feature、原因），重算 `latest` 为剩余最高非 retired revision；拒绝 Agent 无用户显式请求的调用；retired 版本号不得复用。验证：确定性测试覆盖「retire 后 latest 回退」「retired 字节不删除」「版本号不复用」「Agent 调用被拒」
- [x] 1.3 @impl ARP-005 在发布流程中强制主版本绑定 auxiliary 目录含**自包含证据明细文件**（如 `07-evidence-details.md`）：每条关键结论给出结论摘要、关键数字、口径标签、可点击外部 URL；外部 URL 必须可回溯到已提交 reference frontmatter `source_url` 集合（编造链接在 persist 前被拒）；主报告 Evidence Map 说明指向该文件。验证：确定性测试覆盖「明细文件 URL 全部可回溯」「编造 URL 被拒」「对外交付（主 MD + 子目录）不含内部路径依赖」

## 2. POF delta 应用（post-final-recovery）

- [x] 2.1 @impl POF-001 在 `DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md` 与 COMMANDS 的 post-final 迭代路由 aid 中明确：presentation-only 打磨留在 Final、不触发 post-final rerun、不分配新版本；evidence-expanding 才走 audited rerun 并升新版本；混合/含混先最小澄清。验证：playbook 文本含「presentation revision」「不分配新版本」表述且指向 ARP 打磨语义；grep 确认无「打磨也走 rerun」类错误路由

## 3. CDP delta 应用（content-delivery-phase-content）

- [x] 3.1 @impl CDP-007 在 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md` 的 refinement 语义中补版本纪律：打磨修订更新当前版本字节、不升版本；evidence-expanding 才经 audited rerun 升新版本；Final 不自动废弃任何版本（retire 属 human-controlled）。验证：node 文本含对应 SHALL 表述；既有 Final node 结构（gate:null、无 outgoing）不变
- [x] 3.2 @impl CDP-009 在 phase-final 的辅助归档指引中补自包含证据明细要求：主版本绑定子目录必须含 `07-evidence-details.md` 等价明细、外部 URL 可回溯、系列索引在每次发布/retire 后更新、presentation revision 只追加 REVISIONS.md 不改索引。验证：node 文本含对应要求；`check-content-drift` 或等价 checker 对更新后 node 无新 drift

## 3.5 受影响 main specs 同步（iterate-final-delivery-in-place 版本语义修正）

- [x] 3.5.1 @impl RUE-004 同步 ：入口节奏「presentation revisions」精确化为当前版本 CAS 更新（版本号不变），evidence-expanding 才追加版本。验证：delta 与 main sync 后  通过
- [x] 3.5.2 @impl CDE-003 同步 ：case-138 e2e 契约改为两轮 presentation 反馈 CAS 更新同一版本（保留 deprecated scenario 名 + 新语义 scenario）。验证：delta 与 main sync 后 validate 通过
- [x] 3.5.3 @impl WNC-005 同步 ：Final node「publish immutable revisions」精确化为 CAS 更新当前版本。验证：delta 与 main sync 后  通过

## 4. 测试与验证

- [x] 4.1 新增/扩展 `tests/engine/artifact-persistence-recovery.test.mjs`（或对应 unit 文件）：覆盖 D1 打磨修订（latest/next_version 不变、REVISIONS 追加）、D3 retire（latest 回退、字节保留、版本号不复用、Agent 拒）、D4 自包含明细（URL 可回溯、编造拒）。验证：`node --test tests/engine/artifact-persistence-recovery.test.mjs` 全绿
- [x] 4.2 扩展确定性 e2e（integration 已覆盖 publish→polish→retire→evidence-expanding 完整链） 或 integration（按 verification-routing 分类）：一条真实发布 → 打磨修订（版本不变）→ 用户 retire 冒进版本（latest 回退）→ evidence-expanding 新交付（版本递增）的完整链路。验证：对应 e2e/integration 测试通过且符合验证路由分类
- [x] 4.3 全仓治理检查：`node openspec/governance/check-all.mjs`（或等价入口）全过；`openspec validate --strict` 通过；`git diff --check` 干净。验证：三个检查 exit 0

## 5. 同步与收尾

- [x] 5.1 delta specs 与 main specs 同步（ARP/POF/CDP 三处 MODIFIED 内容进入 main spec，scenario 全量保留）。验证：`check-project-specs.mjs` 与 `check-content-drift.mjs` 通过
- [x] 5.2 更新 `DEEP_RESEARCH_HARNESS/command_playbook/persist-artifact.md` 与 `COMMANDS.md`：登记 presentation revision 打磨路径与 retire-final-version 操作（含全前缀命令与边界）。验证：grep 确认两处均有对应条目；命令串带全前缀
- [x] 5.3 归档本 change（`node openspec/governance/finalize-change-archive.mjs --change 2026-09-06-final-polish-version-control`）。验证：归档命令 committed、change 从 active 移入 archive
