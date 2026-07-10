# @zeropress/slug-policy

![npm](https://img.shields.io/npm/v/%40zeropress%2Fslug-policy)
![license](https://img.shields.io/npm/l/%40zeropress%2Fslug-policy)
![node](https://img.shields.io/node/v/%40zeropress%2Fslug-policy)

Shared content slug normalization and validation policy for ZeroPress.

This package is the runtime source of truth for **content URL-path slugs** used by:

- [@zeropress/preview-data-validator](https://www.npmjs.com/package/@zeropress/preview-data-validator)
- [@zeropress/build-core](https://www.npmjs.com/package/@zeropress/build-core)
- `backend_api_v2`
- `frontend_admin_v2`

It defines what a valid content slug is across ZeroPress runtime layers, so the CMS, preview-data contract, build pipeline, and admin frontend all make the same decision for the same input.

Theme/package naming slugs are out of scope. Those remain governed by theme runtime and marketplace-specific rules.

---

## Install

```bash
npm install @zeropress/slug-policy
```

---

## Exports

```js
import {
  CONTENT_SLUG_MAX_LENGTH,
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
} from '@zeropress/slug-policy';
```

---

## Purpose

`@zeropress/slug-policy` is responsible for:

- generating content slugs from free-form titles
- normalizing stored or imported slug-like values
- validating whether a slug is a safe single URL path segment
- exposing reusable issue codes for adapters such as Zod or custom validators

It does not:

- validate theme namespace/slug identifiers
- validate full relative output paths
- own build sink safety rules
- depend on Zod, React, Hono, or any framework

---

## Validation Policy

A valid ZeroPress content slug:

- contains only Unicode letters (`\p{L}`), combining marks (`\p{M}`),
  Unicode decimal digits (`\p{Nd}`), ASCII hyphens (`-`), and underscores (`_`)
- contains at least one Unicode letter or decimal digit
- is at most 200 Unicode code points after NFC normalization
- may contain uppercase letters; only generated slugs are lowercased
- must be a single safe URL path segment

The exported policy pattern is:

```regex
^(?=.*[\p{L}\p{Nd}])[\p{L}\p{M}\p{Nd}_-]+$
```

Rejected values include:

- empty or whitespace-only values
- any whitespace character
- `/` or `\`
- `.` or `..`
- `%` or percent-encoded slug forms
- ASCII control characters, including NUL and DEL
- punctuation, emoji, zero-width characters, and bidirectional control characters
- values longer than `CONTENT_SLUG_MAX_LENGTH`

This means `News_2026`, `회사소개`, `中文`, `café`, and `हिन्दी` are valid. `news!`,
`hello world`, `../escape`, `a/b`, `%2e%2e`, `---`, and emoji-only values are invalid.

---

## API

### `generateContentSlug(value)`

Generates a content slug from free-form text.

Behavior:

- NFC-normalizes input and lowercases Unicode letters
- trims outer whitespace
- preserves letters, combining marks, decimal digits, underscores, and hyphens
- converts each run of other characters to `-`
- truncates to `CONTENT_SLUG_MAX_LENGTH` by Unicode code point without splitting a surrogate pair

```js
generateContentSlug('무료 AI 리뷰');
// => '무료-ai-리뷰'
```

### `normalizeStoredSlug(slug)`

Normalizes a stored slug-like value.

Behavior:

- trims outer whitespace
- decodes percent-encoded input when decoding succeeds
- returns the trimmed original value when decoding fails
- returns NFC-normalized text

This is useful for:

- imported WordPress slugs
- route segment decoding
- normalizing existing persisted values before comparison

```js
normalizeStoredSlug('%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8');
// => '업데이트'
```

### `normalizeSlugCandidate(slug)`

Returns a normalized candidate string for comparison or fallback checks.

```js
normalizeSlugCandidate('  %ED%95%9C%EA%B8%80  ');
// => '한글'
```

### `resolveSlugCandidate(slug, fallbackText)`

Returns the normalized explicit slug when present, otherwise generates one from fallback text.
`undefined`, `null`, and the empty string are treated as absent; a supplied whitespace-only
or otherwise invalid value is explicit input and is rejected.
An explicit slug is validated after import normalization; invalid explicit input throws
`SlugValidationError` instead of being silently repaired.

```js
resolveSlugCandidate(undefined, 'Hello World');
// => 'hello-world'
```

### `isEmptySlugValue(slug)` / `hasNonEmptySlug(slug)`

Helpers for flows that need to distinguish:

- no slug yet
- some slug-like value exists

These helpers only answer empty vs non-empty after normalization. They do not guarantee the slug is safe.

### `validateSlugSegment(value)`

Validates a value against the shared content slug policy.

Returns:

```js
{
  ok: true,
  value: '회사소개',
  normalized: '회사소개',
  issues: []
}
```

Or:

```js
{
  ok: false,
  value: 'hello world',
  normalized: 'hello world',
  issues: [
    {
      code: 'WHITESPACE',
      message: 'Slug must not contain whitespace'
    }
  ]
}
```

Issue codes:

- `INVALID_TYPE`
- `EMPTY`
- `WHITESPACE`
- `RESERVED_DOT_SEGMENT`
- `PATH_SEPARATOR`
- `PERCENT_ENCODING_OR_CONTROL`
- `DISALLOWED_CHARACTER`
- `TOO_LONG`

`value` preserves the original input, including a non-string value in a failed result.
`normalized` is the canonical NFC candidate. Direct validation never percent-decodes before
applying policy, so `validateSlugSegment('%2F')` fails even though
`normalizeStoredSlug('%2F')` returns `/` for explicit import workflows.

### `CONTENT_SLUG_PATTERN_SOURCE` / `CONTENT_SLUG_PATTERN`

Expose the exact allowlist as a JSON-Schema-compatible source string and a Unicode `RegExp`.
Schema and runtime consumers can share the same pattern without duplicating it.

### `isSafeSlugSegment(value)`

Returns `true` when the value satisfies the shared content slug policy.

### `assertSafeSlugSegment(value)`

Returns the canonical NFC value or throws `SlugValidationError` when the input is invalid.
The error exposes `code`, `issues`, the original `value`, and the canonical `normalized`
candidate.

---

## Adapter Pattern

This package is intentionally framework-agnostic.

Typical consumers wrap `validateSlugSegment()` in:

- Zod `.refine()` / `.superRefine()`
- preview-data validation envelopes
- build-time guards
- frontend form validation helpers

This keeps the actual slug policy centralized while allowing each layer to preserve its own error shape and UX wording.

---

## Requirements

- Node.js >= 18.18.0
- ESM only

---

## Related

- [@zeropress/preview-data-validator](https://www.npmjs.com/package/@zeropress/preview-data-validator)
- [@zeropress/build-core](https://www.npmjs.com/package/@zeropress/build-core)
- [ZeroPress preview-data v0.6 spec](https://zeropress.dev/spec/preview-data-v0.6.html)

---

## License

MIT
