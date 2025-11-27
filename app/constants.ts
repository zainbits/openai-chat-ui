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

/** Available API provider presets (configurable) */
export const API_PROVIDER_PRESETS: ApiProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
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
