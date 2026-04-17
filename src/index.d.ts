export const CONTENT_SLUG_MAX_LENGTH: number;
export const SLUG_SEGMENT_CONTROL_CHAR_PATTERN: RegExp;

export const SLUG_SEGMENT_ISSUE_CODES: Readonly<{
  INVALID_TYPE: 'INVALID_TYPE';
  EMPTY: 'EMPTY';
  LEADING_OR_TRAILING_WHITESPACE: 'LEADING_OR_TRAILING_WHITESPACE';
  RESERVED_DOT_SEGMENT: 'RESERVED_DOT_SEGMENT';
  PATH_SEPARATOR: 'PATH_SEPARATOR';
  PERCENT_ENCODING_OR_CONTROL: 'PERCENT_ENCODING_OR_CONTROL';
}>;

export type SlugSegmentIssueCode =
  | 'INVALID_TYPE'
  | 'EMPTY'
  | 'LEADING_OR_TRAILING_WHITESPACE'
  | 'RESERVED_DOT_SEGMENT'
  | 'PATH_SEPARATOR'
  | 'PERCENT_ENCODING_OR_CONTROL';

export interface SlugValidationIssue {
  code: SlugSegmentIssueCode;
  message: string;
}

export interface SlugValidationResult {
  ok: boolean;
  value: string;
  normalized: string;
  issues: SlugValidationIssue[];
}

export function normalizeStoredSlug(slug: string | null | undefined): string;
export function normalizeSlugCandidate(slug: string | null | undefined): string;
export function generateContentSlug(value: string | null | undefined): string;
export function isEmptySlugValue(slug: string | null | undefined): boolean;
export function hasNonEmptySlug(slug: string | null | undefined): boolean;
export function validateSlugSegment(value: unknown): SlugValidationResult;
export function isSafeSlugSegment(value: unknown): boolean;
export function assertSafeSlugSegment(value: unknown): string;
