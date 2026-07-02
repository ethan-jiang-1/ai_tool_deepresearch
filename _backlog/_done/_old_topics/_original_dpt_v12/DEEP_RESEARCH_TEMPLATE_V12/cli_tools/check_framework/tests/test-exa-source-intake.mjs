import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { runIfMain } from "./test-runtime-harness.mjs";

const SCRIPT = resolve(
  "DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12",
  "flows/source-intake-profiles/scripts/exa-source-intake.mjs",
);

const {
  buildSearchPlan,
  renderRetrievalResults,
  runExaPass,
  runnerResultFor,
  sanitizePayload,
} = await import(pathToFileURL(SCRIPT).href);

export function hasUsableExaApiKey(env = process.env) {
  const key = String(env.EXA_API_KEY || "").trim();
  if (key.length < 20) {
    return false;
  }
  return !/^(test|dummy|placeholder|changeme|your[-_ ]?api[-_ ]?key|replace[-_ ]?me)$/i.test(key);
}

export function liveExaTestsEnabled(env = process.env) {
  return env.EXA_RUN_LIVE_TESTS === "1" && hasUsableExaApiKey(env);
}

let liveExaPreflightResult = null;

async function liveExaPreflight(env = process.env) {
  if (!liveExaTestsEnabled(env)) {
    return { ok: false, skipReason: "requires EXA_RUN_LIVE_TESTS=1 and a usable EXA_API_KEY" };
  }
  if (liveExaPreflightResult) {
    return liveExaPreflightResult;
  }
  const result = await runExaPass({
    id: "live-auth-preflight",
    purpose: "validate Exa API key before live regression smoke test",
    payload: {
      query: "official Exa documentation",
      type: "fast",
      numResults: 1,
    },
  }, env.EXA_API_KEY, 10000);
  liveExaPreflightResult = result.ok
    ? { ok: true }
    : { ok: false, skipReason: `Exa preflight failed (${result.status}: ${result.error || "no error detail"})` };
  return liveExaPreflightResult;
}

function maybeLiveExaTest(label, run) {
  return [
    label,
    () => {
      const preflight = DEFAULT_LIVE_EXA_PREFLIGHT;
      if (!preflight.ok) {
        console.log(`SKIP ${label} (${preflight.skipReason})`);
        return;
      }
      run();
    },
  ];
}

const DEFAULT_LIVE_EXA_PREFLIGHT = await liveExaPreflight();

function requestFile(runRoot, request) {
  const path = join(runRoot, "request.json");
  writeFileSync(path, JSON.stringify(request), "utf8");
  return path;
}

function payloadById(plan, id) {
  const pass = plan.passes.find((candidate) => candidate.id === id);
  assert.ok(pass, `expected pass ${id}`);
  return pass.payload;
}

