// @impl CTS-001, CTS-002, CTS-003, CTS-004, CTS-009, SCO-013
// Navigation: public API — SEED_TOPIC_PROJECTION_ENTRY_FIELDS, SEED_TOPIC_PROJECTION_CARD_LABEL, SEED_TOPIC_PROJECTION_SLOTS, projectionSlotForId, projectionSlotsForWave, projectionSlotHeadingMatches, locateSeedProjectionSlots, renderSeedProjectionCard, renderSeedProjectionSlot, renderSeedProjectionAppendix, splitSeedProjectionCard

import { z } from 'zod';
import { PROJECTION_ENTRY_FIELDS, evaluateProjectionEntryNavigation, isAcceptedDeferredProjectionEntry, parseProjectionEntryArea, upsertProjectionEntryArea } from './projection-entry-contract.mjs';

export const SEED_TOPIC_PROJECTION_ENTRY_FIELDS = PROJECTION_ENTRY_FIELDS;
export const SEED_TOPIC_PROJECTION_CARD_LABEL = '回填卡（只读操作约束，不是 Projection Entry）';

const HEADING_SUFFIX_RE = /^(?:\s|\(|（|:|：|-|—)/;

function freezeProjectionSlot(slot) {
  return Object.freeze({
    ...slot,
    legacyHeadingBases: Object.freeze([...slot.legacyHeadingBases]),
    ownerWaves: Object.freeze([...slot.ownerWaves]),
    card: Object.freeze({
      ...slot.card,
      requiredEntryFields: Object.freeze([...slot.card.requiredEntryFields]),
      prohibitions: Object.freeze([...slot.card.prohibitions]),
    }),
  });
}

export const SEED_TOPIC_PROJECTION_SLOTS = Object.freeze([
  freezeProjectionSlot({
    slotId: 'wave0_evidence',
    canonicalHeading: 'Wave0：本主题的新增来源证据',
    legacyHeadingBases: ['本轮新增证据'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_WAVE0_EVIDENCE__',
    ownerWaves: ['wave0'],
    sourceIdentityKind: 'submitted_work',
    mergeMode: 'upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave0 Phase Agent',
      authority: '当前轮已 submitted 的 Wave0 work-unit',
      timing: '当前轮 Wave0 work-unit 已 submitted 后',
      entryIdentity: '<work_id>/<N>；N 是该 submitted source contribution 在当前 validated `artifacts/wave0/<topic>/source.yaml` array 中拥有的 exact global ordinal；后续合法 append 使用自己的 contribution/work_id（不是 result_hash 的 source-byte snapshot）',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由 Wave0 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写 “Wave0 submitted”', '把 artifact/cache 当唯一 consumer ref'],
    },
  }),
  freezeProjectionSlot({
    slotId: 'wave1_mechanisms',
    canonicalHeading: 'Wave1：本主题的机制理解',
    legacyHeadingBases: ['本轮新增机制理解'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_WAVE1_MECHANISMS__',
    ownerWaves: ['wave1'],
    sourceIdentityKind: 'submitted_work',
    mergeMode: 'upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave1 Phase Agent',
      authority: '当前轮已 submitted 的 Wave1 work-unit',
      timing: '当前轮 Wave1 work-unit 已 submitted 后',
      entryIdentity: '<work_id>/<positive ordinal>',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由 Wave1 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写 “Wave1 submitted”', '把 evidence-summary provenance 当唯一 consumer ref'],
    },
  }),
  freezeProjectionSlot({
    slotId: 'wave1_trends',
    canonicalHeading: 'Wave1：本主题的趋势、难点与限制',
    legacyHeadingBases: ['本轮新增趋势与难点'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_WAVE1_TRENDS__',
    ownerWaves: ['wave1'],
    sourceIdentityKind: 'submitted_work',
    mergeMode: 'upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave1 Phase Agent',
      authority: '当前轮已 submitted 的 Wave1 work-unit',
      timing: '当前轮 Wave1 work-unit 已 submitted 后',
      entryIdentity: '<work_id>/<positive ordinal>',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由 Wave1 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写 “Wave1 submitted”', '用泛化 submitted prose 替代限制'],
    },
  }),
  freezeProjectionSlot({
    slotId: 'wave2_judgment',
    canonicalHeading: 'Wave2：本主题的当前跨主题判断',
    legacyHeadingBases: ['当前判断'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_WAVE2_JUDGMENT__',
    ownerWaves: ['wave2'],
    sourceIdentityKind: 'finding',
    mergeMode: 'upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave2 Phase Agent',
      authority: '解析到本 topic 的当前轮 W2F finding',
      timing: '当前轮 W2F finding 已解析到本 topic 后',
      entryIdentity: 'exact current-round W2F-* finding id',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由 Wave2 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写 “Wave2 submitted”', '无 exact W2F binding 的泛化 synthesis line'],
    },
  }),
  freezeProjectionSlot({
    slotId: 'pending_questions',
    canonicalHeading: '本主题的待验证问题与后续验证路径',
    legacyHeadingBases: ['待验证问题'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_PENDING_QUESTIONS__',
    ownerWaves: ['wave1', 'wave2'],
    sourceIdentityKind: 'submitted_work_or_finding',
    mergeMode: 'append_or_upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave1 Phase Agent（首写）或 Wave2 Phase Agent（仅追加其 W2F 条目）',
      authority: '当前轮 Wave1 submitted work-unit，或解析到本 topic 的当前轮 W2F finding',
      timing: 'Wave1 submitted 后首写；Wave2 仅在其当前 W2F finding 解析到本 topic 后追加',
      entryIdentity: 'Wave1: <work_id>/<positive ordinal>; Wave2: exact current-round W2F-* finding id',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由对应 Wave closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写泛化 submitted prose', 'Wave2 覆盖或删除 Wave1 question entry'],
    },
  }),
]);

export const PROJECTION_SLOT_BY_ID = new Map(SEED_TOPIC_PROJECTION_SLOTS.map((slot) => [slot.slotId, slot]));

export function projectionSlotForId(slotId) {
  return PROJECTION_SLOT_BY_ID.get(slotId) || null;
}

export function projectionSlotsForWave(wave) {
  return SEED_TOPIC_PROJECTION_SLOTS.filter((slot) => slot.ownerWaves.includes(wave));
}

export function projectionSlotHeadingMatches(slot, heading) {
  const value = String(heading || '').trim();
  for (const [kind, bases] of [
    ['canonical', [slot.canonicalHeading]],
    ['legacy', slot.legacyHeadingBases],
  ]) {
    for (const base of bases) {
      if (value === base || (value.startsWith(base) && HEADING_SUFFIX_RE.test(value.slice(base.length)))) {
        return { matches: true, kind, base, suffix: value.slice(base.length) };
      }
    }
  }
  return { matches: false, kind: null, base: null, suffix: null };
}

export function locateSeedProjectionSlots(content, { slotIds = null } = {}) {
  const selected = slotIds ? new Set(slotIds) : null;
  const source = String(content || '');
  const lines = source.split(/(?<=\n)/);
  const headings = [];
  let offset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.replace(/\r?\n$/, '');
    const match = line.match(/^\s*##\s+(.+?)\s*$/);
    if (match) headings.push({ index, startOffset: offset, headingEndOffset: offset + raw.length, title: match[1] });
    offset += raw.length;
  }
  const occurrences = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const endOffset = headings[index + 1]?.startOffset ?? source.length;
    for (const slot of SEED_TOPIC_PROJECTION_SLOTS) {
      if (selected && !selected.has(slot.slotId)) continue;
      const match = projectionSlotHeadingMatches(slot, heading.title);
      if (!match.matches) continue;
      occurrences.push({
        slotId: slot.slotId,
        slot,
        headingKind: match.kind,
        headingBase: match.base,
        headingSuffix: match.suffix,
        heading: heading.title,
        startLine: heading.index + 1,
        contentStartLine: heading.index + 2,
        startOffset: heading.startOffset,
        contentStartOffset: heading.headingEndOffset,
        endOffset,
        content: source.slice(heading.headingEndOffset, endOffset),
      });
    }
  }
  return occurrences;
}

