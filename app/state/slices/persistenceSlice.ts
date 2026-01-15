import type { StateCreator } from "zustand";
import type { AppStore } from "../types";
import {
  deleteLocalStorageAppData,
  loadAppData,
  wipeAll,
} from "../../utils/storage";
import {
  clearAppDataFromDb,
  loadAppDataFromDb,
} from "../../utils/appDataStore";
import {
  DEFAULT_APP_DATA,
  DEFAULT_SETTINGS,
  DEFAULT_UI,
  STARTER_MODELS,
} from "../defaults";
import type { ChatMessage, ChatThread, ChatsById } from "../../types";
import { generateId } from "../utils";
import {
  cleanupImageStore,
  clearImageStore,
  saveImages,
} from "../../utils/imageStore";

export interface PersistenceSlice {
  _hydrated: boolean;
  _hydrate: () => void;
  nukeAll: () => void;
}

export const createPersistenceSlice: StateCreator<
  AppStore,
  [],
  [],
  PersistenceSlice
> = (set) => ({
  _hydrated: false,

  _hydrate: () => {
    void (async () => {
      const fromDb = await loadAppDataFromDb(DEFAULT_APP_DATA);
      const fromLocal = loadAppData(DEFAULT_APP_DATA);
      const saved = fromDb ?? fromLocal;

      if (saved) {
        set({
          models: saved.models,
          chats: saved.chats,
          ui: { ...DEFAULT_UI, ...saved.ui, sidebarOpen: false },
          settings: saved.settings,
          availableModels: saved.availableModels ?? [],
          connectionStatus: "unknown",
          _hydrated: true,
        });
        void migrateImagesToStore(saved.chats, set);

        if (saved.settings?.storageBackend === "indexeddb") {
          deleteLocalStorageAppData();
        }
      } else {
        set({ _hydrated: true });
      }
    })();
  },

  nukeAll: () => {
    // Clear localStorage completely
    wipeAll();
    void clearAppDataFromDb();
    void clearImageStore();
    // Reset state to defaults
    set({
      models: STARTER_MODELS,
      chats: {},
      ui: { ...DEFAULT_UI, sidebarOpen: false },
      settings: DEFAULT_SETTINGS,
      availableModels: [],
      connectionStatus: "unknown",
    });
  },
});

const migrateImagesToStore = async (
  chats: ChatsById,
  setState: (partial: Partial<AppStore>) => void,
): Promise<void> => {
  const imagesToStore: Array<{ id: string; dataUrl: string }> = [];
  let changed = false;
  const updatedChats: ChatsById = { ...chats };

  Object.entries(chats).forEach(([threadId, thread]) => {
    let messagesChanged = false;
    const messages: ChatMessage[] = thread.messages.map((message) => {
      if (message.images && message.images.length > 0 && !message.imageIds) {
        const imageIds = message.images.map(() => generateId());
        message.images.forEach((dataUrl, index) => {
          imagesToStore.push({ id: imageIds[index], dataUrl });
        });
        messagesChanged = true;
        return { ...message, imageIds, images: undefined };
      }
      return message;
    });

    if (messagesChanged) {
      updatedChats[threadId] = { ...thread, messages };
      changed = true;
    }
  });

  if (imagesToStore.length > 0) {
    const stored = await saveImages(imagesToStore);
    if (!stored) {
      console.warn("Failed to migrate images to IndexedDB");
      return;
    }
  }

  if (changed) {
    setState({ chats: updatedChats });
  }

  try {
    const referencedIds = collectImageIds(Object.values(updatedChats));
    await cleanupImageStore(referencedIds);
  } catch (error) {
    console.warn("Failed to cleanup image store:", error);
  }
};

const collectImageIds = (threads: ChatThread[]): string[] => {
  const ids: string[] = [];
  threads.forEach((thread) => {
    thread.messages.forEach((message) => {
      if (message.imageIds && message.imageIds.length > 0) {
        ids.push(...message.imageIds);
      }
    });
  });
  return ids;
};
