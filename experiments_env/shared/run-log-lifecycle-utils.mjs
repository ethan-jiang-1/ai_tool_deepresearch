// run-log-lifecycle-utils.mjs — parse _logs/run.log lifecycle lines for experiment verifiers
// Lifecycle lines are identified by INFO/WARN/ERROR msg token (search_start, work_done, …),
// NOT by work-unit identity alone; Engine lifecycle diagnostics can share work_id fields.

/** @type {readonly string[]} */
export const LIFECYCLE_MSGS = Object.freeze([
  'search_start',
  'search_done',
  'fetch_done',
  'file_written',
  'error',
  'work_done',
]);

const LIFECYCLE_MSG_SET = new Set(LIFECYCLE_MSGS);
const RUN_LOG_LINE_RE =
  /^\[([^\]]+)\]\s+(DEBUG|INFO|WARN|ERROR)\s+(\S+)\s+bundle=(\S+)(?:\s+(\{.*\}))?$/;

/**
 * @param {string} content
 * @returns {string[]}
 */
export function splitRunLogLines(content) {
  if (!content || !content.trim()) return [];
  return content.trim().split('\n');
}

/**
 * @param {string} line
 * @returns {{ ts: string, level: string, msg: string, bundle: string, detail?: object, raw: string } | null}
 */
export function parseRunLogLine(line) {
  const m = line.match(RUN_LOG_LINE_RE);
  if (!m) return null;
  const [, ts, level, msg, bundle, detailJson] = m;
  let detail;
  if (detailJson) {
    try {
      detail = JSON.parse(detailJson);
    } catch {
      detail = undefined;
    }
  }
  return { ts, level, msg, bundle, detail, raw: line };
}

/**
 * Lifecycle = run.log line whose msg is a known lifecycle event name.
 * Optional work-unit/kind filters apply to parsed detail JSON when present.
 *
 * @param {string[]} lines
 * @param {{ workId?: string, queueItemId?: string, kind?: string }} [opts]
 * @returns {Array<NonNullable<ReturnType<typeof parseRunLogLine>>>}
 */
export function filterLifecycleLines(lines, opts = {}) {
  const { workId, queueItemId, kind } = opts;
  const out = [];
  for (const line of lines) {
    const parsed = parseRunLogLine(line);
    if (!parsed || !LIFECYCLE_MSG_SET.has(parsed.msg)) continue;
    if (workId && parsed.detail?.work_id !== workId) continue;
    if (queueItemId && parsed.detail?.queue_item_id !== queueItemId) continue;
    if (kind && parsed.detail?.kind !== kind && parsed.msg !== kind) continue;
    out.push(parsed);
  }
  return out;
}

/**
 * @param {string} runLog
 * @returns {boolean}
 */
export function runLogHasWorkUnitSubmitted(runLog) {
  return /\] INFO work_unit_submitted bundle=/.test(runLog);
}

/**
 * @param {string} runLog
 * @param {string} [workId]
 * @returns {boolean}
 */
export function runLogHasWorkUnitSubmitRejected(runLog, workId) {
  const hit = /\] WARN work_unit_submit_rejected bundle=/.test(runLog);
  return workId ? hit && runLog.includes(workId) : hit;
}

/**
 * @param {string[]} lines
 * @param {string} workId
 * @param {string} nonce
 * @returns {boolean}
 */
export function lifecycleNonceIsolated(lines, workId, nonce) {
  const workLines = filterLifecycleLines(lines, { workId });
  if (workLines.length === 0) return false;
  return workLines.every(
    (l) => l.detail?.receipt_nonce === nonce && l.detail?.work_id === workId
  );
}

/**
 * @param {string[]} lines
 * @param {string} workId
 * @param {string[]} kinds in expected order (default search_start → search_done → work_done)
 * @returns {boolean}
 */
export function lifecycleKindsInOrder(lines, workId, kinds = ['search_start', 'search_done', 'work_done']) {
  const msgs = filterLifecycleLines(lines, { workId }).map((l) => l.msg);
  if (msgs.length !== kinds.length) return false;
  return kinds.every((k, i) => msgs[i] === k);
}
