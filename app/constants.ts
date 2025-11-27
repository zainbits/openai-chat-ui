/**
 * Application-wide constants
 * @module constants
 */

// ============================================================================
// Timing Constants
// ============================================================================

/** Connection check interval in milliseconds (2 minutes) */
export const CONNECTION_CHECK_INTERVAL_MS = 2 * 60 * 1000;

// ============================================================================
// UI Constants
// ============================================================================

/** Default sidebar width in pixels */
export const DEFAULT_SIDEBAR_WIDTH = 320;

/** Maximum characters for thread title */
export const MAX_THREAD_TITLE_LENGTH = 80;

/** Maximum characters for thread preview */
export const MAX_PREVIEW_LENGTH = 80;

/** Maximum words for AI-generated title */
export const MAX_TITLE_WORDS = 6;

/** Maximum characters for title generation prompt context */
export const TITLE_PROMPT_MAX_CHARS = 500;

// ============================================================================
// API Constants
// ============================================================================

/** Default temperature for title generation */
export const TITLE_GENERATION_TEMPERATURE = 0.2;

/** Default temperature for chat completions */
export const DEFAULT_CHAT_TEMPERATURE = 0.7;
