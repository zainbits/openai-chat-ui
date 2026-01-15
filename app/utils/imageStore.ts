export interface StoredImage {
  id: string;
  dataUrl: string;
}

const DB_NAME = "custommodels-chat";
const STORE_NAME = "images";
const DB_VERSION = 1;

const hasIndexedDb = typeof indexedDB !== "undefined";

let dbPromise: Promise<IDBDatabase> | null = null;

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const waitForTransaction = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
  });

const openDb = (): Promise<IDBDatabase> => {
  if (!hasIndexedDb) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  return dbPromise;
};

export async function saveImages(images: StoredImage[]): Promise<boolean> {
  if (!images.length) return true;
  if (!hasIndexedDb) return false;

  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    images.forEach((image) => {
      store.put(image.dataUrl, image.id);
    });

    await waitForTransaction(tx);
    return true;
  } catch {
    return false;
  }
}

export async function getImagesByIds(
  ids: string[],
): Promise<Array<string | null>> {
  if (!ids.length) return [];
  if (!hasIndexedDb) return ids.map(() => null);

  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  const results = await Promise.all(
    ids.map(async (id) => {
      const value = await requestToPromise(store.get(id));
      return typeof value === "string" ? value : null;
    }),
  );

  await waitForTransaction(tx);
  return results;
}

export async function deleteImages(ids: string[]): Promise<void> {
  if (!ids.length) return;
  if (!hasIndexedDb) return;

  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  ids.forEach((id) => {
    store.delete(id);
  });

  await waitForTransaction(tx);
}

export async function clearImageStore(): Promise<void> {
  if (!hasIndexedDb) return;

  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).clear();
  await waitForTransaction(tx);
}

export async function isImageStoreReady(): Promise<boolean> {
  if (!hasIndexedDb) return false;
  try {
    await openDb();
    return true;
  } catch {
    return false;
  }
}

export async function listImageIds(): Promise<string[]> {
  if (!hasIndexedDb) return [];

  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  const keys = await requestToPromise(store.getAllKeys());
  await waitForTransaction(tx);

  return keys.filter((key): key is string => typeof key === "string");
}

export async function cleanupImageStore(
  referencedIds: string[],
): Promise<number> {
  if (!hasIndexedDb) return 0;

  const referenced = new Set(referencedIds);
  const allIds = await listImageIds();
  const toDelete = allIds.filter((id) => !referenced.has(id));

  if (toDelete.length > 0) {
    await deleteImages(toDelete);
  }

  return toDelete.length;
}
