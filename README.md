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

- may contain Unicode, including Hangul
- must be a single safe URL path segment

Rejected values include:

- empty or whitespace-only values
- any whitespace character
- `/` or `\`
- `.` or `..`
- `%` or percent-encoded slug forms
- ASCII control characters, including NUL and DEL

This means values such as `회사소개` and `무료-ai-리뷰` are valid, while `hello world`, `../escape`, `a/b`, `%2e%2e`, and `.` are invalid.

---

## API

### `generateContentSlug(value)`

Generates a content slug from free-form text.

Behavior:

- lowercases Latin letters
- trims outer whitespace
- keeps Hangul
- collapses whitespace to `-`
- removes punctuation that is not part of the allowed generated slug shape
- truncates to `CONTENT_SLUG_MAX_LENGTH`

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

### `isSafeSlugSegment(value)`

Returns `true` when the value satisfies the shared content slug policy.

### `assertSafeSlugSegment(value)`

Throws when the value is not a valid safe content slug segment.

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
- [ZeroPress preview-data v0.5 spec](https://zeropress.dev/spec/preview-data-v0.5.html)

---

## License

MIT
