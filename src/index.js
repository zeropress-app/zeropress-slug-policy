export const CONTENT_SLUG_MAX_LENGTH = 200;
export const CONTENT_SLUG_PATTERN_SOURCE = String.raw`^(?=.*[\p{L}\p{Nd}])(?!\.)(?!.*\.\.)(?!.*\.$)[\p{L}\p{M}\p{Nd}._-]+$`;
export const CONTENT_SLUG_COMPONENT_PATTERN_SOURCE = String.raw`(?=[\p{L}\p{M}\p{Nd}._-]*[\p{L}\p{Nd}])(?!\.)(?![\p{L}\p{M}\p{Nd}._-]*\.\.)[\p{L}\p{M}\p{Nd}_-](?:[\p{L}\p{M}\p{Nd}_-]|\.(?=[\p{L}\p{M}\p{Nd}_-]))*`;
export const CONTENT_SLUG_PATTERN = new RegExp(CONTENT_SLUG_PATTERN_SOURCE, 'u');
export const SLUG_SEGMENT_CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

export const SLUG_SEGMENT_ISSUE_CODES = Object.freeze({
  INVALID_TYPE: 'INVALID_TYPE',
  EMPTY: 'EMPTY',
  WHITESPACE: 'WHITESPACE',
  RESERVED_DOT_SEGMENT: 'RESERVED_DOT_SEGMENT',
  INVALID_DOT_PLACEMENT: 'INVALID_DOT_PLACEMENT',
  PATH_SEPARATOR: 'PATH_SEPARATOR',
  PERCENT_ENCODING_OR_CONTROL: 'PERCENT_ENCODING_OR_CONTROL',
  DISALLOWED_CHARACTER: 'DISALLOWED_CHARACTER',
  TOO_LONG: 'TOO_LONG',
});

const SLUG_SEGMENT_ISSUE_MESSAGES = Object.freeze({
  [SLUG_SEGMENT_ISSUE_CODES.INVALID_TYPE]: 'Slug must be a non-empty string',
  [SLUG_SEGMENT_ISSUE_CODES.EMPTY]: 'Slug must be a non-empty string',
  [SLUG_SEGMENT_ISSUE_CODES.WHITESPACE]: 'Slug must not contain whitespace',
  [SLUG_SEGMENT_ISSUE_CODES.RESERVED_DOT_SEGMENT]: 'Slug must not be "." or ".."',
  [SLUG_SEGMENT_ISSUE_CODES.INVALID_DOT_PLACEMENT]:
    'Slug periods must be isolated and may not appear at the beginning or end',
  [SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR]: 'Slug must be a single safe path segment',
  [SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL]: 'Slug must not contain percent-encoding or control characters',
  [SLUG_SEGMENT_ISSUE_CODES.DISALLOWED_CHARACTER]:
    'Slug may contain only Unicode letters, marks, decimal digits, periods, hyphens, and underscores',
  [SLUG_SEGMENT_ISSUE_CODES.TOO_LONG]:
    `Slug must be at most ${CONTENT_SLUG_MAX_LENGTH} Unicode code points`,
});

export class SlugValidationError extends Error {
  constructor(result) {
    super(result.issues[0].message);
    this.name = 'SlugValidationError';
    this.code = result.issues[0].code;
    this.issues = result.issues;
    this.value = result.value;
    this.normalized = result.normalized;
  }
}

export function normalizeStoredSlug(slug) {
  if (typeof slug !== 'string') {
    return '';
  }

  const trimmed = slug.trim();
  if (!trimmed.includes('%')) {
    return trimmed.normalize('NFC');
  }

  try {
    return decodeURIComponent(trimmed).normalize('NFC');
  } catch {
    return trimmed.normalize('NFC');
  }
}

export function normalizeSlugCandidate(slug) {
  return normalizeStoredSlug(slug ?? '');
}

export function generateContentSlug(value) {
  const source = typeof value === 'string' ? value : '';
  const generated = source
    .normalize('NFC')
    .toLowerCase()
    .normalize('NFC')
    .trim()
    .replace(/\.{2,}/g, '-')
    .replace(/[^\p{L}\p{M}\p{Nd}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  const truncated = Array.from(generated)
    .slice(0, CONTENT_SLUG_MAX_LENGTH)
    .join('')
    .replace(/\.{2,}/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');

  return CONTENT_SLUG_PATTERN.test(truncated) ? truncated : '';
}

export function isEmptySlugValue(slug) {
  return normalizeSlugCandidate(slug).length === 0;
}

export function hasNonEmptySlug(slug) {
  return !isEmptySlugValue(slug);
}

export function resolveSlugCandidate(slug, fallbackText) {
  if (slug === undefined || slug === null || slug === '') {
    return generateContentSlug(fallbackText);
  }
  if (typeof slug !== 'string') {
    return assertSafeSlugSegment(slug);
  }

  const normalizedSlug = normalizeSlugCandidate(slug);
  const result = validateSlugSegment(normalizedSlug);
  if (!result.ok) {
    throw new SlugValidationError({
      ...result,
      value: slug,
      normalized: normalizedSlug,
    });
  }
  return result.normalized;
}

export function validateSlugSegment(value) {
  if (typeof value !== 'string') {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.INVALID_TYPE);
  }

  const normalized = normalizeStoredSlug(value);

  if (value.trim() === '') {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.EMPTY, normalized);
  }

  if (/\s/u.test(value)) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.WHITESPACE, normalized);
  }

  if (value === '.' || value === '..') {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.RESERVED_DOT_SEGMENT, normalized);
  }

  if (value.includes('/') || value.includes('\\')) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR, normalized);
  }

  if (value.includes('%') || SLUG_SEGMENT_CONTROL_CHAR_PATTERN.test(value)) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL, normalized);
  }

  if (Array.from(normalized).length > CONTENT_SLUG_MAX_LENGTH) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.TOO_LONG, normalized);
  }

  if (normalized.startsWith('.') || normalized.endsWith('.') || normalized.includes('..')) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.INVALID_DOT_PLACEMENT, normalized);
  }

  if (!CONTENT_SLUG_PATTERN.test(normalized)) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.DISALLOWED_CHARACTER, normalized);
  }

  return {
    ok: true,
    value,
    normalized,
    issues: [],
  };
}

export function isSafeSlugSegment(value) {
  return validateSlugSegment(value).ok;
}

export function assertSafeSlugSegment(value) {
  const result = validateSlugSegment(value);
  if (!result.ok) {
    throw new SlugValidationError(result);
  }
  return result.normalized;
}

function invalidSlugValidationResult(value, code, normalized = '') {
  return {
    ok: false,
    value,
    normalized,
    issues: [
      {
        code,
        message: SLUG_SEGMENT_ISSUE_MESSAGES[code],
      },
    ],
  };
}
