/**
 * Zustand store for application state management
 * Provides clean, type-safe actions for all state mutations
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { useShallow } from "zustand/shallow";
import type {
  AppData,
  AppSettings,
  ChatThread,
  ChatMessage,
  CustomModel,
  UiState,
  ConnectionStatus,
  DiscoveredModel,
  ChatsById,
} from "../types";
import { OpenAICompatibleClient, AnthropicClient, type ApiClient } from "../api/client";
import { loadAppData, saveAppData, wipeAll } from "../utils/storage";
import { getModelColor } from "../theme/colors";
import { ANTHROPIC_PROVIDER_ID } from "../constants";

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_API_BASE_URL =
  typeof import.meta !== "undefined" &&
  import.meta.env?.VITE_DEFAULT_API_BASE_URL
    ? import.meta.env.VITE_DEFAULT_API_BASE_URL
    : "http://localhost:3017/v1";

const DEFAULT_MODEL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_DEFAULT_MODEL
    ? import.meta.env.VITE_DEFAULT_MODEL
    : "qwen3-coder-plus";

const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  defaultModel: DEFAULT_MODEL,
  streamingEnabled: true,
  glassEffectEnabled: true,
};

const STARTER_MODELS: CustomModel[] = [
  {
    id: "general",
    name: "General Chat",
    color: getModelColor("general"),
    system: "You are a helpful AI assistant.",
    model: "qwen3-coder-plus",
    temp: 0.7,
  },
  {
    id: "linux",
    name: "Linux Expert",
    color: getModelColor("linux"),
    system:
      "You are an expert in Linux commands. Always include safety warnings and explain steps.",
    model: "qwen3-coder-plus",
    temp: 0.2,
  },
];

const DEFAULT_UI: UiState = {
  sidebarOpen: false,
  sidebarWidth: 320,
  activeThread: null,
  searchQuery: "",
  selectedModel: "all",
};

// ============================================================================
// Store Types
// ============================================================================

interface AppStoreState {
  // Core state
  models: CustomModel[];
  chats: ChatsById;
  ui: UiState;
  settings: AppSettings;
  availableModels: DiscoveredModel[];
  connectionStatus: ConnectionStatus;
  _hydrated: boolean;

  // Streaming state (shared across components)
  isLoading: boolean;
  isRegenerating: boolean;
}

interface AppStoreActions {
  // API Client (memoized)
  getClient: () => ApiClient;

  // UI Actions
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
  setActiveThread: (threadId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedModel: (modelId: string | "all") => void;

  // Thread Actions
  createThread: (modelId: string) => ChatThread;
  deleteThread: (threadId: string) => void;
  renameThread: (threadId: string, newTitle: string) => void;
  togglePinThread: (threadId: string) => void;
  updateThreadTitle: (threadId: string, title: string) => void;
  updateThreadModel: (threadId: string, modelId: string) => void;
  nukeAll: () => void;

  // Message Actions
  addUserMessage: (threadId: string, content: string) => void;
  addAssistantMessage: (threadId: string) => void;
  appendToLastMessage: (threadId: string, token: string) => void;
  removeMessagesAfterIndex: (threadId: string, index: number) => void;
  setThreadPreview: (threadId: string, preview: string) => void;

  // Model Actions
  addModel: (model: Omit<CustomModel, "id">) => void;
  updateModel: (modelId: string, updates: Partial<CustomModel>) => void;
  deleteModel: (modelId: string) => void;

  // Settings Actions
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Connection Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAvailableModels: (models: DiscoveredModel[]) => void;
  checkConnection: () => Promise<void>;

  // Streaming Actions
  setIsLoading: (loading: boolean) => void;
  setIsRegenerating: (regenerating: boolean) => void;

  // Persistence
  _hydrate: () => void;
}

type AppStore = AppStoreState & AppStoreActions;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique ID for new entities using crypto.randomUUID()
 */
const generateId = (): string => crypto.randomUUID();

/**
 * Creates a new chat thread for a given model
 */
const createThreadForModel = (modelId: string): ChatThread => {
  const now = Date.now();
  return {
    id: generateId(),
    modelId,
    title: "New chat",
    isPinned: false,
    messages: [],
    createdAt: now,
    updatedAt: now,
    preview: "",
  };
};

// ============================================================================
// Store Implementation
// ============================================================================

