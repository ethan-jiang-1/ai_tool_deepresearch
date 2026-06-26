## 1. Template — rb_plan.md.tmpl 重写

- [ ] 1.1 重写 `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl`：YAML frontmatter（`plan_basename`/`derived_topic_count`/`topic_registry` 字段不变）+ 6 section body（`## Goal` / `## Topic Registry` / `## Constraints` / `## Progress` / `## Decisions`）。`## Goal` 含 `### Purpose` / `### Research Questions` / `### Scope` 子节。`## Topic Registry` 是 Markdown table 模板。其余 section 为空占位符。@impl PHS-001, PHS-002, PHS-003, PHS-004

- [ ] 1.2 验证 `instantiate-run-bundle.mjs` 创建的 bundle 的 `rb_plan.md` 仍通过 `PlanSchema` 校验（`node DPT_FRAMEWORK/cli/validate-bundle.mjs <bundle>`）。@impl SCO-002

- [ ] 1.3 验证 `new-disposable-bundle.mjs` 创建的 bundle 的 `rb_plan.md`（JSON frontmatter）仍可通过 `parseMdFrontmatter()` 解析——YAML 1.2 是 JSON 超集。@impl PHS-006, SCO-002

## 2. Gate Definition — setup-ready 加两条 body 检查

- [ ] 2.1 在 `gate-setup-ready.definition.json` 中新增 rule `plan_body_non_empty`：check=`field_non_empty`, target=`rb_plan.md`。@impl PHS-005

- [ ] 2.2 在 `gate-setup-ready.definition.json` 中新增 rule `plan_body_no_placeholder`：check=`pattern_match`, pattern=`(待填充)|(尚无话题)`, negate=true。@impl PHS-005

## 3. Gate CLI — check-gate-setup-ready.mjs 实现新 check

- [ ] 3.1 在 `check-gate-setup-ready.mjs` 的 `field_non_empty` handler 中加 file body 变体：当 `rule.target` 以 `.md` 结尾时，strip frontmatter（`content.replace(/^---[\s\S]*?---\n?/, '').trim()`），检查剩余内容非空。复用 wave2-complete 和 hitl2-recorded 中已有的同一行代码。@impl PHS-005

- [ ] 3.2 在 `check-gate-setup-ready.mjs` 中实现 `pattern_match` handler：读取文件，strip frontmatter（对 `.md` 文件）或读全文（对非 `.md` 文件），执行 `new RegExp(rule.pattern).test(content)`，支持 `rule.negate` 反转语义（参照 wave1 和 wave2 中的实现）。@impl PHS-005

## 4. 实验 Playbook 兼容

- [ ] 4.1 检查所有实验 playbook 中写 `rb_plan.md` body 的地方。`## Purpose` → `## Goal` 如有引用则更新；无引用则跳过。经调查当前无 case 使用 `## Purpose`，但需确认 case-51/52 的 pre-seed 部分。

- [ ] 4.2 回归运行至少 5 个代表性 playbook case：case-101（hitl1→setup）、case-51（完整 E2E）、case-11（gate-fork light）。确认所有 gate 仍 PASS。

## 5. 验证

- [ ] 5.1 运行全量回归测试（`node --test tests/`），确认 fail 数不变（当前 baseline: 9 fail）。

- [ ] 5.2 手动验证新 gate rule：
  - 创建空 body 的 bundle → setup-ready gate FAIL（`plan_body_non_empty`）
  - 创建含 `(待填充)` 的 bundle → setup-ready gate FAIL（`plan_body_no_placeholder`）
  - 创建含正常 body 的 bundle → setup-ready gate PASS

- [ ] 5.3 运行 `node openspec/governance/check-project-reqs.mjs` — MUST PASS。

- [ ] 5.4 运行 `node openspec/governance/check-project-specs.mjs` — MUST PASS。
