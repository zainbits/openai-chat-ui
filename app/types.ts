export type Role = "user" | "assistant";

export interface CustomModel {
  id: string;
  name: string;
  color: string; // tailwind color hex or token
  system: string;
  model: string; // remote model id
  temp: number;
}

export interface ChatMessage {
  role: Role;
  content: string;
  ts: number; // epoch ms
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
  defaultModel: string;
  streamingEnabled: boolean;
  glassEffectEnabled: boolean;
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
