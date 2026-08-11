// @impl REA-002, REA-003, PRP-002, PRP-005, PRP-015, HIU-002, URC-001
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const PHASE_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md', import.meta.url);
const GUIDE_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md', import.meta.url);
const CONTROLLER_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-research-access-envelope.md', import.meta.url);
const BRIEF_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md', import.meta.url);
const PROFILE_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-profile.md', import.meta.url);
const ADAPTER_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md', import.meta.url);

const phase = readFileSync(PHASE_PATH, 'utf8');
const guide = readFileSync(GUIDE_PATH, 'utf8');
const controller = readFileSync(CONTROLLER_PATH, 'utf8');
const brief = readFileSync(BRIEF_PATH, 'utf8');
const profile = readFileSync(PROFILE_PATH, 'utf8');
const adapter = readFileSync(ADAPTER_PATH, 'utf8');
const phaseFrontmatter = parseYaml(phase.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');
const controllerFrontmatter = parseYaml(controller.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');
const probe = phase.slice(
  phase.indexOf('### 3d. Research Access Probe'),
  phase.indexOf('## 4. Expected Artifacts'),
);

describe('HITL1 research-access static guidance', () => {
  it('keeps one independent controller with the exact fixed sample suite and both closed axes', () => {
    assert.equal(controllerFrontmatter.node_type, 'shared');
    assert.equal(controllerFrontmatter.shared_scope, 'hitl1-research-access-envelope');
    assert.equal(controllerFrontmatter.authority, 'guidance-only');
    assert.equal(controllerFrontmatter.actor_delivery, 'required');

    for (const [sampleId, url] of [
      ['gov_cn', 'https://www.gov.cn/'],
      ['gitee', 'https://gitee.com/'],
      ['xinhuanet', 'https://www.news.cn/'],
      ['cnki_catalog', 'https://www.cnki.net/'],
      ['wikipedia', 'https://www.wikipedia.org/'],
      ['github', 'https://github.com/'],
      ['iana', 'https://www.iana.org/domains/reserved'],
      ['arxiv', 'https://arxiv.org/'],
      ['rfc_editor', 'https://www.rfc-editor.org/'],
    ]) {
      assert.ok(controller.includes(sampleId), `missing sample ${sampleId}`);
      assert.ok(controller.includes(url), `missing URL for ${sampleId}`);
    }

    for (const value of ['china', 'overseas']) assert.ok(controller.includes(value));
    for (const value of [
      'content', 'login_required', 'challenge', 'http_denied', 'rate_limited',
      'transport_inconclusive', 'failed', 'not_attempted', 'round_budget_not_attempted',
    ]) {
      assert.ok(controller.includes(`\`${value}\``), `missing outcome \`${value}\``);
    }
    for (const value of ['native', 'browser', 'node_fetch', 'curl']) {
      assert.ok(controller.includes(`\`${value}\``), `missing surface \`${value}\``);
    }
    // The controller explicitly disclaims bundle/Gate/evidence authority rather
    // than claiming it.
    assert.match(controller, /does not change host\s+permission, select a provider, create a lifecycle transition, write durable state, or\s+decide an Engine verdict/);
    assert.match(controller, /never\s+enter research evidence/);
    assert.doesNotMatch(controller, /run `check-gate|rb_profile\.yaml#\/research_access/);
  });

  it('keeps traversal, classification, and compact returns exclusively in the controller', () => {
    assert.match(controller, /Retrieve each fixed URL directly/);
    assert.match(controller, /At most 4 active sample retrievals/);
    assert.match(controller, /At most 2 active retrievals/);
    assert.match(controller, /90 seconds/);
    assert.match(controller, /12 seconds/);
    assert.match(controller, /30 seconds/);
    assert.match(controller, /One same-URL attempt, up to 30 seconds/);
    assert.match(controller, /No core success stops the other group/);
    assert.match(controller, /Only a `transport_inconclusive` terminal outcome qualifies/);
    assert.match(controller, /`login_required`, `challenge`, `http_denied`, and\s+`rate_limited` do not qualify/);
    assert.match(controller, /[Ww]hole no-request relay/);
    assert.match(controller, /`not_attempted`/);
    assert.match(controller, /round_budget_not_attempted/);
    assert.match(controller, /No boundary is\s+inferred from samples/);
    assert.match(controller, /never\s+enter research evidence/);
    assert.match(controller, /catalogue homepage is obtainable/);
    assert.match(controller, /never paper, article,\s+account, subscription, or full-text access/);
    assert.doesNotMatch(controller, /WebSearch/);
    assert.doesNotMatch(controller, /WebFetch/);
    assert.doesNotMatch(controller, /source_class_reachability/);
    assert.doesNotMatch(controller, /access_boundary/);
    // The controller disclaims search and candidate material rather than using it.
    assert.match(controller, /does not use search, candidate traversal/);
    assert.match(controller, /Never return page content, candidate lists/);
  });

  it('requires and actor-delivers the controller without duplicating its control content', () => {
    assert.equal(phaseFrontmatter.stop, 'yes');
    assert.ok(phaseFrontmatter.requires.includes('shared/shared-hitl1-capability-probe'));
    assert.ok(phaseFrontmatter.requires.includes('shared/shared-hitl1-research-access-envelope'));
    assert.match(probe, /actor-deliver/);
    assert.match(probe, /独立 controller 原样 actor-deliver/);
    assert.match(probe, /Phase Agent SHALL NOT 直接检索样本页面/);
    assert.match(probe, /`rb_profile\.yaml#\/research_access` 的唯一 writer/);
    assert.match(probe, /complete honest no-request relay form/);
    assert.match(probe, /每个 declared sample 一条 `not_attempted`/);
    assert.match(probe, /material gap/);
    assert.match(probe, /不验证、不保留、不推断用户是否实际改变网络/);
    for (const forbidden of [
      /site:wikipedia\.org/,
      /site:github\.com/,
      /"Internet protocol suite"/,
      /first three syntactically eligible/,
      /curl --fail/,
      /source_class_reachability/,
      /unavailable_roots/,
    ]) {
      assert.doesNotMatch(probe, forbidden);
    }
  });

  it('keeps the adapter executor-scoped and the generic guide free of controller declarations', () => {
    assert.match(guide, /controller is required/);
    assert.match(guide, /Do not add a search, candidate, fetch, traversal, fallback, classification, return/);
    for (const forbidden of [
      /encyclopedia/,
      /code_host/,
      /general_web/,
      /Internet protocol suite/,
      /Hello World/,
      /source_class_reachability/,
      /access_boundary/,
      /unavailable_roots/,
      /curl --fail/,
    ]) {
      assert.doesNotMatch(guide, forbidden);
    }
    // The profile guidance may name legacy fields only to document readability;
    // it never makes them a current writer fact.
    assert.doesNotMatch(profile, /WebSearch/);
    assert.doesNotMatch(profile, /WebFetch/);
    assert.doesNotMatch(profile, /curl --fail/);
    assert.match(adapter, /executor-scoped canary metadata only/);
    assert.match(adapter, /deepseek_anthropic_compatible/);
    assert.match(adapter, /WebSearch/);
    assert.match(adapter, /WebFetch/);
    // The adapter is not a production prerequisite for the direct controller.
    assert.doesNotMatch(adapter, /the one selected HITL1 adapter/);
  });

  it('renders exact current-observation and material-gap messages without false success or new checkpoints', () => {
    assert.ok(brief.includes('开始研究前，我先直接检查当前环境对中国和海外公开页面的实际取用情况，请稍候。'));
    assert.ok(brief.includes('当前环境的直接取用观察已经记录。它只反映这一次探测，不保证后续网络保持不变。'));
    assert.ok(brief.includes('你可以调整网络后让我重新完整探测、修改来源范围，或明确“按当前取用范围继续”。'));
    assert.match(brief, /不保证后续网络保持不变/);
    assert.match(brief, /不得承诺恢复、覆盖、固定时长、provider 结果、自动重试或未来稳定性/);
    assert.match(probe, /不验证、不保留、不推断用户是否实际改变网络/);
    assert.match(probe, /没有自动 retry、固定 retry 次数、轮询、VPN 操作、permission bypass 或新的 HITL checkpoint/);
    assert.match(probe, /UI 语言、用户语言、假定地理位置和 VPN 状态都不是 source relevance 的语义证据/);
    assert.match(phase, /Probe URL、page content 和 tool output SHALL NOT 写入或计入 `reference\//);
    // The probe explicitly excludes a new HITL checkpoint rather than adding one.
    assert.match(probe, /没有自动 retry、固定 retry 次数、轮询、VPN 操作、permission bypass 或新的 HITL checkpoint/);
  });

  it('keeps profile guidance to the direct snapshot and legacy readability without provider facts', () => {
    assert.match(profile, /sample_observations/);
    assert.match(profile, /`retrieval_surface`/);
    assert.match(profile, /`round_budget_not_attempted`/);
    assert.match(profile, /`not_attempted`/);
    assert.match(profile, /legacy observation（只读兼容/);
    assert.doesNotMatch(profile, /WebSearch/);
    assert.doesNotMatch(profile, /WebFetch/);
  });
});
