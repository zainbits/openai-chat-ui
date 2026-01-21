import type { StateCreator } from "zustand";
import type {
  ChatMessage,
  ChatThread,
  ChatsById,
  TokenUsage,
} from "../../types";
import type { AppStore } from "../types";
import { MAX_PREVIEW_LENGTH, MAX_THREAD_TITLE_LENGTH } from "../../constants";
import { generateId } from "../utils";
import { deleteImages } from "../../utils/imageStore";

export interface ChatSlice {
  chats: ChatsById;
  createThread: (modelId: string) => ChatThread;
  deleteThread: (threadId: string) => void;
  renameThread: (threadId: string, newTitle: string) => void;
  togglePinThread: (threadId: string) => void;
  updateThreadTitle: (threadId: string, title: string) => void;
  updateThreadModel: (threadId: string, modelId: string) => void;
  deleteAllChats: () => void;
  addUserMessage: (
    threadId: string,
    content: string,
    images?: string[],
    imageIds?: string[],
  ) => void;
  addAssistantMessage: (threadId: string) => void;
  appendToLastMessage: (threadId: string, token: string) => void;
  appendThinkingToLastMessage: (
    threadId: string,
    thinkingToken: string,
  ) => void;
  removeMessagesAfterIndex: (threadId: string, index: number) => void;
  setThreadPreview: (threadId: string, preview: string) => void;
  updateMessageContent: (
    threadId: string,
    messageIndex: number,
    content: string,
  ) => void;
  setThreadTokenUsage: (threadId: string, usage: TokenUsage) => void;
  /**
   * Creates a new thread by forking an existing thread up to a specific message index.
   * The new thread will have the same title with "(1)" appended, same model, and
   * messages up to (but not including) the specified index.
   * Returns the new thread.
   */
  forkThread: (threadId: string, upToIndex: number) => ChatThread | null;
}

