// tests/schema/contracts/reference.test.mjs — 1:1 for DPT_FRAMEWORK/schema/contracts/reference.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ReferenceMetadataSchema,
  ReferenceMetadataArraySchema,
} from '../../../DPT_FRAMEWORK/schema/contracts/reference.mjs';

const validEntry = { url: 'https://example.com', title: 'Example', retrieved_date: '2026-01-15', topic_tag: 'topic-a' };

describe('ReferenceMetadataSchema', () => {
  it('accepts valid entry', () => {
    assert.ok(ReferenceMetadataSchema.safeParse(validEntry).success);
  });

  it('accepts valid entry with optional notes', () => {
    assert.ok(ReferenceMetadataSchema.safeParse({ ...validEntry, notes: 'some note' }).success);
  });

  it('rejects empty url', () => {
    assert.ok(!ReferenceMetadataSchema.safeParse({ ...validEntry, url: '' }).success);
  });

  it('rejects missing url', () => {
    const bad = { ...validEntry }; delete bad.url;
    assert.ok(!ReferenceMetadataSchema.safeParse(bad).success);
  });

  it('rejects empty title', () => {
    assert.ok(!ReferenceMetadataSchema.safeParse({ ...validEntry, title: '' }).success);
  });

  it('rejects missing title', () => {
    const bad = { ...validEntry }; delete bad.title;
    assert.ok(!ReferenceMetadataSchema.safeParse(bad).success);
  });

  it('rejects invalid retrieved_date format', () => {
    assert.ok(!ReferenceMetadataSchema.safeParse({ ...validEntry, retrieved_date: '2026/01/15' }).success);
    assert.ok(!ReferenceMetadataSchema.safeParse({ ...validEntry, retrieved_date: '01-15-2026' }).success);
    assert.ok(!ReferenceMetadataSchema.safeParse({ ...validEntry, retrieved_date: '2026-1-5' }).success);
  });

  it('rejects missing retrieved_date', () => {
    const bad = { ...validEntry }; delete bad.retrieved_date;
    assert.ok(!ReferenceMetadataSchema.safeParse(bad).success);
  });

  it('rejects empty topic_tag', () => {
    assert.ok(!ReferenceMetadataSchema.safeParse({ ...validEntry, topic_tag: '' }).success);
  });

  it('rejects missing topic_tag', () => {
    const bad = { ...validEntry }; delete bad.topic_tag;
    assert.ok(!ReferenceMetadataSchema.safeParse(bad).success);
  });
});

describe('ReferenceMetadataArraySchema', () => {
  it('accepts valid array', () => {
    assert.ok(ReferenceMetadataArraySchema.safeParse([validEntry]).success);
  });

  it('accepts empty array', () => {
    assert.ok(ReferenceMetadataArraySchema.safeParse([]).success);
  });

  it('rejects non-array', () => {
    assert.ok(!ReferenceMetadataArraySchema.safeParse(validEntry).success);
  });

  it('rejects array with invalid entry', () => {
    assert.ok(!ReferenceMetadataArraySchema.safeParse([validEntry, { url: 'https://x.com' }]).success);
  });
});
