import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { splitSourceUrls } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/reference-url.mjs';

describe('splitSourceUrls (shared source_url multi-URL delimiter contract, REF-012 / EEX-001)', () => {
  it('keeps a literal semicolon inside a URL path as one whole URL', () => {
    assert.deepEqual(
      splitSourceUrls('https://www.wealthbriefingasia.com/article.php/First_dash_Quarter-2026-Net-Profit-Rises-At-DBS;-Wealth-Arm-Helps-Results-'),
      ['https://www.wealthbriefingasia.com/article.php/First_dash_Quarter-2026-Net-Profit-Rises-At-DBS;-Wealth-Arm-Helps-Results-'],
    );
  });

  it('splits on `; ` followed by an http(s) URL', () => {
    assert.deepEqual(
      splitSourceUrls('https://a.example/one; https://b.example/two'),
      ['https://a.example/one', 'https://b.example/two'],
    );
  });

  it('splits on `;` directly followed by an http(s) URL', () => {
    assert.deepEqual(
      splitSourceUrls('https://fixture.news-research.com/;https://fixture.news-research.com/research/article'),
      ['https://fixture.news-research.com/', 'https://fixture.news-research.com/research/article'],
    );
  });

  it('splits on a case-insensitive https prefix', () => {
    assert.deepEqual(
      splitSourceUrls('https://a.example/one;HTTPS://B.example/two'),
      ['https://a.example/one', 'HTTPS://B.example/two'],
    );
  });

  it('does not split when the text after `;` is not an http(s) URL prefix', () => {
    assert.deepEqual(
      splitSourceUrls('https://a.example/path;-suffix'),
      ['https://a.example/path;-suffix'],
    );
    assert.deepEqual(
      splitSourceUrls('https://a.example/path; ftp://b.example/file'),
      ['https://a.example/path; ftp://b.example/file'],
    );
    assert.deepEqual(
      splitSourceUrls('https://a.example/path;https:/malformed'),
      ['https://a.example/path;https:/malformed'],
    );
  });

  it('trims segments and drops empty ones', () => {
    assert.deepEqual(
      splitSourceUrls('  https://a.example/one ; https://b.example/two  '),
      ['https://a.example/one', 'https://b.example/two'],
    );
    assert.deepEqual(splitSourceUrls('   ;https://b.example/two'), ['https://b.example/two']);
    assert.deepEqual(splitSourceUrls(''), []);
    assert.deepEqual(splitSourceUrls(null), []);
    assert.deepEqual(splitSourceUrls(undefined), []);
  });

  it('handles mixed path semicolons and multi-URL separators in one value', () => {
    assert.deepEqual(
      splitSourceUrls('https://a.example/x;y;z; https://b.example/two'),
      ['https://a.example/x;y;z', 'https://b.example/two'],
    );
  });
});
