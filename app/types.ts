export type Role = "user" | "assistant";

/**
 * Thinking/reasoning effort level - maps to provider-specific values:
 * - OpenAI: reasoning_effort parameter ("low", "medium", "high")
 * - Anthropic/Gemini: budget_tokens (8192, 16384, 32768)
 */
export type ThinkingEffort = "low" | "medium" | "high";

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
  content: string;
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
