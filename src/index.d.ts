export const CONTENT_SLUG_MAX_LENGTH: 200;
export const CONTENT_SLUG_PATTERN_SOURCE: string;
export const CONTENT_SLUG_COMPONENT_PATTERN_SOURCE: string;
export const CONTENT_SLUG_PATTERN: RegExp;
export const SLUG_SEGMENT_CONTROL_CHAR_PATTERN: RegExp;

export const SLUG_SEGMENT_ISSUE_CODES: Readonly<{
  INVALID_TYPE: 'INVALID_TYPE';
  EMPTY: 'EMPTY';
  WHITESPACE: 'WHITESPACE';
  RESERVED_DOT_SEGMENT: 'RESERVED_DOT_SEGMENT';
  INVALID_DOT_PLACEMENT: 'INVALID_DOT_PLACEMENT';
  PATH_SEPARATOR: 'PATH_SEPARATOR';
  PERCENT_ENCODING_OR_CONTROL: 'PERCENT_ENCODING_OR_CONTROL';
  DISALLOWED_CHARACTER: 'DISALLOWED_CHARACTER';
  TOO_LONG: 'TOO_LONG';
}>;

export type SlugSegmentIssueCode =
  | 'INVALID_TYPE'
  | 'EMPTY'
  | 'WHITESPACE'
  | 'RESERVED_DOT_SEGMENT'
  | 'INVALID_DOT_PLACEMENT'
  | 'PATH_SEPARATOR'
  | 'PERCENT_ENCODING_OR_CONTROL'
  | 'DISALLOWED_CHARACTER'
  | 'TOO_LONG';

export interface SlugValidationIssue {
  code: SlugSegmentIssueCode;
  message: string;
}

export interface ValidSlugValidationResult {
  ok: true;
  value: string;
  normalized: string;
  issues: [];
}

export interface InvalidSlugValidationResult {
  ok: false;
  value: unknown;
  normalized: string;
  issues: [SlugValidationIssue, ...SlugValidationIssue[]];
}

export type SlugValidationResult = ValidSlugValidationResult | InvalidSlugValidationResult;

export class SlugValidationError extends Error {
  constructor(result: InvalidSlugValidationResult);
  readonly name: 'SlugValidationError';
  readonly code: SlugSegmentIssueCode;
  readonly issues: [SlugValidationIssue, ...SlugValidationIssue[]];
  readonly value: unknown;
  readonly normalized: string;
}

export function normalizeStoredSlug(slug: string | null | undefined): string;
export function normalizeSlugCandidate(slug: string | null | undefined): string;
export function generateContentSlug(value: string | null | undefined): string;
export function isEmptySlugValue(slug: string | null | undefined): boolean;
export function hasNonEmptySlug(slug: string | null | undefined): boolean;
export function resolveSlugCandidate(slug: string | null | undefined, fallbackText: string | null | undefined): string;
export function validateSlugSegment(value: unknown): SlugValidationResult;
export function isSafeSlugSegment(value: unknown): boolean;
export function assertSafeSlugSegment(value: unknown): string;
