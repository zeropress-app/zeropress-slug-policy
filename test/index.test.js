import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_SLUG_MAX_LENGTH,
  SLUG_SEGMENT_ISSUE_CODES,
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

test('generateContentSlug keeps Hangul and collapses separators', () => {
  assert.equal(generateContentSlug('  무료 AI 리뷰!!!  '), '무료-ai-리뷰');
  assert.equal(generateContentSlug('Hello   ZeroPress'), 'hello-zeropress');
});

test('generateContentSlug truncates to CONTENT_SLUG_MAX_LENGTH', () => {
  const generated = generateContentSlug(`안녕하세요 ${'a'.repeat(CONTENT_SLUG_MAX_LENGTH + 20)}`);
  assert.equal(generated.length, CONTENT_SLUG_MAX_LENGTH);
});

test('normalizeStoredSlug decodes percent-encoded Unicode and trims', () => {
  assert.equal(normalizeStoredSlug('  %EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8  '), '업데이트');
  assert.equal(normalizeStoredSlug('  hello-world  '), 'hello-world');
});

test('normalizeSlugCandidate and empty helpers follow normalized stored slugs', () => {
  assert.equal(normalizeSlugCandidate('  %EC%95%88%EB%85%95  '), '안녕');
  assert.equal(isEmptySlugValue('   '), true);
  assert.equal(isEmptySlugValue(null), true);
  assert.equal(hasNonEmptySlug('한글-slug'), true);
});

test('resolveSlugCandidate reuses the shared normalization and fallback behavior', () => {
  assert.equal(resolveSlugCandidate('%ED%95%9C%EA%B8%80', 'Hello World'), '한글');
  assert.equal(resolveSlugCandidate(undefined, 'Hello World'), 'hello-world');
});

test('validateSlugSegment accepts valid Unicode and Hangul segments', () => {
  const result = validateSlugSegment('안녕하세요-제로프레스');

  assert.equal(result.ok, true);
  assert.equal(result.value, '안녕하세요-제로프레스');
  assert.equal(result.normalized, '안녕하세요-제로프레스');
  assert.deepEqual(result.issues, []);
});

test('validateSlugSegment rejects non-string and empty values', () => {
  assert.equal(validateSlugSegment(null).issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.INVALID_TYPE);
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

test('validateSlugSegment rejects path separators', () => {
  assert.equal(validateSlugSegment('../escape').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR);
  assert.equal(validateSlugSegment('a/b').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR);
  assert.equal(validateSlugSegment('a\\b').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR);
});

test('validateSlugSegment rejects percent-encoding and control characters', () => {
  assert.equal(validateSlugSegment('%2e%2e').issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL);
  assert.equal(validateSlugSegment(`hello${String.fromCharCode(0)}world`).issues[0]?.code, SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL);
});

test('isSafeSlugSegment and assertSafeSlugSegment use the shared validation policy', () => {
  assert.equal(isSafeSlugSegment('회사소개'), true);
  assert.equal(isSafeSlugSegment('../escape'), false);
  assert.equal(assertSafeSlugSegment('회사소개'), '회사소개');
  assert.throws(() => assertSafeSlugSegment('%2e%2e'), /percent-encoding or control characters/i);
});
