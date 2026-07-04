// run-log-lifecycle-utils.mjs — parse _logs/run.log lifecycle lines for experiment verifiers
// Lifecycle lines are identified by INFO/WARN/ERROR msg token (search_start, work_done, …),
// NOT by slotKey in JSON detail — staging lines (relay_spawn_*) also carry slotKey.

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
 * Optional slotKey/kind filters apply to parsed detail JSON when present.
 *
 * @param {string[]} lines
 * @param {{ slotKey?: string, kind?: string }} [opts]
 * @returns {Array<NonNullable<ReturnType<typeof parseRunLogLine>>>}
 */
export function filterLifecycleLines(lines, opts = {}) {
  const { slotKey, kind } = opts;
  const out = [];
  for (const line of lines) {
    const parsed = parseRunLogLine(line);
    if (!parsed || !LIFECYCLE_MSG_SET.has(parsed.msg)) continue;
    if (slotKey && parsed.detail?.slotKey !== slotKey) continue;
    if (kind && parsed.detail?.kind !== kind && parsed.msg !== kind) continue;
    out.push(parsed);
  }
  return out;
}

/**
 * @param {string} runLog
 * @returns {boolean}
 */
export function runLogHasRelayCommitDone(runLog) {
  return /\] INFO relay_commit_done bundle=/.test(runLog);
}

/**
 * @param {string} runLog
 * @param {string} [slotKey]
 * @returns {boolean}
 */
export function runLogHasRelayCommitMissing(runLog, slotKey) {
  const hit = /\] WARN relay_commit_missing bundle=/.test(runLog);
  return slotKey ? hit && runLog.includes(slotKey) : hit;
}

/**
 * @param {string[]} lines
 * @param {string} slotKey
 * @param {string} nonce
 * @returns {boolean}
 */
export function lifecycleNonceIsolated(lines, slotKey, nonce) {
  const slotLines = filterLifecycleLines(lines, { slotKey });
  if (slotLines.length === 0) return false;
  return slotLines.every(
    (l) => l.detail?.receipt_nonce === nonce && l.detail?.slotKey === slotKey
  );
}

/**
 * @param {string[]} lines
 * @param {string} slotKey
 * @param {string[]} kinds in expected order (default search_start → search_done → work_done)
 * @returns {boolean}
 */
export function lifecycleKindsInOrder(lines, slotKey, kinds = ['search_start', 'search_done', 'work_done']) {
  const msgs = filterLifecycleLines(lines, { slotKey }).map((l) => l.msg);
  if (msgs.length !== kinds.length) return false;
  return kinds.every((k, i) => msgs[i] === k);
}
