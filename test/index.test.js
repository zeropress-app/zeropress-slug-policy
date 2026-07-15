import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_SLUG_MAX_LENGTH,
  CONTENT_SLUG_COMPONENT_PATTERN_SOURCE,
  CONTENT_SLUG_PATTERN,
  CONTENT_SLUG_PATTERN_SOURCE,
  SLUG_SEGMENT_ISSUE_CODES,
  SlugValidationError,
  assertSafeSlugSegment,
  generateContentSlug,
  hasNonEmptySlug,
  isEmptySlugValue,
  isSafeSlugSegment,
  normalizeSlugCandidate,
  normalizeStoredSlug,
  resolveSlugCandidate,
  validateSlugSegment,
} from '../src/index.js';

test('exports the Unicode content-slug pattern for runtime and schema consumers', () => {
  assert.equal(CONTENT_SLUG_PATTERN_SOURCE, String.raw`^(?=.*[\p{L}\p{Nd}])(?!\.)(?!.*\.\.)(?!.*\.$)[\p{L}\p{M}\p{Nd}._-]+$`);
  assert.equal(
    CONTENT_SLUG_COMPONENT_PATTERN_SOURCE,
    String.raw`(?=[\p{L}\p{M}\p{Nd}._-]*[\p{L}\p{Nd}])(?!\.)(?![\p{L}\p{M}\p{Nd}._-]*\.\.)[\p{L}\p{M}\p{Nd}_-](?:[\p{L}\p{M}\p{Nd}_-]|\.(?=[\p{L}\p{M}\p{Nd}_-]))*`,
  );
  assert.equal(CONTENT_SLUG_PATTERN.flags, 'u');
  assert.equal(CONTENT_SLUG_PATTERN.test('News_2026'), true);
  assert.equal(CONTENT_SLUG_PATTERN.test('theme-runtime-v0.6'), true);
  assert.equal(CONTENT_SLUG_PATTERN.test('news!'), false);
});

test('generateContentSlug preserves Unicode letters and collapses invalid runs', () => {
  assert.equal(generateContentSlug('  무료 AI 리뷰!!!  '), '무료-ai-리뷰');
  assert.equal(generateContentSlug('Hello   ZeroPress'), 'hello-zeropress');
  assert.equal(generateContentSlug('中文 指南'), '中文-指南');
  assert.equal(generateContentSlug('CAFÉ हिन्दी'), 'café-हिन्दी');
  assert.equal(generateContentSlug('Theme Runtime v0.6'), 'theme-runtime-v0.6');
  assert.equal(generateContentSlug('news...today'), 'news-today');
  assert.equal(generateContentSlug('.hidden'), 'hidden');
  assert.equal(generateContentSlug('version.'), 'version');
  assert.equal(generateContentSlug('news...today / now'), 'news-today-now');
  assert.equal(generateContentSlug('😀'), '');
});

test('generateContentSlug truncates by Unicode code point without splitting surrogate pairs', () => {
  const generated = generateContentSlug(`${'a'.repeat(CONTENT_SLUG_MAX_LENGTH - 1)}𐐀suffix`);

  assert.equal(Array.from(generated).length, CONTENT_SLUG_MAX_LENGTH);
  assert.equal(generated.endsWith('𐐨'), true);
  assert.equal(generated.includes('\uFFFD'), false);

  const trailingPeriod = generateContentSlug(`${'a'.repeat(CONTENT_SLUG_MAX_LENGTH - 1)}.suffix`);
  assert.equal(trailingPeriod, 'a'.repeat(CONTENT_SLUG_MAX_LENGTH - 1));
});

test('normalizeStoredSlug decodes percent-encoded Unicode, trims, and returns NFC', () => {
  assert.equal(normalizeStoredSlug('  %EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8  '), '업데이트');
  assert.equal(normalizeStoredSlug('  hello-world  '), 'hello-world');
  assert.equal(normalizeStoredSlug('cafe\u0301'), 'café');
});

test('normalizeSlugCandidate and empty helpers follow normalized stored slugs', () => {
  assert.equal(normalizeSlugCandidate('  %EC%95%88%EB%85%95  '), '안녕');
  assert.equal(isEmptySlugValue('   '), true);
  assert.equal(isEmptySlugValue(null), true);
  assert.equal(hasNonEmptySlug('한글-slug'), true);
});

test('resolveSlugCandidate validates normalized explicit values and generates only fallbacks', () => {
  assert.equal(resolveSlugCandidate('%ED%95%9C%EA%B8%80', 'Hello World'), '한글');
  assert.equal(resolveSlugCandidate('cafe\u0301', 'Hello World'), 'café');
  assert.equal(resolveSlugCandidate(undefined, 'Hello World'), 'hello-world');
  assert.equal(resolveSlugCandidate('', 'Hello World'), 'hello-world');
  assert.throws(() => resolveSlugCandidate('news!', 'Hello World'), SlugValidationError);
  assert.throws(() => resolveSlugCandidate('   ', 'Hello World'), SlugValidationError);
  assert.throws(
    () => resolveSlugCandidate('%2F', 'Hello World'),
    (error) => {
      assert.equal(error instanceof SlugValidationError, true);
      assert.equal(error.code, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR);
      assert.equal(error.value, '%2F');
      assert.equal(error.normalized, '/');
      return true;
    },
  );
});

