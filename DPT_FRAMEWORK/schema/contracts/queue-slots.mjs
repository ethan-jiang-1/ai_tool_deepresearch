// Queue active-window wire-shape constants.
// This module is intentionally pure so schema and engine can share it.

export const QUEUE_ACTIVE_WINDOW_SLOTS = 5;

export const SLOT_NAMES = Object.freeze([
  'slot_1_current',
  'slot_2_next',
  'slot_3_pending',
  'slot_4_pending',
  'slot_5_tail',
]);

export const PENDING_SLOT_NAMES = Object.freeze(SLOT_NAMES.slice(1));
