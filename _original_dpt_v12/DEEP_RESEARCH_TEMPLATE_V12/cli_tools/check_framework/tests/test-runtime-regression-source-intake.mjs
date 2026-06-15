import {
  assertHasFinding,
  assertNoFindings,
  activeQueueHeader,
  directReferenceQueue,
  inlineSourceIntakeQueue,
  join,
  mkdtempSync,
  notApplicableSearchQueue,
  planWithRunDir,
  queueFindings,
  resolve,
  rmSync,
  rollingTaskProjectionFindings,
  runIfMain,
  runningSourceStatus,
  sourceIntakeQueue,
  sourceIntakeWriteTargets,
  statusInProgress,
  terminalSourceStatus,
  tmpdir,
} from "./test-runtime-harness.mjs";

export const tests = [
  [
    "foreground source intake cache writes pass",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue() };
      const findings = [
        ...queueFindings(texts),
        ...rollingTaskProjectionFindings(texts),
      ];
      assertNoFindings(findings, "foreground source intake cache writes pass");
    },
  ],
  [
    "foreground source intake absolute run-local cache write passes",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        const writePath = sourceIntakeWriteTargets({ runRoot });
        const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(writePath), plan: planWithRunDir(runRoot) };
        assertNoFindings(queueFindings(texts), "foreground source intake absolute run-local cache write passes");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "STATUS QUEUE mismatch during running rejected",
    () => {
      const texts = {
        status: statusInProgress("", runningSourceStatus({ runnerMode: "inline_main_agent" })),
        queue: sourceIntakeQueue(),
      };
      assertHasFinding(queueFindings(texts), /STATUS source-intake fields must mirror QUEUE while source_intake_wait_state=running/, "STATUS QUEUE mismatch during running rejected");
    },
  ],
  [
    "foreground source intake missing intake request rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(sourceIntakeWriteTargets({ omit: ["intake-request.md"] })) };
      assertHasFinding(queueFindings(texts), /must write _cache\/intake\/b1\/intake-request\.md/, "foreground source intake missing intake request rejected");
    },
  ],
  [
    "foreground source intake missing retrieval results rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(sourceIntakeWriteTargets({ omit: ["retrieval-results.md"] })) };
      assertHasFinding(queueFindings(texts), /must write _cache\/intake\/b1\/retrieval-results\.md/, "foreground source intake missing retrieval results rejected");
    },
  ],
  [
    "foreground source intake missing candidate cards rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(sourceIntakeWriteTargets({ omit: ["candidate-cards.md"] })) };
      assertHasFinding(queueFindings(texts), /must write _cache\/intake\/b1\/candidate-cards\.md/, "foreground source intake missing candidate cards rejected");
    },
  ],
  [
    "foreground source intake missing capture manifest rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(sourceIntakeWriteTargets({ omit: ["capture-manifest.md"] })) };
      assertHasFinding(queueFindings(texts), /must write _cache\/intake\/b1\/capture-manifest\.md/, "foreground source intake missing capture manifest rejected");
    },
  ],
  [
    "foreground source intake missing excluded note rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(sourceIntakeWriteTargets({ omit: ["excluded.md"] })) };
      assertHasFinding(queueFindings(texts), /must write _cache\/excluded\/b1-excluded\.md/, "foreground source intake missing excluded note rejected");
    },
  ],
  [
    "foreground source intake capture manifest path passes",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(sourceIntakeWriteTargets()) };
      assertNoFindings(queueFindings(texts), "foreground source intake capture manifest path passes");
    },
  ],
  [
    "foreground source intake direct capture path rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(`${sourceIntakeWriteTargets()}; _cache/captures/source-a.md`) };
      assertHasFinding(queueFindings(texts), /capture-manifest\.md instead of predeclaring _cache\/captures paths/, "foreground source intake direct capture path rejected");
    },
  ],
  [
    "foreground source intake direct reference write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue("seed_topics/_reference/t1-direct.md") };
      assertHasFinding(queueFindings(texts), /must stay in exact _cache staging paths until main-agent fan-in/, "foreground source intake direct reference write rejected");
    },
  ],
  [
    "foreground source intake absolute external cache write rejected",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-cache-regression-"));
      try {
        const externalPath = resolve(tmpdir(), "other", "_cache", "intake", "b1", "candidate-cards.md");
        const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue(externalPath), plan: planWithRunDir(runRoot) };
        assertHasFinding(queueFindings(texts), /must stay in exact run-local _cache staging paths/, "foreground source intake absolute external cache write rejected");
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "foreground source intake traversal cache write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue("../_cache/intake/b1/candidate-cards.md") };
      assertHasFinding(queueFindings(texts), /must stay in exact run-local _cache staging paths/, "foreground source intake traversal cache write rejected");
    },
  ],
  [
    "foreground source intake nested cache write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue("scratch/_cache/intake/b1/candidate-cards.md") };
      assertHasFinding(queueFindings(texts), /must stay in exact run-local _cache staging paths/, "foreground source intake nested cache write rejected");
    },
  ],
  [
    "foreground source intake framework cache write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue("_framework/_cache/noise.md") };
      assertHasFinding(queueFindings(texts), /must not write mutable cache files inside _framework/, "foreground source intake framework cache write rejected");
    },
  ],
  [
    "foreground source intake promote log write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue("_cache/promote-log.md") };
      assertHasFinding(queueFindings(texts), /must not write _cache\/promote-log\.md before main-agent fan-in/, "foreground source intake promote log write rejected");
    },
  ],
  [
    "foreground source intake directory write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue("_cache/intake/b1/") };
      assertHasFinding(queueFindings(texts), /not a directory or arbitrary file/, "foreground source intake directory write rejected");
    },
  ],
  [
    "foreground source intake non-md cache write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue("_cache/intake/b1/raw.txt") };
      assertHasFinding(queueFindings(texts), /not a directory or arbitrary file/, "foreground source intake non-md cache write rejected");
    },
  ],
  [
    "foreground source intake mismatched batch write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus()), queue: sourceIntakeQueue("_cache/intake/b2/candidate-cards.md") };
      assertHasFinding(queueFindings(texts), /batch id must match source_intake_batch_id=b1/, "foreground source intake mismatched batch write rejected");
    },
  ],
  [
    "foreground source intake inactive wait state rejected",
    () => {
      const texts = { status: statusInProgress("", terminalSourceStatus({ waitState: "integrated" })), queue: sourceIntakeQueue(sourceIntakeWriteTargets(), "integrated") };
      assertHasFinding(queueFindings(texts), /must use source_intake_wait_state=running/, "foreground source intake inactive wait state rejected");
    },
  ],
  [
    "inline source intake cache writes pass",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus({ runnerMode: "inline_main_agent" })), queue: inlineSourceIntakeQueue() };
      assertNoFindings(queueFindings(texts), "inline source intake cache writes pass");
    },
  ],
  [
    "inline source intake direct reference write rejected",
    () => {
      const texts = { status: statusInProgress("", runningSourceStatus({ runnerMode: "inline_main_agent" })), queue: inlineSourceIntakeQueue("seed_topics/_reference/t1-direct.md") };
      assertHasFinding(queueFindings(texts), /must stay in exact _cache staging paths until main-agent fan-in/, "inline source intake direct reference write rejected");
    },
  ],
  [
    "source intake task cannot use not_applicable runner",
    () => {
      const texts = { status: statusInProgress(), queue: notApplicableSearchQueue() };
      assertHasFinding(queueFindings(texts), /must use inline_main_agent or foreground_subagent_runner/, "source intake task cannot use not_applicable runner");
    },
  ],
  [
    "user final report view clarification is not source intake",
    () => {
      const queue = `${activeQueueHeader()}

### slot_1_current

- action: \`query user for final report view revision and record the selected synthesis lens\`
- trigger: \`HITL2 user_decision=request_view_revision requires user-view clarification\`
- done_condition: \`final_report_view and final_output_dir are recorded in PROFILE/STATUS projections\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`HITL2 view revision state updated without source-intake cache fields\`
`;
      const texts = { status: statusInProgress(), queue };
      assertNoFindings(
        queueFindings(texts).filter((finding) => /source-intake|source_intake|_cache/.test(finding.message)),
        "user final report view clarification is not source intake",
      );
    },
  ],
  [
    "source-qualified API query remains source intake",
    () => {
      const queue = directReferenceQueue("query API source for evidence and land reference directly");
      const texts = { status: statusInProgress(), queue };
      assertHasFinding(
        queueFindings(texts),
        /direct REFERENCE_DIR writes are valid only for already-known local\/user-provided sources/,
        "source-qualified API query remains source intake",
      );
    },
  ],
  [
    "direct retrieval to reference dir rejected without cache fan-in",
    () => {
      const texts = { status: statusInProgress(), queue: directReferenceQueue("run web search and land reference directly") };
      assertHasFinding(queueFindings(texts), /direct REFERENCE_DIR writes are valid only for already-known local\/user-provided sources/, "direct retrieval to reference dir rejected without cache fan-in");
    },
  ],
  [
    "direct find source to reference dir rejected without cache fan-in",
    () => {
      const texts = { status: statusInProgress(), queue: directReferenceQueue("find next authoritative source") };
      assertHasFinding(queueFindings(texts), /direct REFERENCE_DIR writes are valid only for already-known local\/user-provided sources/, "direct find source to reference dir rejected without cache fan-in");
    },
  ],
  [
    "generic direct reference landing rejected without cache fan-in",
    () => {
      const texts = { status: statusInProgress(), queue: directReferenceQueue("land next high-value reference directly") };
      assertHasFinding(queueFindings(texts), /reference acquisition slot_1_current must write source-intake cache outputs first/, "generic direct reference landing rejected without cache fan-in");
    },
  ],
  [
    "direct reference landing with no retrieval only rejected without known source",
    () => {
      const texts = { status: statusInProgress(), queue: directReferenceQueue("land next high-value reference with no retrieval, no search, and no fetch") };
      assertHasFinding(queueFindings(texts), /direct REFERENCE_DIR writes are valid only for already-known local\/user-provided sources/, "direct reference landing with no retrieval only rejected without known source");
    },
  ],
  [
    "direct reference exception missing no search and no fetch rejected",
    () => {
      const texts = { status: statusInProgress(), queue: directReferenceQueue("land already-known user-provided local source with no retrieval") };
      assertHasFinding(queueFindings(texts), /direct REFERENCE_DIR writes are valid only for already-known local\/user-provided sources/, "direct reference exception missing no search and no fetch rejected");
    },
  ],
  [
    "direct already-known user-provided local source reference write passes",
    () => {
      const texts = { status: statusInProgress(), queue: directReferenceQueue("land already-known user-provided local source with no retrieval, no search, and no fetch", "seed_topics/_reference/t1-direct.md").replace("reference file and index are updated", "already-known local source reference file and index are updated with no retrieval, no search, and no fetch") };
      assertNoFindings(queueFindings(texts), "direct already-known user-provided local source reference write passes");
    },
  ],
  [
    "setup reference navigation stubs pass direct-reference guard",
    () => {
      const texts = {
        status: statusInProgress(),
        queue: directReferenceQueue("initialize reference navigation stubs", "REFERENCE_DIR/README.md; REFERENCE_DIR/_INDEX.md"),
      };
      assertNoFindings(queueFindings(texts), "setup reference navigation stubs pass direct-reference guard");
    },
  ],
];

runIfMain(import.meta.url, tests);
