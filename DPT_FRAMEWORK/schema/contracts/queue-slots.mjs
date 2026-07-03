// Queue active-window wire-shape constants.
// This module is intentionally pure so schema and engine can share it.

export const QUEUE_ACTIVE_WINDOW_SLOTS = 20;

export const SLOT_NAMES = Object.freeze([
  'slot_1_current',
  'slot_2_next',
  'slot_3_pending',
  'slot_4_pending',
  'slot_5_pending',
  'slot_6_pending',
  'slot_7_pending',
  'slot_8_pending',
  'slot_9_pending',
  'slot_10_pending',
  'slot_11_pending',
  'slot_12_pending',
  'slot_13_pending',
  'slot_14_pending',
  'slot_15_pending',
  'slot_16_pending',
  'slot_17_pending',
  'slot_18_pending',
  'slot_19_pending',
  'slot_20_tail',
]);

export const PENDING_SLOT_NAMES = Object.freeze(SLOT_NAMES.slice(1));
