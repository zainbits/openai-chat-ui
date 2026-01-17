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
  ChatsById,
  ConnectionStatus,
  CustomModel,
} from "../types";
import { saveAppData } from "../utils/storage";
import { createChatSlice } from "./slices/chatSlice";
import { createConnectionSlice } from "./slices/connectionSlice";
import { createModelSlice } from "./slices/modelSlice";
import { createPersistenceSlice } from "./slices/persistenceSlice";
import { createSettingsSlice } from "./slices/settingsSlice";
import { createStreamingSlice } from "./slices/streamingSlice";
import { createUiSlice } from "./slices/uiSlice";
import type { AppStore } from "./types";

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get, store) => ({
    ...createSettingsSlice(set, get, store),
    ...createUiSlice(set, get, store),
    ...createChatSlice(set, get, store),
    ...createModelSlice(set, get, store),
    ...createConnectionSlice(set, get, store),
    ...createStreamingSlice(set, get, store),
    ...createPersistenceSlice(set, get, store),
  })),
);

// ============================================================================
// Persistence Subscription
// ============================================================================

// Subscribe to state changes and persist to IndexedDB
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
