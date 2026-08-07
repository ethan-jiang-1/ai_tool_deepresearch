// @impl AGQ-019, GSK-008
// Pure reader for the direct no-successor fact recorded in Queue terminal history.

function terminalReason(record) {
  const reason = String(record?.reason || '').trim();
  return reason || 'No terminal reason was recorded.';
}

export function readTerminalNoSuccessor(queue) {
  const record = Array.isArray(queue?.terminal_history)
    ? queue.terminal_history.find((entry) => entry?.failure_disposition === 'terminal_no_successor')
    : null;
  if (!record) return null;

  const queueItemId = record.queue_item_id;
  const reason = terminalReason(record);
  return {
    root_id: 'terminal_no_successor',
    queue_item_id: queueItemId,
    terminal_reason: reason,
    failure_disposition: record.failure_disposition,
    repair_kind: 'missing_contract',
    missing_fact: `Generic Queue failure for ${queueItemId} is terminal with no sanctioned Queue successor: ${reason}`,
    write_to: 'queue failure successor contract',
    repair: 'Stop at the Queue failure successor contract; do not create a repair card, hand-edit Queue authority, or use generic Queue failure as a delegated replacement path.',
  };
}
