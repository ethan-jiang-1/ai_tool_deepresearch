import {
  assertHasFinding,
  assertNoFindings,
  blockedQueueInvalidInterrupt,
  closedQueue,
  invalidParallelModeQueue,
  preResponseGateFindings,
  queueFindings,
  readinessFindings,
  rollingTaskProjectionFindings,
  runIfMain,
  statusCompleted,
  statusInProgress,
} from "./test-runtime-harness.mjs";

export const tests = [
  [
    "closed queue incomplete",
    () => {
      const texts = { status: statusCompleted(), queue: closedQueue({ omitSlot5: true }) };
      assertHasFinding(queueFindings(texts), /closed queue must keep slot_5_tail section/, "closed queue incomplete");
    },
  ],
  [
    "parallel execution mode rejected",
    () => {
      const texts = { status: statusInProgress(), queue: invalidParallelModeQueue() };
      assertHasFinding(queueFindings(texts), /execution_mode must be sequential/, "parallel execution mode rejected");
    },
  ],
  [
    "readiness item not all pass",
    () => {
      const texts = {
        status: statusCompleted({ topology_stability_check: "partial" }),
        queue: closedQueue(),
      };
      assertHasFinding(readinessFindings(texts), /topology_stability_check=partial/, "readiness item not all pass");
    },
  ],
  [
    "blocked state invalid interrupt",
    () => {
      const texts = {
        status: statusInProgress(`
- blocking_issue: \`missing credential required for mainline\`
`),
        queue: blockedQueueInvalidInterrupt(),
      };
      assertHasFinding(preResponseGateFindings(texts), /queue_health=blocked must sync a concrete Blocked State/, "blocked state invalid interrupt");
    },
  ],
  [
    "minimal pass run",
    () => {
      const texts = { status: statusCompleted(), queue: closedQueue() };
      const findings = [
        ...queueFindings(texts),
        ...rollingTaskProjectionFindings(texts),
        ...preResponseGateFindings(texts),
        ...readinessFindings(texts),
      ];
      assertNoFindings(findings, "minimal pass run");
    },
  ],
];

runIfMain(import.meta.url, tests);
