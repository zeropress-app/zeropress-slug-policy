export const CONTENT_SLUG_MAX_LENGTH = 200;
export const SLUG_SEGMENT_CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

export const SLUG_SEGMENT_ISSUE_CODES = Object.freeze({
  INVALID_TYPE: 'INVALID_TYPE',
  EMPTY: 'EMPTY',
  WHITESPACE: 'WHITESPACE',
  RESERVED_DOT_SEGMENT: 'RESERVED_DOT_SEGMENT',
  PATH_SEPARATOR: 'PATH_SEPARATOR',
  PERCENT_ENCODING_OR_CONTROL: 'PERCENT_ENCODING_OR_CONTROL',
});

const SLUG_SEGMENT_ISSUE_MESSAGES = Object.freeze({
  [SLUG_SEGMENT_ISSUE_CODES.INVALID_TYPE]: 'Slug must be a non-empty string',
  [SLUG_SEGMENT_ISSUE_CODES.EMPTY]: 'Slug must be a non-empty string',
  [SLUG_SEGMENT_ISSUE_CODES.WHITESPACE]: 'Slug must not contain whitespace',
  [SLUG_SEGMENT_ISSUE_CODES.RESERVED_DOT_SEGMENT]: 'Slug must not be "." or ".."',
  [SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR]: 'Slug must be a single safe path segment',
  [SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL]: 'Slug must not contain percent-encoding or control characters',
});

export function normalizeStoredSlug(slug) {
  if (typeof slug !== 'string') {
    return '';
  }

  const trimmed = slug.trim();
  if (!trimmed.includes('%')) {
    return trimmed;
  }

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export function normalizeSlugCandidate(slug) {
  return normalizeStoredSlug(slug ?? '').trim();
}

export function generateContentSlug(value) {
  const source = typeof value === 'string' ? value : '';
  return source
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CONTENT_SLUG_MAX_LENGTH);
}

export function isEmptySlugValue(slug) {
  return normalizeSlugCandidate(slug).length === 0;
}

export function hasNonEmptySlug(slug) {
  return !isEmptySlugValue(slug);
}

export function resolveSlugCandidate(slug, fallbackText) {
  const normalizedSlug = normalizeSlugCandidate(slug);
  if (normalizedSlug.length > 0) {
    return normalizedSlug;
  }

  return generateContentSlug(fallbackText);
}

export function validateSlugSegment(value) {
  if (typeof value !== 'string') {
    return invalidSlugValidationResult('', SLUG_SEGMENT_ISSUE_CODES.INVALID_TYPE);
  }

  if (value.trim() === '') {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.EMPTY);
  }

  if (/\s/.test(value)) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.WHITESPACE);
  }

  if (value === '.' || value === '..') {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.RESERVED_DOT_SEGMENT);
  }

  if (value.includes('/') || value.includes('\\')) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.PATH_SEPARATOR);
  }

  if (value.includes('%') || SLUG_SEGMENT_CONTROL_CHAR_PATTERN.test(value)) {
    return invalidSlugValidationResult(value, SLUG_SEGMENT_ISSUE_CODES.PERCENT_ENCODING_OR_CONTROL);
  }

  return {
    ok: true,
    value,
    normalized: normalizeStoredSlug(value),
    issues: [],
  };
}

export function isSafeSlugSegment(value) {
  return validateSlugSegment(value).ok;
}

export function assertSafeSlugSegment(value) {
  const result = validateSlugSegment(value);
  if (!result.ok) {
    throw new Error(result.issues[0]?.message || 'Invalid slug segment');
  }
  return result.value;
}

function invalidSlugValidationResult(value, code) {
  const normalized = typeof value === 'string' ? normalizeStoredSlug(value) : '';
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