export const tests = [
  [
    "sanitizePayload strips unsupported people filters",
    () => {
      const payload = sanitizePayload({
        query: "AI safety researchers",
        type: "auto",
        category: "people",
        includeDomains: ["linkedin.com"],
        excludeDomains: ["reddit.com"],
        startPublishedDate: "2024-01-01",
        endPublishedDate: "2026-12-31",
        startCrawlDate: "2024-01-01",
        endCrawlDate: "2026-12-31",
        userLocation: "US",
      });
      assert.equal(payload.includeDomains, undefined);
      assert.equal(payload.excludeDomains, undefined);
      assert.equal(payload.startPublishedDate, undefined);
      assert.equal(payload.endPublishedDate, undefined);
      assert.equal(payload.startCrawlDate, undefined);
      assert.equal(payload.endCrawlDate, undefined);
      assert.equal(payload.userLocation, undefined);
    },
  ],
  [
    "sanitizePayload strips unsupported company filters",
    () => {
      const payload = sanitizePayload({
        query: "AI startups",
        type: "auto",
        category: "company",
        includeDomains: ["crunchbase.com"],
        excludeDomains: ["medium.com"],
        startPublishedDate: "2024-01-01",
        endPublishedDate: "2026-12-31",
        startCrawlDate: "2024-01-01",
        endCrawlDate: "2026-12-31",
        userLocation: "US",
      });
      assert.equal(payload.includeDomains, undefined);
      assert.equal(payload.excludeDomains, undefined);
      assert.equal(payload.startPublishedDate, undefined);
      assert.equal(payload.endPublishedDate, undefined);
      assert.equal(payload.startCrawlDate, undefined);
      assert.equal(payload.endCrawlDate, undefined);
      assert.equal(payload.userLocation, undefined);
    },
  ],
  [
    "people dry-run plan preserves filters in natural language only",
    () => {
      const plan = buildSearchPlan({
        intake_goal: "people search for AI safety researchers",
        source_preferences: {
          preferred_source_families: "linkedin.com; anthropic.com",
          source_date_window: "2024-2026",
          geography_or_jurisdiction: "US",
          exclusion_rules: "reddit.com",
        },
        exclusion_rules: "medium.com",
      }, { budget: "standard", maxCalls: null });
      const peoplePayload = payloadById(plan, "category-people");
      assert.equal(peoplePayload.category, "people");
      assert.equal(peoplePayload.includeDomains, undefined);
      assert.equal(peoplePayload.excludeDomains, undefined);
      assert.equal(peoplePayload.startPublishedDate, undefined);
      assert.equal(peoplePayload.endPublishedDate, undefined);
      assert.equal(peoplePayload.userLocation, undefined);
      assert.match(peoplePayload.query, /2024-2026/);
      assert.match(peoplePayload.query, /US/);
      assert.match(peoplePayload.query, /linkedin\.com/);
      assert.match(peoplePayload.query, /reddit\.com/);
    },
  ],
  [
    "people dry-run plan preserves method constraint dates in natural language only",
    () => {
      const plan = buildSearchPlan({
        intake_goal: "people search for AI safety researchers",
        method_constraints: "use sources since 2024 and avoid stale profiles",
      }, { budget: "standard", maxCalls: null });
      const peoplePayload = payloadById(plan, "category-people");
      assert.equal(peoplePayload.category, "people");
      assert.equal(peoplePayload.startPublishedDate, undefined);
      assert.equal(peoplePayload.endPublishedDate, undefined);
      assert.match(peoplePayload.query, /since 2024/);
      assert.match(peoplePayload.query, /avoid stale profiles/);
    },
  ],
  [
    "company dry-run plan preserves filters in natural language only",
    () => {
      const plan = buildSearchPlan({
        intake_goal: "company search for AI startups",
        source_preferences: {
          preferred_source_families: "crunchbase.com; ycombinator.com",
          source_date_window: "2024-2026",
          geography_or_jurisdiction: "US",
          exclusion_rules: "reddit.com",
        },
      }, { budget: "standard", maxCalls: null });
      const companyPayload = payloadById(plan, "category-company");
      assert.equal(companyPayload.category, "company");
      assert.equal(companyPayload.includeDomains, undefined);
      assert.equal(companyPayload.excludeDomains, undefined);
      assert.equal(companyPayload.startPublishedDate, undefined);
      assert.equal(companyPayload.endPublishedDate, undefined);
      assert.equal(companyPayload.userLocation, undefined);
      assert.match(companyPayload.query, /2024-2026/);
      assert.match(companyPayload.query, /US/);
      assert.match(companyPayload.query, /crunchbase\.com/);
    },
  ],
  [
    "semantic plan requests text excerpts for source substance",
    () => {
      const plan = buildSearchPlan({ intake_goal: "deep research source intake" }, { budget: "minimal", maxCalls: null });
      const semanticPayload = payloadById(plan, "semantic-discovery");
      assert.equal(semanticPayload.contents.text.maxCharacters, 3000);
    },
  ],
  [
    "runnerResultFor treats partial success with candidates as success",
    () => {
      const result = runnerResultFor(
        [
          { ok: true, response: { results: [{ url: "https://example.com", title: "Example" }] } },
          { ok: false, status: 500, error: "server error" },
        ],
        [{ candidateId: "exa-001" }],
      );
      assert.equal(result, "success");
    },
  ],
  [
    "retrieval results preserve Exa returned text without extra condensation",
    () => {
      const longText = "hard-content-".repeat(220);
      const output = renderRetrievalResults({
        batchId: "b01",
        plan: { passes: [], intent: { advanced: false, reasons: [], categories: [] } },
        results: [],
        candidates: [{
          candidateId: "exa-001",
          title: "Long hard content",
          url: "https://example.com/source",
          diagnostic: { domain: "example.com" },
          passes: ["semantic-discovery"],
          categories: [],
          publishedDate: null,
          author: null,
          summary: "Full summary should stay intact.",
          highlights: ["First hard detail.", "Second hard detail."],
          text: longText,
        }],
        runnerResult: "success",
      });
      assert.equal(output.includes(longText), true);
      assert.doesNotMatch(output, /\.\.\./);
    },
  ],
  [
    "runnerResultFor treats no usable candidates as fail_soft",
    () => {
      assert.equal(runnerResultFor([{ ok: true, response: { results: [] } }], []), "fail_soft");
      assert.equal(runnerResultFor([{ ok: false, status: 500, error: "server error" }], []), "fail_soft");
    },
  ],
  [
    "missing API key writes fail_soft cache and exits zero",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-exa-missing-key-"));
      try {
        const req = requestFile(runRoot, { intake_goal: "test query" });
        const envFile = join(runRoot, "empty.env");
        writeFileSync(envFile, "# intentionally empty\n", "utf8");
        const env = { ...process.env };
        delete env.EXA_API_KEY;
        delete env.DEEP_RESEARCH_PROJECT_ROOT;
        delete env.EXA_ENV_FILE;
        const result = spawnSync(process.execPath, [
          SCRIPT,
          "--run-dir", runRoot,
          "--batch-id", "missing-key",
          "--request", req,
          "--env-file", envFile,
          "--budget", "minimal",
        ], { cwd: runRoot, env, encoding: "utf8" });
        assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assert.match(result.stdout, /FAIL_SOFT/);
        const cardsPath = join(runRoot, "_cache", "intake", "missing-key", "candidate-cards.md");
        const retrievalPath = join(runRoot, "_cache", "intake", "missing-key", "retrieval-results.md");
        assert.equal(existsSync(cardsPath), true);
        assert.equal(existsSync(retrievalPath), true);
        assert.match(readFileSync(cardsPath, "utf8"), /runner_result: `fail_soft`/);
        assert.match(readFileSync(cardsPath, "utf8"), /native_search/);
        assert.match(readFileSync(retrievalPath, "utf8"), /missing EXA_API_KEY/);
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "live Exa syntactic gate rejects missing or placeholder keys",
    () => {
      assert.equal(liveExaTestsEnabled({ EXA_RUN_LIVE_TESTS: "1" }), false);
      assert.equal(liveExaTestsEnabled({ EXA_RUN_LIVE_TESTS: "1", EXA_API_KEY: "dummy" }), false);
      assert.equal(liveExaTestsEnabled({ EXA_RUN_LIVE_TESTS: "0", EXA_API_KEY: "x".repeat(40) }), false);
      assert.equal(liveExaTestsEnabled({ EXA_RUN_LIVE_TESTS: "1", EXA_API_KEY: "x".repeat(40) }), true);
    },
  ],
  [
    "live Exa preflight skips non-usable keys before normal live smoke",
    () => {
      assert.equal(liveExaTestsEnabled({ EXA_RUN_LIVE_TESTS: "1", EXA_API_KEY: "dummy" }), false);
    },
  ],
  maybeLiveExaTest("optional live Exa smoke test is gated by key validity", () => {
    const runRoot = mkdtempSync(join(tmpdir(), "v12-exa-live-"));
    try {
      const req = requestFile(runRoot, { intake_goal: "official Exa documentation", source_preferences: { preferred_source_families: "exa.ai" } });
      const result = spawnSync(process.execPath, [
        SCRIPT,
        "--run-dir", runRoot,
        "--batch-id", "live-smoke",
        "--request", req,
        "--budget", "minimal",
        "--max-calls", "1",
        "--timeout-ms", "20000",
      ], { cwd: runRoot, env: process.env, encoding: "utf8" });
      assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
      assert.match(result.stdout, /SUCCESS/, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
      const cardsPath = join(runRoot, "_cache", "intake", "live-smoke", "candidate-cards.md");
      assert.equal(existsSync(cardsPath), true);
      assert.match(readFileSync(cardsPath, "utf8"), /runner_result: `success`/);
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
    }
  }),
];

runIfMain(import.meta.url, tests);