const createThreadForModel = (modelId: string): ChatThread => {
  const now = Date.now();
  return {
    id: generateId(),
    modelId,
    title: "New chat",
    isPinned: false,
    messages: [],
    createdAt: now,
    updatedAt: now,
    preview: "",
  };
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

const collectImageIdsFromMessages = (messages: ChatMessage[]): string[] => {
  const ids: string[] = [];
  messages.forEach((message) => {
    if (message.imageIds && message.imageIds.length > 0) {
      ids.push(...message.imageIds);
    }
  });
  return ids;
};

export const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (
  set,
  get,
) => ({
  chats: {},

  createThread: (modelId) => {
    const thread = createThreadForModel(modelId);
    set((state) => ({
      chats: { ...state.chats, [thread.id]: thread },
      ui: { ...state.ui, activeThread: thread.id, sidebarOpen: true },
    }));
    return thread;
  },

  deleteThread: (threadId) => {
    const thread = get().chats[threadId];
    if (thread) {
      void deleteImages(collectImageIds([thread]));
    }

    set((state) => {
      const { [threadId]: _, ...remainingChats } = state.chats;
      const isActive = state.ui.activeThread === threadId;
      return {
        chats: remainingChats,
        ui: {
          ...state.ui,
          activeThread: isActive ? null : state.ui.activeThread,
        },
      };
    });
  },

  renameThread: (threadId, newTitle) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [threadId]: {
          ...state.chats[threadId],
          title: newTitle,
          updatedAt: Date.now(),
        },
      },
    })),

  togglePinThread: (threadId) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [threadId]: {
          ...state.chats[threadId],
          isPinned: !state.chats[threadId].isPinned,
        },
      },
    })),

  updateThreadTitle: (threadId, title) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [threadId]: {
          ...state.chats[threadId],
          title: title.slice(0, MAX_THREAD_TITLE_LENGTH),
          updatedAt: Date.now(),
        },
      },
    })),

  updateThreadModel: (threadId, modelId) =>
    set((state) => {
      const thread = state.chats[threadId];
      if (!thread) return state;

      return {
        chats: {
          ...state.chats,
          [threadId]: {
            ...thread,
            modelId,
            updatedAt: Date.now(),
          },
        },
      };
    }),

  deleteAllChats: () => {
    const threads = Object.values(get().chats);
    if (threads.length > 0) {
      void deleteImages(collectImageIds(threads));
    }

    set((state) => ({
      chats: {},
      ui: { ...state.ui, activeThread: null },
    }));
  },

  addUserMessage: (threadId, content, images, imageIds) => {
    const now = Date.now();
    const message: ChatMessage = {
      role: "user",
      content,
      ts: now,
      ...(images && images.length > 0 ? { images } : {}),
      ...(imageIds && imageIds.length > 0 ? { imageIds } : {}),
    };

    set((state) => {
      const thread = state.chats[threadId];
      if (!thread) return state;

      return {
        chats: {
          ...state.chats,
          [threadId]: {
            ...thread,
            messages: [...thread.messages, message],
            updatedAt: now,
            preview:
              thread.preview ||
              content.slice(0, MAX_PREVIEW_LENGTH) ||
              (images?.length ? "[Image]" : ""),
          },
        },
      };
    });
  },

  addAssistantMessage: (threadId) => {
    const now = Date.now();
    const message: ChatMessage = { role: "assistant", content: "", ts: now };

    set((state) => {
      const thread = state.chats[threadId];
      if (!thread) return state;

      return {
        chats: {
          ...state.chats,
          [threadId]: {
            ...thread,
            messages: [...thread.messages, message],
            updatedAt: now,
          },
        },
      };
    });
  },

  appendToLastMessage: (threadId, token) =>
    set((state) => {
      const thread = state.chats[threadId];
      if (!thread || thread.messages.length === 0) return state;

      const messages = [...thread.messages];
      const lastIndex = messages.length - 1;
      messages[lastIndex] = {
        ...messages[lastIndex],
        content: messages[lastIndex].content + token,
      };

      return {
        chats: {
          ...state.chats,
          [threadId]: {
            ...thread,
            messages,
            updatedAt: Date.now(),
          },
        },
      };
    }),

  appendThinkingToLastMessage: (threadId, thinkingToken) =>
    set((state) => {
      const thread = state.chats[threadId];
      if (!thread || thread.messages.length === 0) return state;

      const messages = [...thread.messages];
      const lastIndex = messages.length - 1;
      const currentThinking = messages[lastIndex].thinking ?? "";
      messages[lastIndex] = {
        ...messages[lastIndex],
        thinking: currentThinking + thinkingToken,
      };

      return {
        chats: {
          ...state.chats,
          [threadId]: {
            ...thread,
            messages,
            updatedAt: Date.now(),
          },
        },
      };
    }),

  removeMessagesAfterIndex: (threadId, index) => {
    const thread = get().chats[threadId];
    if (thread) {
      const removed = thread.messages.slice(index + 1);
      const removedIds = collectImageIdsFromMessages(removed);
      if (removedIds.length > 0) {
        void deleteImages(removedIds);
      }
    }

    set((state) => {
      const thread = state.chats[threadId];
      if (!thread) return state;

      return {
        chats: {
          ...state.chats,
          [threadId]: {
            ...thread,
            messages: thread.messages.slice(0, index + 1),
            updatedAt: Date.now(),
          },
        },
      };
    });
  },

  setThreadPreview: (threadId, preview) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [threadId]: {
          ...state.chats[threadId],
          preview: preview.slice(0, MAX_PREVIEW_LENGTH),
        },
      },
    })),

  updateMessageContent: (threadId, messageIndex, content) =>
    set((state) => {
      const thread = state.chats[threadId];
      if (!thread || messageIndex < 0 || messageIndex >= thread.messages.length)
        return state;

      const messages = [...thread.messages];
      messages[messageIndex] = {
        ...messages[messageIndex],
        content,
      };

      return {
        chats: {
          ...state.chats,
          [threadId]: {
            ...thread,
            messages,
            updatedAt: Date.now(),
          },
        },
      };
    }),

  setThreadTokenUsage: (threadId, usage) =>
    set((state) => {
      const thread = state.chats[threadId];
      if (!thread) return state;

      return {
        chats: {
          ...state.chats,
          [threadId]: {
            ...thread,
            tokenUsage: usage,
          },
        },
      };
    }),

  forkThread: (threadId, upToIndex) => {
    const sourceThread = get().chats[threadId];
    if (!sourceThread || upToIndex < 0) return null;

    const now = Date.now();
    // Copy messages up to (but not including) the specified index
    const forkedMessages = sourceThread.messages
      .slice(0, upToIndex)
      .map((m) => ({
        ...m,
        ts: now + Math.random(), // Ensure unique timestamps
      }));

    // Generate new title with (1) suffix
    const baseTitle = sourceThread.title.replace(/\s*\(\d+\)$/, ""); // Remove existing (N) suffix if any
    const newTitle = `${baseTitle} (1)`.slice(0, MAX_THREAD_TITLE_LENGTH);

    const newThread: ChatThread = {
      id: generateId(),
      modelId: sourceThread.modelId,
      title: newTitle,
      isPinned: false,
      messages: forkedMessages,
      createdAt: now,
      updatedAt: now,
      preview: sourceThread.preview,
    };

    set((state) => ({
      chats: { ...state.chats, [newThread.id]: newThread },
      ui: { ...state.ui, activeThread: newThread.id, sidebarOpen: true },
    }));

    return newThread;
  },
});
