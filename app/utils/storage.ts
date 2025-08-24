import type { AppData } from "../types";

const KEY = "custommodels-chat:v1";

export function loadAppData(): AppData | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch (err) {
    console.error("Failed to load app data", err);
    return null;
  }
}

export function saveAppData(data: AppData) {
  if (typeof localStorage === "undefined") return;
  try {
    // Do not persist ui.sidebarOpen so mobile/desktop defaults can be applied on load
    const { ui, ...rest } = data;
    const { sidebarOpen, ...uiRest } = ui as any;
    const dataToStore = { ...rest, ui: uiRest } as unknown as AppData;
    localStorage.setItem(KEY, JSON.stringify(dataToStore));
  } catch (err) {
    console.error("Failed to save app data", err);
  }
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(json: string): AppData {
  const parsed = JSON.parse(json) as AppData;
  return parsed;
}

export function wipeAll() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.error("Failed to wipe app data", err);
  }
}
