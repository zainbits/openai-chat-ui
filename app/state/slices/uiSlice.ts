import type { StateCreator } from "zustand";
import type { UiState } from "../../types";
import type { AppStore } from "../types";
import { DEFAULT_UI } from "../defaults";

export interface UiSlice {
  ui: UiState;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
  setActiveThread: (threadId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedModel: (modelId: string | "all") => void;
}

export const createUiSlice: StateCreator<AppStore, [], [], UiSlice> = (
  set,
) => ({
  ui: DEFAULT_UI,

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
});
