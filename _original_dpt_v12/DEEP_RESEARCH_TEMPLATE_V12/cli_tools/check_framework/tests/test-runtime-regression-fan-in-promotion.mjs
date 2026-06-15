import {
  assertHasFinding,
  assertNoFindings,
  fanInQueue,
  fanInReadyStatus,
  join,
  mkdtempSync,
  planWithRunDir,
  queueFindings,
  resolve,
  rmSync,
  runIfMain,
  statusInProgress,
  tmpdir,
  writeRunCacheFiles,
} from "./test-runtime-harness.mjs";

export const tests = [
  [
    "fan-in ready promotion task passes with concrete batch candidate cards",
    () => {
      const texts = { status: statusInProgress("", fanInReadyStatus()), queue: fanInQueue() };
      assertNoFindings(queueFindings(texts), "fan-in ready promotion task passes with concrete batch candidate cards");
    },
  ],
  [
    "fan-in ready promotion task passes with absolute run-local candidate cards",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        const candidateCardPath = resolve(runRoot, "_cache", "intake", "b1", "candidate-cards.md");
        writeRunCacheFiles(runRoot, ["intake/b1/candidate-cards.md"]);
        const texts = {
          status: statusInProgress("", fanInReadyStatus({ latestCandidateCards: candidateCardPath })),
          queue: fanInQueue({ candidateCardPath }),
          plan: planWithRunDir(runRoot),
        };
        assertNoFindings(queueFindings(texts), "fan-in ready promotion task passes with absolute run-local candidate cards");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "fan-in ready promotion task rejects missing candidate cards on disk",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        const candidateCardPath = resolve(runRoot, "_cache", "intake", "b1", "candidate-cards.md");
        const texts = {
          status: statusInProgress("", fanInReadyStatus({ latestCandidateCards: candidateCardPath })),
          queue: fanInQueue({ candidateCardPath }),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /cache file does not exist: _cache\/intake\/b1\/candidate-cards\.md/, "fan-in ready promotion task rejects missing candidate cards on disk");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "STATUS QUEUE mismatch during fan-in ready rejected",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus({ batchId: "b2", latestCandidateCards: "_cache/intake/b2/candidate-cards.md" })),
        queue: fanInQueue(),
      };
      assertHasFinding(queueFindings(texts), /STATUS source-intake fields must mirror QUEUE while source_intake_wait_state=fan_in_ready/, "STATUS QUEUE mismatch during fan-in ready rejected");
    },
  ],
  [
    "fan-in ready promotion task rejects missing candidate card path",
    () => {
      const texts = { status: statusInProgress("", fanInReadyStatus()), queue: fanInQueue({ includeCandidateCardPath: false }) };
      assertHasFinding(queueFindings(texts), /must name an exact run-local _cache path/, "fan-in ready promotion task rejects missing candidate card path");
    },
  ],
  [
    "fan-in ready promotion task rejects missing promote log write",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus()),
        queue: fanInQueue().replace("; _cache/promote-log.md", ""),
      };
      assertHasFinding(queueFindings(texts), /must write _cache\/promote-log\.md during main-agent fan-in\/promotion/, "fan-in ready promotion task rejects missing promote log write");
    },
  ],
  [
    "fan-in ready promotion task rejects absolute external candidate cards",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        const externalPath = resolve(tmpdir(), "other", "_cache", "intake", "b1", "candidate-cards.md");
        const texts = {
          status: statusInProgress("", fanInReadyStatus({ latestCandidateCards: externalPath })),
          queue: fanInQueue({ candidateCardPath: externalPath }),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /must stay in exact run-local _cache staging paths/, "fan-in ready promotion task rejects absolute external candidate cards");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "fan-in ready promotion task rejects traversal candidate cards",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus({ latestCandidateCards: "../_cache/intake/b1/candidate-cards.md" })),
        queue: fanInQueue({ candidateCardPath: "../_cache/intake/b1/candidate-cards.md" }),
      };
      assertHasFinding(queueFindings(texts), /must stay in exact run-local _cache staging paths/, "fan-in ready promotion task rejects traversal candidate cards");
    },
  ],
  [
    "fan-in ready promotion task rejects nested cache candidate cards",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus({ latestCandidateCards: "scratch/_cache/intake/b1/candidate-cards.md" })),
        queue: fanInQueue({ candidateCardPath: "scratch/_cache/intake/b1/candidate-cards.md" }),
      };
      assertHasFinding(queueFindings(texts), /must stay in exact run-local _cache staging paths/, "fan-in ready promotion task rejects nested cache candidate cards");
    },
  ],
  [
    "fan-in ready promotion task rejects framework cache candidate cards",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus({ latestCandidateCards: "_framework/_cache/intake/b1/candidate-cards.md" })),
        queue: fanInQueue({ candidateCardPath: "_framework/_cache/intake/b1/candidate-cards.md" }),
      };
      assertHasFinding(queueFindings(texts), /must not write mutable cache files inside _framework/, "fan-in ready promotion task rejects framework cache candidate cards");
    },
  ],
  [
    "fan-in ready promotion task rejects wrong-batch candidate cards",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus()),
        queue: fanInQueue({ candidateCardPath: "_cache/intake/b2/candidate-cards.md" }),
      };
      assertHasFinding(queueFindings(texts), /batch id must match source_intake_batch_id=b1/, "fan-in ready promotion task rejects wrong-batch candidate cards");
    },
  ],
  [
    "fan-in ready promotion task rejects missing concrete batch",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus({ batchId: "not_applicable", latestCandidateCards: "_cache/intake/not_applicable/candidate-cards.md" })),
        queue: fanInQueue({ batchId: "not_applicable" }),
      };
      assertHasFinding(queueFindings(texts), /fan_in_ready requires a concrete source_intake_batch_id/, "fan-in ready promotion task rejects missing concrete batch");
    },
  ],
  [
    "fan-in ready promotion task rejects placeholder batch id",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus({ batchId: "<batch-id>", latestCandidateCards: "_cache/intake/<batch-id>/candidate-cards.md" })),
        queue: fanInQueue({ batchId: "<batch-id>" }),
      };
      assertHasFinding(queueFindings(texts), /concrete source-intake batch slug/, "fan-in ready promotion task rejects placeholder batch id");
    },
  ],
  [
    "fan-in ready promotion task rejects prose batch id",
    () => {
      const texts = {
        status: statusInProgress("", fanInReadyStatus({ batchId: "batch one", latestCandidateCards: "_cache/intake/batch-one/candidate-cards.md" })),
        queue: fanInQueue({ batchId: "batch one", candidateCardPath: "_cache/intake/batch-one/candidate-cards.md" }),
      };
      assertHasFinding(queueFindings(texts), /concrete source-intake batch slug/, "fan-in ready promotion task rejects prose batch id");
    },
  ],
];

runIfMain(import.meta.url, tests);
