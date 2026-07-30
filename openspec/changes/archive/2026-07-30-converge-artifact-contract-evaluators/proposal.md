## Why

BUG-146、BUG-162、BUG-172 与 BUG-178 不是四种独立的 Markdown 格式问题。当前
inspect/reentry paths 以目录、文件名或宽泛的 `return map` 名称推断 artifact 角色：合法的
shared rich reference 与 Wave1 evidence/question artifact 被送入 Seed Topic return-map parser，
而 reentry 又以不同于正常 Wave Gate 的规则解释 phase-owned reference backing。于是已按其
producer contract 提交、并有真实 submitted backing 的内容仍会成为 blocking false positive。

这必须先收敛。后续 topic-state writer、Agent feedback 和 work-unit recovery 都需要一个可信的
artifact/evaluator verdict；否则它们只能围绕错误的 parser 结论继续叠加 workaround。现有
accepted specs 已区分 navigation projection、reference、artifact、submitted backing 与 index，
本 change 的目的不是创造另一份 authority，而是让 consumer 实际采用这些区别。

## What Changes

- 在 evaluator boundary 明确区分 Seed Topic return-map entry、rich reference、Wave1 artifact、
  phase-owned reference projection 与 reference index；每个对象只由其已声明的 grammar 和
  authority contract 消费。
- 收敛 return-map inspection：它只判断其拥有的 Seed Topic projection surface，不再因一个文件
  位于 `reference/` 或 `artifacts/wave1/` 就要求 return-map fields。rich reference、
  evidence summary 与 question list 继续由各自的 format/artifact contract 校验。
- 让 normal Wave inspect/Gate 与 `check-reentry` 对同一 reference backing 复用一份
  authority classification，保留 delegated output 与合法 phase-owned projection 的区别，继续
  拒绝真正无 submitted backing 的 reference。
- 明确 reference metadata 的一种 canonical presentation 及其 template/parser/diagnostic
  关系，消除 YAML frontmatter 与 inline metadata 在不同 consumer 中靠隐含惯例解释的漂移。
- 将 findings 保持 root-first：一个 artifact-family 或 backing parent root 不再扩散为大量由错误
  parser 产生的 field/ledger symptoms；修复后仍通过原有 inspect/Gate/reentry checkpoint 验证。
- 移除或收敛按目录/前缀无条件套用 return-map grammar 的旧消费路径，不新建 document registry、
  evidence ledger、artifact controller 或第二成功 authority。

**BREAKING**：此前依赖“所有 `reference/*.md` 或 Wave1 artifact 都必须伪装成 return-map”的
非正式行为不再成立；只有各自 accepted producer contract 所要求的结构会参与对应 verdict。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research-return-map`: 将 return-map 的 reader scope 与 blocking/diagnostic responsibility
  限定到 declared Seed Topic projection surfaces，避免它成为任意 Markdown 的通用 grammar。
- `reference-flat-format`: 定义 rich reference 的 canonical metadata presentation、format consumer
  与 submitted-backing relation，避免 template、parser 和 guidance 采用不同约定。
- `wave1-intake`: 明确 `evidence-summary.md` 与 `question-list.md` 的 declared artifact contract
  独立于 Seed Topic return-map entry grammar。
- `research-wave-gate-implementation`: 让 Wave inspect/formal Gate 按 artifact family 组合已有
  evaluators，并复用同一 submitted/phase-owned reference authority interpretation。
- `runtime-reentry-debuggability`: 让 reentry 的 reference audit 复用当前 accepted reference
  authority classification，而不以独立 direct-ledger-only scan 推翻正常 Wave closeout。

## Impact

- **Framework behavior:** `return-map` helpers、Wave0/Wave1 inspect composition、reference-format
  readers、reference authority checks、`check-reentry` 和相关 phase guidance 将收敛到 artifact
  family 的明确 consumer boundary。
- **Verification:** focused `unit`/`integration` tests 将覆盖 rich shared reference、Wave1
  evidence/question artifact、valid/invalid Seed projection entry、delegated reference、phase-owned
  projection、frontmatter/metadata presentation、以及 Gate/reentry 同源 verdict。真实 bundle
  counterexample 可验证 closeout，不把 static fixture 当成 Agent/host 行为证据。
- **Authority:** submitted work-unit ledger、cache trails、receipt、canonical Topic registry 与 existing
  reference backing checks 仍是直接 Source of Record；Markdown role classification 不会使
  filesystem-only content 获得 evidence authority。
- **Control loop:** direct artifact/backing fact -> one family-specific evaluator -> existing inspect or
  reentry checkpoint -> one legal repair or honest no-path result。该 change 删除无条件
  return-map scans 与 reentry 的平行 ledger-only interpretation，不增加 retry/state/controller。
- **Responsibility:** Engine 判断 deterministic grammar/backing；Agent 在已有 legal writer 上修复
  内容或 projection；用户只决定新的 metadata/quality semantics；host 不因本 change 获得新
  capability。
- **Release:** framework behavior changes require a version bump. Target release: `v0.61`, with the
  usual `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` synchronization during apply. No dependency is added.
