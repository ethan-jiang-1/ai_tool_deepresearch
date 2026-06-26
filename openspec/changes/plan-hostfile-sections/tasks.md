## 1. Gate — setup-ready 加两条 body 检查

先在 setup-ready gate CLI 中独立实现 strip 逻辑和 pattern_match，验证通过后再提取 helper。

- [x] 1.1 在 `gate-setup-ready.definition.json` 中新增 `plan_body_non_empty`（`field_non_empty`, target=`rb_plan.md`）。@impl PHS-005
- [x] 1.2 在 `gate-setup-ready.definition.json` 中新增 `plan_body_no_unfilled_marker`（`pattern_match`, pattern=`\((?:待填充|尚无话题)`, negate=true）。pattern 用 prefix match：匹配 `(待填充 — …)` 和 `(尚无话题 — …)` 变体。@impl PHS-005
- [x] 1.3 在 `check-gate-setup-ready.mjs` 的 `field_non_empty` handler 中加 file body 变体：target 以 `.md` 结尾时 strip frontmatter（内联实现），检查剩余内容非空。target 不含 `#/` 且不以 `.md` 结尾 → fail closed。@impl PHS-005
- [x] 1.4 在 `check-gate-setup-ready.mjs` 中实现 `pattern_match` handler：对 `.md` 文件先 strip frontmatter，`new RegExp(pattern).test()`（不加 `'g'`/`'i'` flag，避免 `lastIndex` 有状态隐患），支持 `negate`。@impl PHS-005
- [x] 1.5 手动验证：空 body → FAIL，`(待填充 — 研究目标)` → FAIL，`(待 HITL1 填充 — …)` → PASS，正常 body → PASS。

## 2. 指令更新 — phase-hitl1.md + start-research.md

- [x] 2.1 更新 `phase-hitl1.md` §3a step 2：从"写入 `rb_plan.md` 正文（Markdown body，非 frontmatter）"改为"写入 `rb_plan.md` 的 `## Goal` section。至少填写 `### Purpose`（一段话概述研究目标）。`### Research Questions` 和 `### Scope` 按 HITL1 用户提供的信息填写——信息不足时标注 `(待 HITL2 确认)`，不编造。"@impl PHS-002
- [x] 2.2 更新 `start-research.md` Step 3：从 append `## Research Question` 改为"确保 `## Goal` section 存在（新 bundle 已有），将用户问题填入 `### Research Questions` 子节"。防止 Agent 在 HITL1 之前创建游离的 `## Research Question` section 与后续的 `## Goal` 冲突。@impl PHS-002

## 3. 提取共享 helper — stripMdFrontmatter + 统一 pattern_match

setup-ready 的 strip 实现验证通过后，提取到 gate-helpers，同步更新其他 gate CLI。一并统一所有 gate 的 `pattern_match` 行为（先 strip frontmatter 再匹配）。

- [x] 3.1 在 `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` 中新增 `stripMdFrontmatter(mdContent)` 函数，放在 `parseMdFrontmatter()` 旁边。实现与 task 1.3 中验证过的内联代码完全相同。@impl SCO-012
- [x] 3.2 更新 `check-gate-setup-ready.mjs` 的 `field_non_empty` handler：用 `stripMdFrontmatter()` 替换内联 strip 代码。
- [x] 3.3 更新 `check-gate-wave2-complete.mjs` 的 `field_non_empty` handler：用 `stripMdFrontmatter()` 替换内联 strip 代码。**同步更新 `pattern_match` handler**：对 `.md` 文件先 `stripMdFrontmatter()` 再匹配（当前 wave2 的 pattern_match 不 strip）。@impl D4
- [x] 3.4 更新 `check-gate-hitl2-recorded.mjs` 的 `field_non_empty` handler：用 `stripMdFrontmatter()` 替换内联 strip 代码。
- [x] 3.5 验证 wave2-complete 和 hitl2-recorded gate：用新旧两种实现分别对同一 bundle 跑 gate，确认输出完全一致。

## 4. Engine 写 Progress — writePlanProgress

