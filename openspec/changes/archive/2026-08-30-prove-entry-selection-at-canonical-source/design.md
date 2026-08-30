## Context

见 `proposal.md` Why。约束：RUE-006 正文已要求「point instead of restating」；ACR-002 现把根 `## Deep Research Routing` 写成「指针 + 锁住的入口防错短语」；`dpt-research-entry-routing-contract`、`continue-run-bundle-contract` 第一则、`deep-research-harness-entry-contract` 的 routeFiles 循环把短语出现在每个 always-loaded 面当作 pass。8-30 reshape 的 Non-Goals 明确拒绝「无短语的真指针」。本 change 换的是证明，不是 Brief 过程。根 Execution Brief 三行表、Harness 研究/改行为两支、`CLAUDE.md` symlink、Hard Rules / `current run bundle root`、`RUN.md` §0 捷径禁令、harness-entry-doc-consistency 的意图触发与非研究 carve-out 都保留。

## Goals / Non-Goals

**Goals:**
- 完整选择规则只锁在 `continue-run-bundle.md` 的 `Entry Selection (canonical)`。
- 指针面只留 playbook 路径、该节名、`unsupported_current_entry_contract`；没有第二棵树。
- 三份入口回归改锁「canonical 全文 + 指针非复述」；删除已空转的「本框架就是项目的 Deep Research 引擎」。
- Brief 仍回答「打开哪一文件」。

**Non-Goals:**
- 不改入口决策树本身、不改 Engine / Gate / phase / `CONTEXT.md` / `RUN.md` 恢复表。
- 不合并反馈面、不加 glossary、不加落点表、不新增测试文件（改现有三份）。
- 不声称真实 Agent 行为（无 `agent_flow_e2e`）。
- 不修宿主注入的旧封面（环境问题，不在本 change）。

## Decisions

1. **「选择程序」有闭集，Brief 的「打开哪一文件」不在集内。**
   程序复述 = same-root pair preflight 步骤、无 candidate 才读 `RUN.md` 的说明文、扫描/裸文件/不可达不选 run 的树、entry 前禁搜作为该树的一部分。负向锁的具体句包括现测已锁的英文：`same-root \`BUNDLE_ENTRY.md\` + \`BUNDLE_MAP.md\` preflight`、`With no supplied existing candidate`、`discovered, bare, or unreachable file does not select a run`，以及中文：`preflight 失败，不等于「没有 explicit candidate」`、`禁止因此 fallback 读 \`RUN.md\``。单出现 `RUN.md` / `continue-run-bundle.md` / `unsupported_current_entry_contract` 不是复述。Brief 研究行写「给了 candidate → 打开 canonical 节；没给 → 打开 `RUN.md`」是 ACR-002 的动作核，不是第二份规则；负向断言不打根 Brief 表。
   备选：连 Brief 研究行也禁提 `RUN.md` → 拒绝。那样 Brief 无法点名下一文件。

2. **指针必含三件，只含三件作为选择证明。**
   `continue-run-bundle.md` + `Entry Selection (canonical)` + `unsupported_current_entry_contract`。`BUNDLE_ENTRY.md` / `BUNDLE_MAP.md` 出现在指针面且带着 preflight 步骤 = 复述，回归应红。坐标名 `current run bundle root` 仍可留在 Hard Rules / README 运行时边界，不作为选择证明的必现词。
   备选：指针只留路径、不点名边界 → 拒绝。RUE-006 已要求指针点名 unsupported-current-entry-contract。

3. **改现有三份回归，不新建第四份。负向断言只打指针/路由块，不扫全文。**
   README「第一条」、目录图、`RUN.md` reload 段会合法点名 `BUNDLE_ENTRY.md`。整文件 `doesNotMatch` 会误伤。抽出 named 指针块（根 `## Deep Research Routing`，不含其上 Brief 表；Harness Brief 研究单元格里的程序说明文；README `## 触发规则` 选择段；RUN `## 1. Entry Selection Is Already Done`；COMMANDS continue 行；start-research 的 existing-bundle 句），在块内锁指针三件并禁止程序复述。
   - `dpt-research-entry-routing-contract`：按块改锁；删掉「本框架就是引擎」空转 sync；`RUN.md` §0 与 README 意图/carve-out 断言不动。
   - `continue-run-bundle-contract` 第一则：四份行为文件的指针块；第二则 playbook 程序锁保持。
   - `deep-research-harness-entry-contract` routeFiles：不再要求每个文件全文都有 pair / `current run bundle root`；对指针块锁三件。playbook 自身与 CLI 例保持。
   备选：新建 `entry-selection-pointer-contract.test.mjs` → 拒绝。多一份锁会再复制证明。

4. **Harness README `## 触发规则` 标题保留，正文去掉决策树。**
   ACR-004 与 harness-entry-doc-consistency 用该 heading 定位。保留「用户有研究意图 → 触发本 Harness」和「不触发本 Harness、不选择 run」。选择规则改为指向 canonical。
   备选：删掉触发规则节 → 拒绝。会红两份非本 change 的回归。

5. **invariants-brief 第 9 条改为指向 canonical。**
   GCO-001 只要求简报可指向唯一真相源。现第 9 条复述了树。改成指针，不改 GCO 正文。
   备选：不动第 9 条 → 拒绝。会留下 always-onboarded 的第二棵树。

6. **无新 requirement ID。** RUE-006 / ACR-002 / ACR-004 标题保持稳定锚点。registry 描述在 apply 同步 main spec 时改一句。

7. **死锁身份句直接删除，不恢复。** reshape design 已记录 match 失败两侧 `undefined`。apply 不把「本 Harness 就是…」写成新锁。

## 三原则应用记录

- **语义边界：** 读者 = 本轮 Coding Agent；问题 = 全文在哪、其它面是不是第二份规则；区别 = 打开哪一文件 / 选择程序 / 边界名；停止点 = canonical 节已打开，或指针面没有第二棵树。
- **direct Source of Record / 最短闭环：** 选择规则 → canonical 节。闭环：指针 → 打开该节。net simplification：删各面缩写与空转锁，不增加 check / state。
- **责任：** User 不在本 change 做新语义决定；Agent 改散文与回归；Engine 不读指针，只让文档回归对「全文位置 / 有无第二棵树」给出 pass/fail。

## Risks / Trade-offs

- [研究 Agent 不再在 always-loaded 页看见 pair preflight，直接 fallback 读 `RUN.md`] → 指针必点名 `unsupported_current_entry_contract`；Brief 研究行仍点名「先打开 canonical 节」；canonical 节全文仍锁。这是换证明时已承认的 7-29 风险，替代证明是「打开 owner」，不是「每页抄一遍」。
- [Slim README 触发规则时误删意图句 / carve-out] → apply 先跑 `harness-entry-doc-consistency`；那两句不在删除清单。
- [guidance-terminology 因根 AGENTS 丢掉 `current run bundle root` 变红] → Hard Rules 保留该坐标句；只从 Routing 块拿掉程序复述。
- [ACR Brief 回归因 Harness 研究单元格变短而红] → 单元格仍含研究 / 改行为两支、`continue-run-bundle.md`、`RUN.md`、完成条件；只删 preflight 说明文。

## Migration Plan

无运行时迁移。apply：plan-review → 改指针散文 → 改三份回归 → 同步 main spec 与 registry 描述 → 跑 verification-plan。回滚：`git revert` 同一批提交。

## Open Questions

无。用户已确认改证明方式，且拒绝再改 Brief 封面哲学。
