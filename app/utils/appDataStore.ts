import type { AppData } from "../types";
import { exportJson, normalizePersistedAppData } from "./appData";
import {
  STORE_APP_DATA,
  hasIndexedDb,
  openAppDb,
  requestToPromise,
  waitForTransaction,
} from "./indexedDb";

const APP_DATA_KEY = "app-data";

export async function saveAppDataToDb(data: AppData): Promise<boolean> {
  if (!hasIndexedDb) return false;

  try {
    const db = await openAppDb();
    const tx = db.transaction(STORE_APP_DATA, "readwrite");
    const store = tx.objectStore(STORE_APP_DATA);
    const payload = exportJson(data);
    store.put(payload, APP_DATA_KEY);
    await waitForTransaction(tx);
    return true;
  } catch {
    return false;
  }
}

export async function loadAppDataFromDb(
  defaults: AppData,
): Promise<AppData | null> {
  if (!hasIndexedDb) return null;

  try {
    const db = await openAppDb();
    const tx = db.transaction(STORE_APP_DATA, "readonly");
    const store = tx.objectStore(STORE_APP_DATA);
    const value = await requestToPromise(store.get(APP_DATA_KEY));
    await waitForTransaction(tx);

    if (typeof value !== "string") return null;

    const parsed = JSON.parse(value);
    return normalizePersistedAppData(parsed, defaults);
  } catch {
    return null;
  }
}

export async function clearAppDataFromDb(): Promise<void> {
  if (!hasIndexedDb) return;

  const db = await openAppDb();
  const tx = db.transaction(STORE_APP_DATA, "readwrite");
  const store = tx.objectStore(STORE_APP_DATA);
  store.delete(APP_DATA_KEY);
  await waitForTransaction(tx);
}

export async function isAppDataStoreReady(): Promise<boolean> {
  if (!hasIndexedDb) return false;
  try {
    await openAppDb();
    return true;
  } catch {
    return false;
  }
}