/** Cached API client instance */
let cachedClient: ApiClient | null = null;
let cachedClientKey: string = "";

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    models: STARTER_MODELS,
    chats: {},
    ui: DEFAULT_UI,
    settings: DEFAULT_SETTINGS,
    availableModels: [],
    connectionStatus: "unknown",
    _hydrated: false,
    isLoading: false,
    isRegenerating: false,

    // API Client getter (memoized by settings)
    getClient: () => {
      const { apiBaseUrl, apiKey, apiProvider } = get().settings;
      const key = `${apiProvider ?? ""}:${apiBaseUrl}:${apiKey ?? ""}`;

      if (cachedClient && cachedClientKey === key) {
        return cachedClient;
      }

      // Use AnthropicClient for Anthropic provider, OpenAI-compatible for everything else
      if (apiProvider === ANTHROPIC_PROVIDER_ID) {
        cachedClient = new AnthropicClient({ apiBaseUrl, apiKey, apiProvider });
      } else {
        cachedClient = new OpenAICompatibleClient({ apiBaseUrl, apiKey, apiProvider });
      }
      cachedClientKey = key;
      return cachedClient;
    },

    // ========================================================================
    // UI Actions
    // ========================================================================

    toggleSidebar: () =>
      set((state) => ({
        ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
      })),

    closeSidebar: () =>
      set((state) => ({
        ui: { ...state.ui, sidebarOpen: false },
      })),

    openSidebar: () =>
      set((state) => ({
        ui: { ...state.ui, sidebarOpen: true },
      })),

    setActiveThread: (threadId) =>
      set((state) => ({
        ui: { ...state.ui, activeThread: threadId },
      })),

    setSearchQuery: (query) =>
      set((state) => ({
        ui: { ...state.ui, searchQuery: query },
      })),

    setSelectedModel: (modelId) =>
      set((state) => ({
        ui: { ...state.ui, selectedModel: modelId },
      })),

    // ========================================================================
    // Thread Actions
    // ========================================================================

    createThread: (modelId) => {
      const thread = createThreadForModel(modelId);
      set((state) => ({
        chats: { ...state.chats, [thread.id]: thread },
        ui: { ...state.ui, activeThread: thread.id, sidebarOpen: true },
      }));
      return thread;
    },

    deleteThread: (threadId) =>
      set((state) => {
        const { [threadId]: _, ...remainingChats } = state.chats;
        const isActive = state.ui.activeThread === threadId;
        return {
          chats: remainingChats,
          ui: {
            ...state.ui,
            activeThread: isActive ? null : state.ui.activeThread,
          },
        };
      }),

    renameThread: (threadId, newTitle) =>
      set((state) => ({
        chats: {
          ...state.chats,
          [threadId]: {
            ...state.chats[threadId],
            title: newTitle,
            updatedAt: Date.now(),
          },
        },
      })),

    togglePinThread: (threadId) =>
      set((state) => ({
        chats: {
          ...state.chats,
          [threadId]: {
            ...state.chats[threadId],
            isPinned: !state.chats[threadId].isPinned,
            updatedAt: Date.now(),
          },
        },
      })),

    updateThreadTitle: (threadId, title) =>
      set((state) => ({
        chats: {
          ...state.chats,
          [threadId]: {
            ...state.chats[threadId],
            title: title.slice(0, 80),
            updatedAt: Date.now(),
          },
        },
      })),

    updateThreadModel: (threadId, modelId) =>
      set((state) => {
        const thread = state.chats[threadId];
        if (!thread) return state;

        return {
          chats: {
            ...state.chats,
            [threadId]: {
              ...thread,
              modelId,
              updatedAt: Date.now(),
            },
          },
        };
      }),

    nukeAll: () => {
      // Clear localStorage completely
      wipeAll();
      // Reset state to defaults
      set({
        models: STARTER_MODELS,
        chats: {},
        ui: { ...DEFAULT_UI, sidebarOpen: false },
        settings: DEFAULT_SETTINGS,
        availableModels: [],
        connectionStatus: "unknown",
      });
    },

    // ========================================================================
    // Message Actions
    // ========================================================================

    addUserMessage: (threadId, content) => {
      const now = Date.now();
      const message: ChatMessage = { role: "user", content, ts: now };

      set((state) => {
        const thread = state.chats[threadId];
        if (!thread) return state;

        return {
          chats: {
            ...state.chats,
            [threadId]: {
              ...thread,
              messages: [...thread.messages, message],
              updatedAt: now,
              preview: thread.preview || content.slice(0, 80),
            },
          },
        };
      });
    },

    addAssistantMessage: (threadId) => {
      const now = Date.now();
      const message: ChatMessage = { role: "assistant", content: "", ts: now };

      set((state) => {
        const thread = state.chats[threadId];
        if (!thread) return state;

        return {
          chats: {
            ...state.chats,
            [threadId]: {
              ...thread,
              messages: [...thread.messages, message],
              updatedAt: now,
            },
          },
        };
      });
    },

    appendToLastMessage: (threadId, token) =>
      set((state) => {
        const thread = state.chats[threadId];
        if (!thread || thread.messages.length === 0) return state;

        const messages = [...thread.messages];
        const lastIndex = messages.length - 1;
        messages[lastIndex] = {
          ...messages[lastIndex],
          content: messages[lastIndex].content + token,
        };

        return {
          chats: {
            ...state.chats,
            [threadId]: {
              ...thread,
              messages,
              updatedAt: Date.now(),
            },
          },
        };
      }),

    removeMessagesAfterIndex: (threadId, index) =>
      set((state) => {
        const thread = state.chats[threadId];
        if (!thread) return state;

        return {
          chats: {
            ...state.chats,
            [threadId]: {
              ...thread,
              messages: thread.messages.slice(0, index + 1),
              updatedAt: Date.now(),
            },
          },
        };
      }),

    setThreadPreview: (threadId, preview) =>
      set((state) => ({
        chats: {
          ...state.chats,
          [threadId]: {
            ...state.chats[threadId],
            preview,
          },
        },
      })),

    // ========================================================================
    // Model Actions
    // ========================================================================

    addModel: (modelData) => {
      // Generate a secure random suffix for the model ID
      const randomSuffix = generateId().slice(0, 8);
      const id =
        modelData.name.toLowerCase().replace(/\s+/g, "-") + "-" + randomSuffix;
      const model: CustomModel = { ...modelData, id };

      set((state) => ({
        models: [...state.models, model],
      }));
    },

    updateModel: (modelId, updates) =>
      set((state) => ({
        models: state.models.map((m) =>
          m.id === modelId ? { ...m, ...updates } : m,
        ),
      })),

    deleteModel: (modelId) =>
      set((state) => ({
        models: state.models.filter((m) => m.id !== modelId),
      })),

    // ========================================================================
    // Settings Actions
    // ========================================================================

    updateSettings: (updates) => {
      // Clear cached client when settings change
      cachedClient = null;
      cachedClientKey = "";

      set((state) => ({
        settings: { ...state.settings, ...updates },
      }));
    },

    // ========================================================================
    // Connection Actions
    // ========================================================================

    setConnectionStatus: (status) => set({ connectionStatus: status }),

    setAvailableModels: (models) => set({ availableModels: models }),

    checkConnection: async () => {
      const { setConnectionStatus, setAvailableModels, getClient } = get();

      setConnectionStatus("connecting");

      try {
        const client = getClient();
        const models = await client.listModels();
        setConnectionStatus("connected");
        setAvailableModels(models);
      } catch {
        setConnectionStatus("error");
      }
    },

    // ========================================================================
    // Streaming Actions
    // ========================================================================

    setIsLoading: (loading) => set({ isLoading: loading }),

    setIsRegenerating: (regenerating) => set({ isRegenerating: regenerating }),

    // ========================================================================
    // Persistence
    // ========================================================================

    _hydrate: () => {
      const saved = loadAppData();
      if (saved) {
        set({
          models: saved.models ?? STARTER_MODELS,
          chats: saved.chats ?? {},
          ui: { ...DEFAULT_UI, ...saved.ui, sidebarOpen: false },
          settings: { ...DEFAULT_SETTINGS, ...saved.settings },
          availableModels: saved.availableModels ?? [],
          connectionStatus: "unknown",
          _hydrated: true,
        });
      } else {
        set({ _hydrated: true });
      }
    },
  })),
);

