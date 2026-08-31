# Tasks: repair-gate-feedback-carrier-glossary

## 1. Pre-edit

- [x] 1.1 运行 `node scripts/list-doc-locks.mjs CONTEXT.md` 并记录全部引用本文件的锁测试，确认受影响锁集合 = {repair-directive-lock, guidance-terminology-pointer-consistency}（其余锁不受本次行级修改影响）。Done when 锁清单已记录且与 design 一致。 Evidence: 6 个引用文件；change-feedback-finalizer/loop-archive 仅 fixture copyFileSync，agent-context-routing 锚定其他段落（term 循环为 4 个 compact 区分词），project-guidance-topology 锚定 pre-read 块——内容锁集合确认为 2 个。
- [x] 1.2 运行 `node openspec/governance/check-semantic-closure.mjs --change repair-gate-feedback-carrier-glossary --mode plan`。Done when PASS。 Evidence: exit 0（2026-08-31 polish + apply 复跑）。
- [x] 1.3 运行 `node openspec/governance/check-verification-routing.mjs --change repair-gate-feedback-carrier-glossary --mode plan`。Done when PASS。 Evidence: exit 0（2026-08-31 polish + apply 复跑）。

## 2. CONTEXT.md 载体修正

- [x] 2.1 `CONTEXT.md:55`：`workflow controller。Gate` → `workflow controller. Gate`（1 字符 rider）。Done when `grep -c 'controller。' CONTEXT.md` 为 0。 Evidence: 0。
- [x] 2.2 `CONTEXT.md:57` 术语行：`\`hints[]\` / \`resolution_owner\`（gate/phase 门禁面）` 改为 `\`repair_kind\`（gate/phase 门禁面）`，行内载体描述改为结构化反馈的 `hints[]`（gate 定义内 finding 为 `repair.kind`），五值枚举保持，补 `GATE_REPAIR_KINDS` 坐标。Done when 行内不再含 `resolution_owner`。 Evidence: CONTEXT.md 全文 resolution_owner 0 命中。
- [x] 2.3 `CONTEXT.md:72` 罗塞塔 Gate/Phase 行：载体字段单元格改 `repair_kind`（`hints[]` / finding `repair.kind`）；权威源单元格补 `DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs` `GATE_REPAIR_KINDS`（可执行枚举），语义权威仍为 `check-inspect-feedback/spec.md`。Done when `grep -n 'resolution_owner' CONTEXT.md` 零命中且该行含五值。 Evidence: 0 命中；行含五值（3.1 派生锁将进一步逐值断言）。

## 3. 锁测试升级为派生锁

- [x] 3.1 `tests/integration/md/repair-directive-lock.test.mjs`：F-03 `it` 块改为区分 `repair_kind` / `recovery_action` / `repair_directive`；新增 `it`：导入 `GATE_REPAIR_KINDS`（`../../../DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs`），定位 Gate/Phase 罗塞塔行并逐值断言五枚举出现；同块加 `assert.ok(!context.includes('resolution_owner'))`。既有 file-observability 六值与 consumer 断言保持。Done when `node --test tests/integration/md/repair-directive-lock.test.mjs` 绿。 Evidence: 18/18 绿（与 3.2/4.1 合跑）。
- [x] 3.2 `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs`：F-03 `it` 块（L58-62）同步改为三面新名（negative lock 不在此文件，见 3.1）；describe 标题与其余断言不动。Done when `node --test tests/integration/md/guidance-terminology-pointer-consistency.test.mjs` 绿。 Evidence: 18/18 绿。

## 4. 回归与治理

- [x] 4.1 相邻锁回归：`node --test tests/engine/work-unit-recovery-decision-table.test.mjs tests/engine/work-unit-repair-vocabulary.test.mjs`（零改动保持绿，证明 work-unit 侧未受影响）。Done when 全绿。 Evidence: 18/18 绿。
- [x] 4.2 治理 checker：`node openspec/governance/check-guidance-pointer-targets.mjs`、`node openspec/governance/check-content-drift.mjs`、`node openspec/governance/check-semantic-closure.mjs --change repair-gate-feedback-carrier-glossary --mode assets`、`node openspec/governance/check-verification-routing.mjs --change repair-gate-feedback-carrier-glossary --mode assets`。Done when 全 PASS。 Evidence: 4 项 exit 0。
- [x] 4.3 全量回归 `npm test`（并行全量 ~139s；失败按 `tests/README.md`「Full-Suite Failure Triage」孤立复跑定性，资源竞争伪影不据此改行为）。Done when 全绿或定性为环境伪影并记录。 Evidence: 2883 tests / 514 suites / 0 fail / 0 cancelled，exit 0，~189s（2026-08-31 本机）。

## 5. Closeout

- [x] 5.1 `openspec validate repair-gate-feedback-carrier-glossary --type change`。Done when PASS。 Evidence: "Change 'repair-gate-feedback-carrier-glossary' is valid"（propose 期 + `--strict` 于 polish 期均通过）。
- [x] 5.2 确认 design.md「Finding」段已记录 08-30 归档 change 的 tasks 2.2/6.1 失实（本 change 的普通 finding 记录；不改归档工件）。Done when 记录在案。 Evidence: design.md「Context」末段 Finding 已在案。