- [x] 4.1 在 `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` 中新增 `writePlanProgress(bundlePath, gateName)` 函数，放在 `writeGateAttempt()` 旁边。实现逻辑：读 `rb_plan.md`，在 `## Progress` section 内找到 `- [ ] <gateName>` 行翻转为 `- [x] <gateName> (<ISO8601 ts>)`；若已是 `- [x]` 则只更新时间戳（幂等）；若 gate 不在列表中则追加新行。try/catch 包裹，写失败不影响 gate 输出。@impl PHS-006
- [x] 4.2 在 `check-gate-setup-ready.mjs` 的 gate pass 路径中调用 `writePlanProgress(bundlePath, 'setup-ready')`。Phase 1 仅此一个 gate 接入；其他 gate 后续 change 逐步接。@impl PHS-006
- [x] 4.3 手动验证：gate pass 后 `## Progress` 里 `setup-ready` 行的 checkbox 为 `[x]` 且带时间戳；重跑同一 gate 时间戳更新、不重复行。

## 5. Template — rb_plan.md.tmpl 重写

- [x] 5.1 重写 `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl`：YAML frontmatter + 6 section body。`## Goal` 含 `### Purpose`(待填充 — 研究目标和范围) / `### Research Questions`(待填充 — …) / `### Scope`(待填充 — …)。`## Topic Registry` 为 Markdown table 模板（`| # | Slug | Title | Status |`），标注 `(由 Engine …)` intentionally-allowed marker。`## Constraints` 标注 `(待 HITL1 填充 — …)`。`## Progress` 预列所有生命周期 gate 的 checkbox（初始全 `- [ ]`）。`## Decisions` 标注 `(append-only — …)`。@impl PHS-001, PHS-002, PHS-003, PHS-004, PHS-006
- [x] 5.2 验证新模板创建的 bundle 的 `rb_plan.md` 通过 `PlanSchema` 校验（`validate-bundle.mjs`）。@impl SCO-002

## 6. Disposable bundle 生成器 — 走模板

- [x] 6.1 更新 `experiments_env/shared/new-disposable-bundle.mjs`：`rb_plan.md` 从 `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl` 生成（替换 `{{name}}`），不再内联 JSON + 1 行 body。生成后跑 `PlanSchema.safeParse()` 验证 frontmatter。@impl PHS-001
- [x] 6.2 手动验证：`node new-disposable-bundle.mjs test` 生成的 `rb_plan.md` 含 YAML frontmatter + 6 section + required-fill markers；`validate-bundle.mjs` 全部 PASS。

## 7. 验证

- [x] 7.1 全量回归测试（`node --test tests/`），fail 数不变或减少（baseline: 9）。
- [ ] 7.2 抽样 playbook：case-101（hitl1→setup）、case-51（完整 E2E）、case-106（topic rewrite→gate）。注意：disposable bundle 格式变更后，playbook 中如有对 `rb_plan.md` body 格式的断言（如检查特定 header 文本）可能需要同步更新。
- [ ] 7.3 **新增 E2E 验证**：创建 disposable bundle（已通过 hitl1-recorded gate，status.current_gate=`setup_ready`，仅 `rb_plan.md` body 残留 `(待填充 — …)` marker）→ `setup-ready` gate FAIL（trace 有 fail 事件，inspect 指向 `plan_body_no_unfilled_marker`）；Agent 替换 marker 为真实内容后重跑 → gate PASS。这是 placeholder 检测的关键证据路径。@impl PHS-005
- [x] 7.4 `check-project-reqs.mjs` + `check-project-specs.mjs` PASS。
- [x] 7.5 更新 `req-registry.yaml`：注册 RWG-014（research-wave-gate-implementation）、SCO-012（schema-core stripMdFrontmatter）。更新 PHS-006 description：从 "Disposable bundle path unaffected" 改为 "Engine writes ## Progress on gate pass"。修正 PHS-005 description：从 "setup-ready gate checks" 改为 "Gate body content checks (non-empty + no unfilled required-fill markers)"。
- [x] 7.6 更新 `research-wave-gate-implementation` main spec 的 req line 加 RWG-014；更新 `schema-core` main spec 的 req line 加 SCO-012。
