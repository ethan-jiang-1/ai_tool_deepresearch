// 单一真相源：wave gate 疲劳降级策略常量。
// 规范 owner：openspec/specs/research/research-wave-gate-implementation/spec.md
//   requirement "Wave gate definitions, helpers, and phase docs SHALL align as one judgment layer"。
// 派生审计（tests/schema/gate-rule-audit.test.mjs）断言 wave wrapper 不再私藏
// 本模块常量的本地拷贝。运行时 fail-closed 兜底不因本模块改变。
export const WAVE_FATIGUE_PHASE_NODES = Object.freeze([
  'phases/phase-wave0.md',
  'phases/phase-wave1.md',
  'phases/phase-wave2.md',
]);
export const FATIGUE_ATTEMPT_THRESHOLD = 3;