// ============================================================================
// Persistence Subscription
// ============================================================================

// Subscribe to state changes and persist to localStorage
useAppStore.subscribe(
  (state) => ({
    models: state.models,
    chats: state.chats,
    ui: state.ui,
    settings: state.settings,
    availableModels: state.availableModels,
  }),
  (slice) => {
    if (useAppStore.getState()._hydrated) {
      saveAppData(slice as AppData);
    }
  },
  { equalityFn: shallow },
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

/** Select the active thread */
export const selectActiveThread = (state: AppStore): ChatThread | null =>
  state.ui.activeThread ? (state.chats[state.ui.activeThread] ?? null) : null;

/** Select the active model configuration */
export const selectActiveModel = (state: AppStore): CustomModel | null => {
  const thread = selectActiveThread(state);
  return thread
    ? (state.models.find((m) => m.id === thread.modelId) ?? null)
    : null;
};

/** Select the chats object (use with shallow comparison) */
export const selectChats = (state: AppStore): ChatsById => state.chats;

/** Select connection status */
export const selectConnectionStatus = (state: AppStore): ConnectionStatus =>
  state.connectionStatus;

/** Select settings */
export const selectSettings = (state: AppStore): AppSettings => state.settings;

// ============================================================================
// Hooks for common patterns
// ============================================================================

/**
 * Hook to get threads as an array with shallow comparison
 * Prevents infinite re-renders by using shallow equality on the chats object
 */
export function useThreads(): ChatThread[] {
  const chats = useAppStore(useShallow((state) => state.chats));
  return Object.values(chats);
}
