import {
  STORE_IMAGES,
  hasIndexedDb,
  openAppDb,
  requestToPromise,
  waitForTransaction,
} from "./indexedDb";

export interface StoredImage {
  id: string;
  dataUrl: string;
}

export async function saveImages(images: StoredImage[]): Promise<boolean> {
  if (!images.length) return true;
  if (!hasIndexedDb) return false;

  try {
    const db = await openAppDb();
    const tx = db.transaction(STORE_IMAGES, "readwrite");
    const store = tx.objectStore(STORE_IMAGES);

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

  const db = await openAppDb();
  const tx = db.transaction(STORE_IMAGES, "readonly");
  const store = tx.objectStore(STORE_IMAGES);

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

  const db = await openAppDb();
  const tx = db.transaction(STORE_IMAGES, "readwrite");
  const store = tx.objectStore(STORE_IMAGES);

  ids.forEach((id) => {
    store.delete(id);
  });

  await waitForTransaction(tx);
}

export async function clearImageStore(): Promise<void> {
  if (!hasIndexedDb) return;

  const db = await openAppDb();
  const tx = db.transaction(STORE_IMAGES, "readwrite");
  tx.objectStore(STORE_IMAGES).clear();
  await waitForTransaction(tx);
}

export async function isImageStoreReady(): Promise<boolean> {
  if (!hasIndexedDb) return false;
  try {
    await openAppDb();
    return true;
  } catch {
    return false;
  }
}

export async function listImageIds(): Promise<string[]> {
  if (!hasIndexedDb) return [];

  const db = await openAppDb();
  const tx = db.transaction(STORE_IMAGES, "readonly");
  const store = tx.objectStore(STORE_IMAGES);

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
