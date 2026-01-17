import type { StateCreator } from "zustand";
import type { AppSettings } from "../../types";
import type { AppStore } from "../types";
import { createApiClient, type ApiClient } from "../../api/client";
import { DEFAULT_SETTINGS } from "../defaults";

export interface SettingsSlice {
  settings: AppSettings;
  getClient: () => ApiClient;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

/** Cached API client instance */
let cachedClient: ApiClient | null = null;
let cachedClientKey = "";

export const createSettingsSlice: StateCreator<
  AppStore,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: DEFAULT_SETTINGS,

  getClient: () => {
    const { apiBaseUrl, apiKey, apiProvider, streamingEnabled } =
      get().settings;
    const key = `${apiProvider ?? ""}:${apiBaseUrl}:${apiKey ?? ""}:${streamingEnabled}`;

    if (cachedClient && cachedClientKey === key) {
      return cachedClient;
    }

    cachedClient = createApiClient({
      apiBaseUrl,
      apiKey,
      apiProvider,
      streamingEnabled,
    });
    cachedClientKey = key;
    return cachedClient;
  },

  updateSettings: (updates) => {
    // Clear cached client when settings change
    cachedClient = null;
    cachedClientKey = "";

    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },
});
