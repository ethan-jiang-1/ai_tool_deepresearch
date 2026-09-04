import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Post-C2 capability-split structure locks (2026-09-04 dwu-capability-identity-split):
// the four capability specs (mother + submission/preflight/correction) keep their
// per-file requirement counts, header enumerations, and inline req 1:1 lines.
// Retired predecessor: tests/engine/dwu-slim-structure-locks.test.mjs — its per-file
// heading/structure duty is taken over here; the 2026-09-01 slim-delta historical
// text conservation is superseded by archived-change record and these locks.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => readFileSync(join(repoRoot, rel), "utf8");
const dewPath = "openspec/specs/agent/delegated-work-units/spec.md";
const subPath = "openspec/specs/agent/work-unit-submission/spec.md";
const prePath = "openspec/specs/agent/work-unit-preflight/spec.md";
const corPath = "openspec/specs/agent/work-unit-correction/spec.md";
const agqPath = "openspec/specs/agent/agentic-queue/spec.md";
const registryPath = "openspec/governance/req-registry.yaml";

const dew = read(dewPath);
const sub = read(subPath);
const pre = read(prePath);
const cor = read(corPath);
const agq = read(agqPath);
const registry = read(registryPath);

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
  assert.ok(dupBlock, "DEW-009 requirement block must exist in the mother spec");
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

test("AGQ drain requirement carries the criterion-partition scope note (retargeted owners)", () => {
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
    body.includes("Timeout preflight SHALL\nbe a progress-aware read-only recommendation".replace("\n", " ")) ||
      body.includes("Timeout preflight SHALL be a progress-aware read-only recommendation"),
    "note must name the work-unit-preflight owner requirement",
  );
  assert.ok(
    body.includes("agent/work-unit-preflight"),
    "note must cite the work-unit-preflight capability",
  );
  assert.ok(
    body.includes("agent/work-unit-correction"),
    "note must cite the work-unit-correction capability",
  );
});

test("spec req header indexes match requirement counts (mother 16; new homes 8/6/9)", () => {
  const check = (text, prefix, expected, label) => {
    const header = text.split("\n").find((l) => l.startsWith(`> req: ${prefix}-`));
    assert.ok(header, `${label} header req line must exist`);
    const ids = header.match(/[A-Z]{3}-\d{3}/g) ?? [];
    assert.equal(ids.length, expected, `${label} header must list ${expected} IDs`);
    assert.equal(new Set(ids).size, expected, `${label} header IDs must be unique`);
    assert.equal(headingBlocks(text).length, expected, `${label} body must have ${expected} requirements`);
  };
  check(dew, "DEW", 16, "DEW(mother, post C2 split)");
  check(sub, "WSU", 8, "work-unit-submission");
  check(pre, "WUP", 6, "work-unit-preflight");
  check(cor, "WUC", 9, "work-unit-correction");

  const agqHeader = agq.split("\n").find((l) => l.startsWith("> req: AGQ-"));
  assert.ok(agqHeader, "AGQ header req line must exist");
  const agqIds = agqHeader.match(/AGQ-\d{3}/g) ?? [];
  assert.equal(agqIds.length, 28, "AGQ header must list 28 IDs");
  assert.equal(new Set(agqIds).size, 28, "AGQ header IDs must be unique");
  assert.equal(headingBlocks(agq).length, 30, "AGQ body must have 30 requirements after topic_deepening split");
});

test("inline req lines are 1:1 with requirements in all four capability specs", () => {
  const specs = [
    [dew, "DEW", 16, "mother"],
    [sub, "WSU", 8, "work-unit-submission"],
    [pre, "WUP", 6, "work-unit-preflight"],
    [cor, "WUC", 9, "work-unit-correction"],
  ];
  for (const [text, prefix, expected, label] of specs) {
    const inline = text.split("\n").filter((l) => new RegExp(`^> req: ${prefix}-\\d{3}$`).test(l));
    assert.equal(inline.length, expected, `${label} inline lines must be 1:1 (${expected})`);
    const ids = inline.map((l) => l.match(/[A-Z]{3}-\d{3}/)[0]);
    assert.equal(new Set(ids).size, expected, `${label} inline req IDs must be unique`);
  }
});

test("registry carries migrated and newly registered requirement IDs with successor pointers", () => {
  for (const id of ["WSU-001", "WSU-008", "WUP-001", "WUP-006", "WUC-001", "WUC-009", "DEW-032", "DEW-033"]) {
    assert.ok(registry.includes(`${id}: `), `registry must contain ${id}`);
  }
  // 17 migrated DEW IDs: deprecated with a successor pointer, never removed
  for (const [oldId, newId] of [
    ["DEW-005", "WSU-001"], ["DEW-012", "WSU-003"], ["DEW-024", "WUC-009"], ["DEW-031", "WUP-006"],
  ]) {
    const line = registry.split("\n").find((l) => l.startsWith(`${oldId}: `));
    assert.ok(line, `${oldId} must remain registered`);
    assert.ok(line.includes("[DEPRECATED]"), `${oldId} must carry the DEPRECATED marker`);
    assert.ok(line.includes(`migrated to ${newId}`), `${oldId} must point to ${newId}`);
  }
});
