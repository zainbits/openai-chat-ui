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

/** Default max tokens for Anthropic API */
export const ANTHROPIC_DEFAULT_MAX_TOKENS = 8192;

/** Anthropic API version */
export const ANTHROPIC_API_VERSION = "2023-06-01";

// ============================================================================
// Retry Configuration
// ============================================================================

/** Maximum number of retry attempts for API calls */
export const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff in milliseconds */
export const RETRY_BASE_DELAY_MS = 1000;

/** Maximum delay for exponential backoff in milliseconds */
export const RETRY_MAX_DELAY_MS = 10000;

/** HTTP status codes that should trigger a retry */
export const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

// ============================================================================
// API Provider Configuration
// ============================================================================

/** Provider preset configuration */
export interface ApiProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
}

/** Custom provider ID constant */
export const CUSTOM_PROVIDER_ID = "custom";

/** Anthropic provider ID constant */
export const ANTHROPIC_PROVIDER_ID = "anthropic";

/** Available API provider presets (configurable) */
export const API_PROVIDER_PRESETS: ApiProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: import.meta.env.DEV ? "/openai-proxy/v1" : "https://api.openai.com/v1",
  },
  {
    id: ANTHROPIC_PROVIDER_ID,
    label: "Anthropic",
    baseUrl: import.meta.env.DEV
      ? "/anthropic-proxy/v1"
      : "https://api.anthropic.com/v1",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: CUSTOM_PROVIDER_ID,
    label: "Custom",
    baseUrl: "",
  },
];
