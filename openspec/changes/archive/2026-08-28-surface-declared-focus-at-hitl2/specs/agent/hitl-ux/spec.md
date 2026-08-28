> req: HIU-007

## ADDED Requirements

### Requirement: HITL2 research review surfaces declared-focus coverage

HITL2 的 research review SHALL，对每个可从当前 controls baseline（`rb_plan.md## Constraints > ### User Research Controls`）与 newest complete Decisions revision 识别的已声明 research focus，显式呈现该 Topic 的当前 focus_coverage 结果（`covered` / `partial` / `blocked` / `not declared`）。Agent SHALL 从该 Topic 的 `artifacts/wave1/{topic}/depth-review.yaml#/focus_coverage`（或 reference evidence map 的 current focus increments）读取当前结果；一个已声明但结果缺失或与用户意图不符的 focus SHALL 在 review 中可见，不得静默省略。

此呈现 SHALL NOT 新增 Gate、profile field、weight、source quota 或第三个 checkpoint；SHALL NOT 改变 focus_coverage 既有 absence = `not declared` 语义（wave1-intake），也不把 controls snapshot 或 focus 措辞解析为结构化 authority（user-research-controls）。它是面向用户的可见性呈现，判断（是否 rerun / repair / 接受）仍归 HITL2 现有 enum（HIU-003）。

#### Scenario: Declared focus coverage is visible at HITL2

- **WHEN** a Topic has a declared focus identifiable from the controls baseline or the newest Decisions revision
- **THEN** the HITL2 research review SHALL present that Topic's current focus_coverage outcome
- **AND** a declared-but-not-carried focus SHALL be visible rather than silently omitted

#### Scenario: Focus visibility introduces no new authority

- **WHEN** HITL2 surfaces declared-focus coverage
- **THEN** no new Gate, profile field, weight, source quota, or third checkpoint SHALL be introduced
- **AND** focus_coverage absence SHALL keep its existing `not declared` meaning
