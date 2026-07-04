// @impl AGQ-001..006, FRE-001, FRE-005
// Canonical engine location: DPT_FRAMEWORK/engine/queue-manager.mjs
//
// ## Role
// JS-owned Queue Manager over a Queue active window + refill pool.
// MD/Agent owns the work content. Engine owns deterministic state
// transitions, receipt checking, delegated provenance, projection rendering,
// and queue health.
//
// ## Internal layout
// - queue-manager-core.mjs: trace/logger singleton, constants, schemas, shared helpers
// - queue-manager-window.mjs: active-window mechanics, refill, preemption
// - queue-manager-ledger.mjs: delegated provenance and output declaration ledger
// - queue-manager-lifecycle.mjs: public lifecycle API and receipt checking
// - queue-manager-render.mjs: Markdown projection rendering
//
// External consumers import this barrel only.

export {
  QUEUE_ACTIVE_WINDOW_SLOTS,
  SLOT_NAMES,
  QueueItemSchema,
  QUEUE,
} from './queue-manager-core.mjs';
export { OutputDeclarationLedgerRecord } from './queue-manager-ledger.mjs';
export {
  checkReceipts,
  createQueue,
  loadQueue,
  saveQueue,
  enqueue,
  claim,
  complete,
  fail,
  inspect,
  pendingCount,
  makeItem,
} from './queue-manager-lifecycle.mjs';
export { preempt } from './queue-manager-window.mjs';
export { render } from './queue-manager-render.mjs';