export function renderSeedProjectionCard(slot) {
  return [
    `> **${slot.card.label}**`,
    `> - 写入者：${slot.card.writer}`,
    `> - 依据：${slot.card.authority}`,
    `> - 回填时机：${slot.card.timing}`,
    `> - 写法：${slot.card.entryIdentity}；必须含 ${slot.card.requiredEntryFields.join('、')}`,
    `> - 操作：${slot.card.materializationPointer}`,
    `> - 禁止：${slot.card.prohibitions.join('；')}`,
  ].join('\n');
}

export function renderSeedProjectionSlot(slot) {
  return `## ${slot.canonicalHeading}\n\n${renderSeedProjectionCard(slot)}\n\n${slot.initialToken}`;
}

export function renderSeedProjectionAppendix() {
  return SEED_TOPIC_PROJECTION_SLOTS.map(renderSeedProjectionSlot).join('\n\n');
}

export function splitSeedProjectionCard(content, slot) {
  const leading = String(content || '').match(/^(?:[ \t]*\r?\n)*/)?.[0] || '';
  const expected = renderSeedProjectionCard(slot);
  if (!String(content || '').slice(leading.length).startsWith(expected)) return null;
  return {
    prefix: String(content || '').slice(0, leading.length + expected.length),
    entryArea: String(content || '').slice(leading.length + expected.length),
  };
}