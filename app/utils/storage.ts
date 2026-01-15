/**
 * Storage utilities for persisting app data to localStorage
 * @module storage
 */
import type { AppData, UiState } from "../types";
import { APP_DATA_VERSION, normalizePersistedAppData } from "./appData";

/** Storage key for app data */
const KEY = "custommodels-chat:v1";

/** UI state keys that should not be persisted */
type TransientUiKeys = "sidebarOpen";

/** UI state that gets persisted (excludes transient state) */
type PersistedUiState = Omit<UiState, TransientUiKeys>;

/** App data structure for persistence (with filtered UI state) */
interface PersistedAppData extends Omit<AppData, "ui" | "connectionStatus"> {
  version: number;
  ui: PersistedUiState;
}

const sanitizeChatsForStorage = (chats: AppData["chats"]): AppData["chats"] =>
  Object.fromEntries(
    Object.entries(chats).map(([threadId, thread]) => {
      const messages = thread.messages.map((message) => {
        if (message.imageIds && message.imageIds.length > 0) {
          const { images, ...restMessage } = message;
          return restMessage;
        }
        return message;
      });
      return [threadId, { ...thread, messages }];
    }),
  ) as AppData["chats"];

/**
 * Loads app data from localStorage
 * @returns The saved app data, or null if not found or invalid
 */
export function loadAppData(defaults: AppData): AppData | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizePersistedAppData(parsed, defaults);
  } catch (err) {
    console.error("Failed to load app data:", err);
    return null;
  }
}

/**
 * Saves app data to localStorage
 * Excludes transient UI state like sidebarOpen so responsive defaults can be applied on load
 * @param data - The app data to save
 */
export function saveAppData(data: AppData): void {
  if (typeof localStorage === "undefined") return;
  try {
    // Destructure to exclude transient state
    const { sidebarOpen, ...persistedUi } = data.ui;
    const { connectionStatus, ...rest } = data;

    const dataToStore: PersistedAppData = {
      ...rest,
      chats: sanitizeChatsForStorage(rest.chats),
      version: APP_DATA_VERSION,
      ui: persistedUi,
    };

    localStorage.setItem(KEY, JSON.stringify(dataToStore));
  } catch (err) {
    console.error("Failed to save app data:", err);
  }
}

/**
 * Exports app data as a formatted JSON string
 * @param data - The app data to export
 * @returns Formatted JSON string
 */
export function exportJson(data: AppData): string {
  return JSON.stringify(
    {
      ...data,
      chats: sanitizeChatsForStorage(data.chats),
      version: APP_DATA_VERSION,
    },
    null,
    2,
  );
}

/**
 * Imports app data from a JSON string
 * @param json - The JSON string to parse
 * @returns Parsed app data
 * @throws Error if the JSON is invalid
 */
export function importJson(json: string): unknown {
  return JSON.parse(json);
}

/**
 * Wipes all saved app data from localStorage
 */
export function wipeAll(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.error("Failed to wipe app data:", err);
  }
}