test('validateSlugSegment accepts the shared Unicode allowlist, isolated periods, and uppercase letters', () => {
  for (const value of ['news', 'News_2026', 'theme-runtime-v0.6', '회사소개', '中文', 'café', 'हिन्दी']) {
    const result = validateSlugSegment(value);

    assert.equal(result.ok, true, value);
    assert.equal(result.value, value, value);
    assert.equal(result.normalized, value.normalize('NFC'), value);
    assert.deepEqual(result.issues, [], value);
  }
});

test('validateSlugSegment accepts NFD input and exposes an NFC canonical value', () => {
  const input = 'cafe\u0301';
  const result = validateSlugSegment(input);

  assert.equal(result.ok, true);
  assert.equal(result.value, input);
  assert.equal(result.normalized, 'café');
  assert.deepEqual(result.issues, []);
  assert.equal(assertSafeSlugSegment(input), 'café');
});

test('validateSlugSegment rejects non-string and empty values', () => {
  const nonString = validateSlugSegment(null);

  assert.equal(nonString.issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.INVALID_TYPE);
  assert.equal(nonString.value, null);
  assert.equal(validateSlugSegment('').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.EMPTY);
  assert.equal(validateSlugSegment('   ').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.EMPTY);
});

test('validateSlugSegment rejects any whitespace characters', () => {
  const result = validateSlugSegment(' hello ');
  const internalWhitespace = validateSlugSegment('hello world');

  assert.equal(result.ok, false);
  assert.equal(result.issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.WHITESPACE);
  assert.equal(internalWhitespace.ok, false);
  assert.equal(internalWhitespace.issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.WHITESPACE);
});

test('validateSlugSegment rejects dot segments', () => {
  assert.equal(validateSlugSegment('.').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.RESERVED_DOT_SEGMENT);
  assert.equal(validateSlugSegment('..').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.RESERVED_DOT_SEGMENT);
});

test('validateSlugSegment rejects unsafe period placement', () => {
  for (const value of ['.hidden', 'version.', 'news..today', 'a...b']) {
    const result = validateSlugSegment(value);

    assert.equal(result.ok, false, value);
    assert.equal(result.issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.INVALID_DOT_PLACEMENT, value);
  }
});

test('validateSlugSegment rejects path separators', () => {
  assert.equal(validateSlugSegment('../escape').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR);
  assert.equal(validateSlugSegment('a/b').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR);
  assert.equal(validateSlugSegment('a\\b').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR);
});

test('validateSlugSegment rejects percent-encoding and control characters', () => {
  assert.equal(normalizeStoredSlug('%2F'), '/');
  assert.equal(validateSlugSegment('%2F').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL);
  assert.equal(validateSlugSegment('%2e%2e').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL);
  assert.equal(validateSlugSegment(`hello${String.fromCharCode(0)}world`).issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL);
});

test('validateSlugSegment rejects characters outside the Unicode allowlist', () => {
  for (const value of ['news!', '😀', '---', '___', 'news\u200Btoday', 'news\u202Etoday']) {
    const result = validateSlugSegment(value);

    assert.equal(result.ok, false, value);
    assert.equal(result.value, value, value);
    assert.equal(result.issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.DISALLOWED_CHARACTER, value);
  }
});

test('validateSlugSegment enforces the maximum by NFC Unicode code point count', () => {
  const valid = `𐐀${'a'.repeat(CONTENT_SLUG_MAX_LENGTH - 1)}`;
  const tooLong = `${valid}b`;

  assert.equal(Array.from(valid).length, CONTENT_SLUG_MAX_LENGTH);
  assert.equal(validateSlugSegment(valid).ok, true);
  assert.equal(validateSlugSegment(tooLong).issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.TOO_LONG);
});

test('isSafeSlugSegment and assertSafeSlugSegment use the shared validation policy', () => {
  assert.equal(isSafeSlugSegment('회사소개'), true);
  assert.equal(isSafeSlugSegment('../escape'), false);
  assert.equal(assertSafeSlugSegment('회사소개'), '회사소개');
  assert.throws(() => assertSafeSlugSegment('%2e%2e'), /percent-encoding or control characters/i);
});

test('SlugValidationError preserves the original input and canonical candidate', () => {
  const input = '  news!  ';

  assert.throws(
    () => assertSafeSlugSegment(input),
    (error) => {
      assert.equal(error instanceof SlugValidationError, true);
      assert.equal(error.name, 'SlugValidationError');
      assert.equal(error.code, SLUG_SEGMENT_ISSUE_CODES.WHITESPACE);
      assert.equal(error.value, input);
      assert.equal(error.normalized, 'news!');
      assert.deepEqual(error.issues, validateSlugSegment(input).issues);
      return true;
    },
  );
});
