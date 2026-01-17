/**
 * Storage utilities for persisting app data to IndexedDB
 * @module storage
 */
import type { AppData } from "../types";
import { saveAppDataToDb } from "./appDataStore";

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
  void saveAppDataToDb(data);
}
