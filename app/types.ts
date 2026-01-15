export type Role = "user" | "assistant";

/**
 * Thinking/reasoning effort level - maps to provider-specific values:
 * - OpenAI: reasoning_effort parameter ("low", "medium", "high")
 * - Anthropic/Gemini: budget_tokens (8192, 16384, 32768)
 */
export type ThinkingEffort = "low" | "medium" | "high";

/**
 * Content part for multimodal messages (OpenAI Vision API format)
 */
export interface TextContentPart {
  type: "text";
  text: string;
}

export interface ImageContentPart {
  type: "image_url";
  image_url: {
    url: string; // base64 data URL or remote URL
  };
}

export type ContentPart = TextContentPart | ImageContentPart;

/**
 * Image attachment for pending uploads in the composer
 */
export interface ImageAttachment {
  id: string;
  file: File;
  previewUrl: string; // Object URL for preview
  base64?: string; // Base64 data URL (set after processing)
}

export interface CustomModel {
  id: string;
  name: string;
  color: string; // tailwind color hex or token
  system: string;
  model: string; // remote model id
  temp: number;
  /**
   * Enables "thinking"/reasoning mode for models/APIs that support it.
   * Optional for backwards compatibility with existing persisted data.
   */
  thinkingEnabled?: boolean;
  /**
   * Controls thinking depth/budget. Defaults to "medium" if not set.
   */
  thinkingEffort?: ThinkingEffort;
  /**
   * Timestamp of last update (ISO string from server).
   * Used for conflict detection when syncing across machines.
   */
  updatedAt?: string;
}

export interface ChatMessage {
  role: Role;
  content: string;
  ts: number; // epoch ms
  /**
   * Thinking/reasoning content from models that support extended thinking.
   * Present only on assistant messages when the model returns thinking blocks.
   */
  thinking?: string;
  /**
   * Image attachments for this message (user messages only).
   * Stored as base64 data URLs for persistence and API calls.
   */
  images?: string[];
}

export interface ChatThread {
  id: string;
  modelId: string;
  title: string;
  isPinned: boolean;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  preview: string;
}

export type ChatsById = Record<string, ChatThread>;

export interface UiState {
  sidebarOpen: boolean;
  sidebarWidth: number; // px
  activeThread: string | null;
  searchQuery: string;
  selectedModel: string | "all";
}

export interface AppData {
  models: CustomModel[];
  chats: ChatsById;
  ui: UiState;
  settings: AppSettings;
  availableModels?: DiscoveredModel[];
  connectionStatus?: ConnectionStatus;
}

export interface AppSettings {
  apiBaseUrl: string;
  apiKey?: string;
  apiProvider?: string; // Provider ID (e.g., "openai", "anthropic", "custom")
  defaultModel: string;
  streamingEnabled: boolean;
  glassEffectEnabled: boolean;
  showActiveModelIndicator: boolean;
  lowSpecBlur?: number;
  // Cloud sync settings
  cloudSyncEnabled?: boolean;
  adminApiUrl?: string;
  adminPassword?: string;
}

export interface StreamHandle {
  abortController: AbortController;
  cancel: () => void;
}

export interface DiscoveredModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[];
}

export interface SendMessageParams {
  threadId: string;
  content: string;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (err: unknown) => void;
}

export type SortOption = "date" | "name" | "model";

export type ConnectionStatus = "unknown" | "connecting" | "connected" | "error";
