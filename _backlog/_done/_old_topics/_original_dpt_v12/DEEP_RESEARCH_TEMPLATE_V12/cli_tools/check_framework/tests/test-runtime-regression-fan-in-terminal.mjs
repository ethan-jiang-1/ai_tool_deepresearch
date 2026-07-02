import {
  assertHasFinding,
  assertNoFindings,
  fanInQueue,
  join,
  mkdtempSync,
  planWithRunDir,
  queueFindings,
  resolve,
  rmSync,
  runIfMain,
  sequentialQueue,
  statusInProgress,
  terminalCloseoutQueue,
  terminalSourceStatus,
  tmpdir,
  writeRunCacheFiles,
} from "./test-runtime-harness.mjs";

export const tests = [
  [
    "queue reset with terminal integrated STATUS passes",
    () => {
      const texts = { status: statusInProgress("", terminalSourceStatus()), queue: sequentialQueue() };
      assertNoFindings(queueFindings(texts), "queue reset with terminal integrated STATUS passes");
    },
  ],
  [
    "queue reset with terminal integrated STATUS and concrete cache files passes",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["intake/b1/candidate-cards.md", "promote-log.md"]);
        const texts = {
          status: statusInProgress("", terminalSourceStatus()),
          queue: sequentialQueue(),
          plan: planWithRunDir(runRoot),
        };
        assertNoFindings(queueFindings(texts), "queue reset with terminal integrated STATUS and concrete cache files passes");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "terminal integrated STATUS rejects missing promote log on disk",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["intake/b1/candidate-cards.md"]);
        const texts = {
          status: statusInProgress("", terminalSourceStatus()),
          queue: sequentialQueue(),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /cache file does not exist: _cache\/promote-log\.md/, "terminal integrated STATUS rejects missing promote log on disk");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "terminal integrated STATUS rejects missing candidate cards on disk",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["promote-log.md"]);
        const texts = {
          status: statusInProgress("", terminalSourceStatus()),
          queue: sequentialQueue(),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /cache file does not exist: _cache\/intake\/b1\/candidate-cards\.md/, "terminal integrated STATUS rejects missing candidate cards on disk");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "terminal failed STATUS rejects missing promote log on disk",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        const texts = {
          status: statusInProgress("", terminalSourceStatus({ status: "failed", latestCandidateCards: "not_applicable" })),
          queue: sequentialQueue(),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /cache file does not exist: _cache\/promote-log\.md/, "terminal failed STATUS rejects missing promote log on disk");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "terminal suspended STATUS rejects missing promote log on disk",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        const texts = {
          status: statusInProgress("", terminalSourceStatus({ status: "suspended", latestCandidateCards: "not_applicable" })),
          queue: sequentialQueue(),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /cache file does not exist: _cache\/promote-log\.md/, "terminal suspended STATUS rejects missing promote log on disk");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "terminal queue reset with none batch rejected",
    () => {
      const texts = {
        status: statusInProgress("", terminalSourceStatus()),
        queue: sequentialQueue().replace("source_intake_batch_id: `not_applicable`", "source_intake_batch_id: `none`"),
      };
      assertHasFinding(queueFindings(texts), /requires source_intake_batch_id=not_applicable exactly/, "terminal queue reset with none batch rejected");
    },
  ],
  [
    "terminal queue reset with unknown batch rejected",
    () => {
      const texts = {
        status: statusInProgress("", terminalSourceStatus()),
        queue: sequentialQueue().replace("source_intake_batch_id: `not_applicable`", "source_intake_batch_id: `unknown`"),
      };
      assertHasFinding(queueFindings(texts), /requires source_intake_batch_id=not_applicable exactly/, "terminal queue reset with unknown batch rejected");
    },
  ],
  [
    "terminal queue reset with n/a batch rejected",
    () => {
      const texts = {
        status: statusInProgress("", terminalSourceStatus()),
        queue: sequentialQueue().replace("source_intake_batch_id: `not_applicable`", "source_intake_batch_id: `n/a`"),
      };
      assertHasFinding(queueFindings(texts), /requires source_intake_batch_id=not_applicable exactly/, "terminal queue reset with n/a batch rejected");
    },
  ],
  [
    "initial STATUS with none source-intake fields rejected",
    () => {
      const texts = {
        status: statusInProgress("", {
          status: "not_started",
          runnerMode: "not_applicable",
          batchId: "none",
          waitState: "not_started",
          latestCandidateCards: "none",
          cachePromoteLog: "none",
        }),
        queue: sequentialQueue(),
      };
      assertHasFinding(queueFindings(texts), /source_intake_batch_id=not_applicable/, "initial STATUS with none source-intake fields rejected");
    },
  ],
  [
    "terminal STATUS with stale active queue fields rejected",
    () => {
      const texts = { status: statusInProgress("", terminalSourceStatus()), queue: fanInQueue() };
      assertHasFinding(queueFindings(texts), /terminal STATUS source-intake outcome requires QUEUE active fields reset/, "terminal STATUS with stale active queue fields rejected");
    },
  ],
  [
    "terminal source intake stale active state rejected",
    () => {
      const texts = { status: statusInProgress("", terminalSourceStatus({ waitState: "integrated" })), queue: fanInQueue({ waitState: "integrated", includeCandidateCardPath: false }) };
      assertHasFinding(queueFindings(texts), /terminal source_intake_wait_state=integrated must reset active queue fields/, "terminal source intake stale active state rejected");
    },
  ],
  [
    "terminal source intake closing fan-in task passes",
    () => {
      const texts = { status: statusInProgress("", terminalSourceStatus({ waitState: "integrated" })), queue: fanInQueue({ waitState: "integrated" }) };
      assertNoFindings(queueFindings(texts), "terminal source intake closing fan-in task passes");
    },
  ],
  [
    "terminal source intake closing fan-in with concrete cache files passes",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["intake/b1/candidate-cards.md", "promote-log.md"]);
        const candidateCardPath = resolve(runRoot, "_cache", "intake", "b1", "candidate-cards.md");
        const texts = {
          status: statusInProgress("", terminalSourceStatus({ waitState: "integrated", latestCandidateCards: candidateCardPath })),
          queue: fanInQueue({ waitState: "integrated", candidateCardPath }),
          plan: planWithRunDir(runRoot),
        };
        assertNoFindings(queueFindings(texts), "terminal source intake closing fan-in with concrete cache files passes");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "terminal source intake closing fan-in rejects missing promote log on disk",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["intake/b1/candidate-cards.md"]);
        const candidateCardPath = resolve(runRoot, "_cache", "intake", "b1", "candidate-cards.md");
        const texts = {
          status: statusInProgress("", terminalSourceStatus({ waitState: "integrated", latestCandidateCards: candidateCardPath })),
          queue: fanInQueue({ waitState: "integrated", candidateCardPath }),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /cache file does not exist: _cache\/promote-log\.md/, "terminal source intake closing fan-in rejects missing promote log on disk");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "integrated source intake closeout rejects missing promote log write",
    () => {
      const texts = {
        status: statusInProgress("", terminalSourceStatus({ waitState: "integrated" })),
        queue: fanInQueue({ waitState: "integrated" }).replace("; _cache/promote-log.md", ""),
      };
      assertHasFinding(queueFindings(texts), /integrated source-intake closeout must write _cache\/promote-log\.md/, "integrated source intake closeout rejects missing promote log write");
    },
  ],
  [
    "failed source intake closeout with retrieval-results passes",
    () => {
      const texts = {
        status: statusInProgress("", terminalSourceStatus({ status: "failed", waitState: "failed", latestCandidateCards: "not_applicable" })),
        queue: terminalCloseoutQueue({ waitState: "failed", evidencePath: "_cache/intake/b1/retrieval-results.md" }),
      };
      assertNoFindings(queueFindings(texts), "failed source intake closeout with retrieval-results passes");
    },
  ],
  [
    "failed source intake closeout with concrete retrieval-results passes",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["intake/b1/retrieval-results.md", "promote-log.md"]);
        const evidencePath = resolve(runRoot, "_cache", "intake", "b1", "retrieval-results.md");
        const texts = {
          status: statusInProgress("", terminalSourceStatus({ status: "failed", waitState: "failed", latestCandidateCards: "not_applicable" })),
          queue: terminalCloseoutQueue({ waitState: "failed", evidencePath }),
          plan: planWithRunDir(runRoot),
        };
        assertNoFindings(queueFindings(texts), "failed source intake closeout with concrete retrieval-results passes");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "failed source intake closeout rejects missing cited retrieval-results on disk",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["promote-log.md"]);
        const evidencePath = resolve(runRoot, "_cache", "intake", "b1", "retrieval-results.md");
        const texts = {
          status: statusInProgress("", terminalSourceStatus({ status: "failed", waitState: "failed", latestCandidateCards: "not_applicable" })),
          queue: terminalCloseoutQueue({ waitState: "failed", evidencePath }),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /cache file does not exist: _cache\/intake\/b1\/retrieval-results\.md/, "failed source intake closeout rejects missing cited retrieval-results on disk");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "failed source intake closeout rejects missing promote log write",
    () => {
      const texts = {
        status: statusInProgress("", terminalSourceStatus({ status: "failed", waitState: "failed", latestCandidateCards: "not_applicable" })),
        queue: terminalCloseoutQueue({ waitState: "failed", evidencePath: "_cache/intake/b1/retrieval-results.md" }).replace("_cache/promote-log.md; ", ""),
      };
      assertHasFinding(queueFindings(texts), /failed source-intake closeout must write _cache\/promote-log\.md/, "failed source intake closeout rejects missing promote log write");
    },
  ],
  [
    "suspended source intake closeout with excluded note passes",
    () => {
      const texts = {
        status: statusInProgress("", terminalSourceStatus({ status: "suspended", waitState: "suspended", latestCandidateCards: "not_applicable" })),
        queue: terminalCloseoutQueue({ waitState: "suspended", evidencePath: "_cache/excluded/b1-excluded.md" }),
      };
      assertNoFindings(queueFindings(texts), "suspended source intake closeout with excluded note passes");
    },
  ],
  [
    "suspended source intake closeout with concrete excluded note passes",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["excluded/b1-excluded.md", "promote-log.md"]);
        const evidencePath = resolve(runRoot, "_cache", "excluded", "b1-excluded.md");
        const texts = {
          status: statusInProgress("", terminalSourceStatus({ status: "suspended", waitState: "suspended", latestCandidateCards: "not_applicable" })),
          queue: terminalCloseoutQueue({ waitState: "suspended", evidencePath }),
          plan: planWithRunDir(runRoot),
        };
        assertNoFindings(queueFindings(texts), "suspended source intake closeout with concrete excluded note passes");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "suspended source intake closeout rejects missing cited excluded note on disk",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        writeRunCacheFiles(runRoot, ["promote-log.md"]);
        const evidencePath = resolve(runRoot, "_cache", "excluded", "b1-excluded.md");
        const texts = {
          status: statusInProgress("", terminalSourceStatus({ status: "suspended", waitState: "suspended", latestCandidateCards: "not_applicable" })),
          queue: terminalCloseoutQueue({ waitState: "suspended", evidencePath }),
          plan: planWithRunDir(runRoot),
        };
        assertHasFinding(queueFindings(texts), /cache file does not exist: _cache\/excluded\/b1-excluded\.md/, "suspended source intake closeout rejects missing cited excluded note on disk");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "suspended source intake closeout rejects missing promote log write",
    () => {
      const texts = {
        status: statusInProgress("", terminalSourceStatus({ status: "suspended", waitState: "suspended", latestCandidateCards: "not_applicable" })),
        queue: terminalCloseoutQueue({ waitState: "suspended", evidencePath: "_cache/excluded/b1-excluded.md" }).replace("_cache/promote-log.md; ", ""),
      };
      assertHasFinding(queueFindings(texts), /suspended source-intake closeout must write _cache\/promote-log\.md/, "suspended source intake closeout rejects missing promote log write");
    },
  ],
];

runIfMain(import.meta.url, tests);
