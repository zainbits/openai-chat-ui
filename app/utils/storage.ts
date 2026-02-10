/**
 * Storage utilities for persisting app data to IndexedDB
 * @module storage
 */
import type { AppData } from "../types";
import { saveAppDataToDb } from "./appDataStore";

const DEFAULT_SAVE_DEBOUNCE_MS = 750;

let pendingData: AppData | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let saveQueue: Promise<boolean> = Promise.resolve(true);

function enqueueSave(data: AppData): Promise<boolean> {
  saveQueue = saveQueue.catch(() => false).then(() => saveAppDataToDb(data));
  return saveQueue;
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
 * Saves app data to IndexedDB
 * @param data - The app data to save
 */
export function saveAppData(data: AppData): void {
  void enqueueSave(data);
}

/**
 * Schedules app data persistence, coalescing rapid updates into a single write.
 * @param data - The latest app data snapshot to persist
 * @param debounceMs - Delay window used to batch updates
 */
export function scheduleAppDataSave(
  data: AppData,
  debounceMs = DEFAULT_SAVE_DEBOUNCE_MS,
): void {
  pendingData = data;

  if (pendingTimer) {
    clearTimeout(pendingTimer);
  }

  pendingTimer = setTimeout(() => {
    const dataToSave = pendingData;
    pendingData = null;
    pendingTimer = null;

    if (dataToSave) {
      void enqueueSave(dataToSave);
    }
  }, debounceMs);
}

/**
 * Flushes any pending debounced save immediately.
 * @returns Whether the final save operation succeeded
 */
export async function flushScheduledAppDataSave(): Promise<boolean> {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }

  if (pendingData) {
    const dataToSave = pendingData;
    pendingData = null;
    return enqueueSave(dataToSave);
  }

  return saveQueue.catch(() => false);
}
