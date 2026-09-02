import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dewPath = join(repoRoot, "openspec", "specs", "agent", "delegated-work-units", "spec.md");
const agqPath = join(repoRoot, "openspec", "specs", "agent", "agentic-queue", "spec.md");
const registryPath = join(repoRoot, "openspec", "governance", "req-registry.yaml");

const dew = readFileSync(dewPath, "utf8");
const agq = readFileSync(agqPath, "utf8");
const registry = readFileSync(registryPath, "utf8");

function headingBlocks(text) {
  const blocks = [];
  const lines = text.split("\n");
  let current = null;
  for (const line of lines) {
    if (line.startsWith("### Requirement: ")) {
      if (current) blocks.push(current);
      current = { heading: line, body: [] };
    } else if (current && !line.startsWith("### Requirement:")) {
      current.body.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

test("DEW-009 duplicate scenario is a merge declaration, not an independent requirement", () => {
  const dupBlock = headingBlocks(dew).find((b) =>
    b.heading.includes("Work-unit tasks SHALL carry absolute bundle-root paths"),
  );
  assert.ok(dupBlock, "DEW-009 requirement block must exist");
  const body = dupBlock.body.join("\n");
  assert.ok(
    body.includes('#### Scenario: Claimed task contains absolute runtime paths'),
    "retained scenario title must stay as the delta-sync key",
  );
  const scenarioStart = body.indexOf("#### Scenario: Claimed task contains absolute runtime paths");
  const scenarioEnd = body.indexOf("#### Scenario:", scenarioStart + 1);
  const scenario = body.slice(scenarioStart, scenarioEnd);
  assert.ok(
    scenario.includes("retained only as the OpenSpec delta-sync key"),
    "merge declaration must carry the retention note",
  );
  assert.ok(
    scenario.includes('"Claimed task contains one canonical absolute runtime root"'),
    "merge declaration must name the owning scenario",
  );
  assert.ok(
    !body.includes(
      "- **THEN** the generated task SHALL include `bundle_dir: /repo/dpt_rb_aidlc-investigation`",
    ),
    "the superseded independent SHALL line must not remain in the spec",
  );
});

test("AGQ drain requirement carries the criterion-partition scope note", () => {
  const drain = headingBlocks(agq).find((b) =>
    b.heading.includes("Phase drain includes queue demand and in-flight attempts"),
  );
  assert.ok(drain, "drain requirement must exist");
  const body = drain.body.join("\n").replace(/\n> /g, " ");
  assert.ok(body.includes("`deadline_at`"), "note must anchor the drain criterion");
  assert.ok(
    body.includes("`lease_anchor_at + idle_timeout_ms`"),
    "note must anchor the timeout-eligibility criterion",
  );
  assert.ok(
    body.includes("Timeout terminalization SHALL be guarded by progress-aware preflight"),
    "note must name the DEW-014 owner requirement",
  );
});

test("spec req header indexes match requirement counts", () => {
  const dewHeader = dew.split("\n").find((l) => l.startsWith("> req: DEW-"));
  assert.ok(dewHeader, "DEW header req line must exist");
  const dewIds = dewHeader.match(/DEW-\d{3}/g) ?? [];
  assert.equal(dewIds.length, 29, "DEW header must list 29 IDs");
  assert.equal(new Set(dewIds).size, 29, "DEW header IDs must be unique");
  // 2026-09-01-slim-dwu-requirements: 七条巨无霸 7→15 拆分（文本逐字保留）
  assert.equal(headingBlocks(dew).length, 37, "DEW body must have 37 requirements after mega splits");

  const agqHeader = agq.split("\n").find((l) => l.startsWith("> req: AGQ-"));
  assert.ok(agqHeader, "AGQ header req line must exist");
  const agqIds = agqHeader.match(/AGQ-\d{3}/g) ?? [];
  assert.equal(agqIds.length, 28, "AGQ header must list 28 IDs");
  assert.equal(new Set(agqIds).size, 28, "AGQ header IDs must be unique");
  // 2026-09-01-slim-agq-requirements: topic_deepening 1→3 拆分（文本逐字保留）
  assert.equal(headingBlocks(agq).length, 30, "AGQ body must have 30 requirements after topic_deepening split");
});

test("DEW inline req lines are 1:1 with requirements", () => {
  const inline = dew.split("\n").filter((l) => /^> req: DEW-\d{3}$/.test(l));
  assert.equal(inline.length, 29, "every DEW requirement carries exactly one inline req line");
  const ids = inline.map((l) => l.match(/DEW-\d{3}/)[0]);
  assert.equal(new Set(ids).size, 29, "inline req IDs must be unique");
});

test("registry carries the newly registered requirement IDs", () => {
  for (const id of ["DEW-027", "DEW-028", "DEW-029", "AGQ-028"]) {
    assert.ok(
      registry.includes(`${id}: `),
      `registry must contain ${id}`,
    );
  }
});
