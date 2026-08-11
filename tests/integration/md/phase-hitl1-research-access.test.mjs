// @impl REA-002, PRP-002, PRP-005, PRP-015, HIU-002
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

import {
  ResearchAccessBoundaryExtent,
  ResearchAccessBoundaryLocation,
  SourceClass,
  SourceClassReachability,
} from '../../../DEEP_RESEARCH_HARNESS/schema/index.mjs';

const PHASE_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md', import.meta.url);
const GUIDE_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md', import.meta.url);
const CONTROLLER_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-research-access-envelope.md', import.meta.url);
const BRIEF_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md', import.meta.url);
const ADAPTER_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md', import.meta.url);

const phase = readFileSync(PHASE_PATH, 'utf8');
const guide = readFileSync(GUIDE_PATH, 'utf8');
const controller = readFileSync(CONTROLLER_PATH, 'utf8');
const brief = readFileSync(BRIEF_PATH, 'utf8');
const adapter = readFileSync(ADAPTER_PATH, 'utf8');
const phaseFrontmatter = parseYaml(phase.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');
const controllerFrontmatter = parseYaml(controller.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');
const ladder = parseYaml(controller.match(/```yaml\n(source_class_ladder:[\s\S]*?)\n```/)?.[1] || '');
const probe = phase.slice(
  phase.indexOf('### 3d. Research Access Probe'),
  phase.indexOf('## 4. Expected Artifacts'),
);

describe('HITL1 research-access static guidance', () => {
  it('keeps the source-class ladder and both closed axes in one independent controller', () => {
    assert.equal(controllerFrontmatter.node_type, 'shared');
    assert.equal(controllerFrontmatter.shared_scope, 'hitl1-research-access-envelope');
    assert.equal(controllerFrontmatter.authority, 'guidance-only');
    assert.equal(controllerFrontmatter.actor_delivery, 'required');
    assert.deepEqual(ladder.source_class_ladder.map((entry) => entry.source_class), SourceClass.options);
    assert.deepEqual(ladder.source_class_ladder.map((entry) => entry.query), [
      'site:wikipedia.org "Internet protocol suite"',
      'site:github.com "Hello World"',
      '"Internet protocol suite"',
    ]);
    for (const value of SourceClassReachability.options) assert.match(controller, new RegExp(`\\\`${value}\\\``));
    for (const value of ResearchAccessBoundaryLocation.options) assert.match(controller, new RegExp(`\\\`${value}\\\``));
    for (const value of ResearchAccessBoundaryExtent.options) assert.match(controller, new RegExp(`\\\`${value}\\\``));
    assert.doesNotMatch(controller, /rb_profile\.yaml|run bundle|Gate authority/);
  });

  it('keeps traversal, classification, and compact returns exclusively in the controller', () => {
    const fallback = "curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'";

    assert.match(controller, /exactly one native search/);
    assert.match(controller, /at most the first three syntactically[\s\S]*eligible HTTP\(S\) URLs in provider order/);
    assert.match(controller, /selected native fetch surface once first/);
    assert.ok(controller.includes(fallback));
    assert.match(controller, /first real-content success, stop the entire ladder/);
    assert.match(controller, /later class `not_attempted`/);
    assert.match(controller, /Do\s+not infer a boundary from reason prose/);
    assert.match(controller, /honest unclassified result/);
    assert.match(controller, /no surrounding prose\s+or additional fields/);
    assert.match(controller, /Do not persist probe material as evidence, cache, artifacts, receipts/);
    assert.doesNotMatch(controller, /retry state[\s\S]*retry state/);
  });

  it('requires and actor-delivers the controller without duplicating its control content', () => {
    assert.equal(phaseFrontmatter.stop, 'yes');
    assert.ok(phaseFrontmatter.requires.includes('shared/shared-hitl1-capability-probe'));
    assert.ok(phaseFrontmatter.requires.includes('shared/shared-hitl1-research-access-envelope'));
    assert.match(probe, /actor-deliver/);
    assert.match(probe, /adapter 的 selected-host operation facts/);
    assert.match(probe, /独立 controller 原样 actor-deliver/);
    assert.match(probe, /Phase Agent SHALL NOT 直接调用 native search 或 fetch/);
    assert.match(probe, /`rb_profile\.yaml#\/research_access` 的唯一 writer/);
    assert.match(probe, /probe_relay, extent: universal/);
    assert.match(probe, /每个 declared class 的 `unreachable` envelope entry/);
    for (const forbidden of [
      /site:wikipedia\.org/,
      /site:github\.com/,
      /"Internet protocol suite"/,
      /first three syntactically eligible/,
      /curl --fail/,
      /surface_absent:/,
      /permission_required:/,
    ]) {
      assert.doesNotMatch(probe, forbidden);
    }
  });

  it('keeps the adapter and generic guide free of controller declarations', () => {
    assert.match(guide, /controller is required/);
    assert.match(guide, /Do not add a search, candidate, fetch, traversal, fallback, classification, return/);
    for (const surface of [adapter, guide]) {
      for (const forbidden of [
        /encyclopedia/,
        /code_host/,
        /general_web/,
        /Internet protocol suite/,
        /Hello World/,
        /source_class_reachability/,
        /access_boundary/,
        /unavailable_roots/,
        /surface_absent:/,
        /permission_required:/,
        /curl --fail/,
      ]) {
        assert.doesNotMatch(surface, forbidden);
      }
    }
    assert.match(adapter, /deepseek_anthropic_compatible/);
    assert.match(adapter, /WebSearch/);
    assert.match(adapter, /WebFetch/);
  });

  it('renders exact available-only partial disclosure without another decision point', () => {
    const disclosure = '联网能力正常，不过有部分来源这次够不着（<不可达来源类别>），研究会继续，用够得着的来源做。';

    assert.ok(brief.includes(disclosure));
    assert.match(probe, /recorded envelope 有一个或多个 `unreachable` class/);
    assert.match(probe, /仅以那些 recorded class 填入/);
    assert.match(probe, /不提供选项、不请求指示、不创建 checkpoint 或阻断同一个 Gate/);
    assert.match(phase, /Probe URL、page content 和 tool output SHALL NOT 写入或计入 `reference\//);
    assert.match(phase, /无需第二次确认/);
    assert.doesNotMatch(probe, /HITL checkpoint/);
  });
});
