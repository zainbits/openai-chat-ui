/**
 * Custom hook for managing chat interactions with the AI
 * Handles sending messages, streaming responses, and title generation
 */
import { useCallback, useRef } from "react";
import { notifications } from "@mantine/notifications";
import {
  useAppStore,
  selectActiveThread,
  selectActiveModel,
} from "../state/store";
import type { StreamHandle } from "../types";
import {
  TITLE_GENERATION_TEMPERATURE,
  TITLE_PROMPT_MAX_CHARS,
  MAX_TITLE_WORDS,
} from "../constants";

/**
 * Extracts a user-friendly error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

interface UseChatReturn {
  /** Whether a message is currently being sent/streamed */
  isLoading: boolean;
  /** Whether the last message is being regenerated */
  isRegenerating: boolean;
  /** Send a message to the AI */
  sendMessage: (content: string) => Promise<void>;
  /** Cancel the current streaming response */
  cancelStream: () => void;
  /** Regenerate the last assistant response */
  regenerateLastMessage: () => Promise<void>;
}

/**
 * Hook for managing chat interactions
 * Provides methods for sending messages, canceling streams, and regenerating responses
 */
export function useChat(): UseChatReturn {
  const streamRef = useRef<StreamHandle | null>(null);

  // Get streaming state from store (shared across components)
  const isLoading = useAppStore((s) => s.isLoading);
  const isRegenerating = useAppStore((s) => s.isRegenerating);
  const setIsLoading = useAppStore((s) => s.setIsLoading);
  const setIsRegenerating = useAppStore((s) => s.setIsRegenerating);

  // Get store actions and state
  const getClient = useAppStore((s) => s.getClient);
  const addUserMessage = useAppStore((s) => s.addUserMessage);
  const addAssistantMessage = useAppStore((s) => s.addAssistantMessage);
  const appendToLastMessage = useAppStore((s) => s.appendToLastMessage);
  const removeMessagesAfterIndex = useAppStore(
    (s) => s.removeMessagesAfterIndex,
  );
  const updateThreadTitle = useAppStore((s) => s.updateThreadTitle);

  /**
   * Generates a title for a thread based on the first user message
   */
  const generateTitle = useCallback(
    async (threadId: string, firstUserContent: string, modelId: string) => {
      try {
        const client = getClient();
        const truncatedContent = firstUserContent.slice(0, TITLE_PROMPT_MAX_CHARS);
        const prompt = `You are a helpful assistant. Create a concise, 3-${MAX_TITLE_WORDS} word title for this conversation. No quotes, no punctuation at the end. Respond with title only. Conversation starts with: "${truncatedContent}"`;

        let title = "";
        await new Promise<void>((resolve, reject) => {
          client.chat({
            model: modelId,
            temperature: TITLE_GENERATION_TEMPERATURE,
            messages: [
              { role: "system", content: "You create short chat titles." },
              { role: "user", content: prompt },
            ],
            onToken: (t) => {
              title += t;
            },
            onDone: () => resolve(),
            onError: (e) => reject(e),
          });
        });

        // Sanitize and format the title
        title = (title || "")
          .replace(/[\r\n]+/g, " ")
          .replace(/^['"""''\s]+|['"""''\s]+$/g, "")
          .replace(/[.:!?]+$/g, "")
          .replace(/\s+/g, " ")
          .trim();

        const words = title.split(" ").filter(Boolean);
        if (words.length > MAX_TITLE_WORDS) {
          title = words.slice(0, MAX_TITLE_WORDS).join(" ");
        }

        if (title) {
          updateThreadTitle(threadId, title);
        }
      } catch (err) {
        console.warn("Title generation failed:", err);
      }
    },
    [getClient, updateThreadTitle],
  );

  /**
   * Sends a message and streams the AI response
   */
  const sendMessage = useCallback(
    async (content: string) => {
      const state = useAppStore.getState();
      const thread = selectActiveThread(state);
      const model = selectActiveModel(state);

      if (!thread || !model || !content.trim()) return;

      const threadId = thread.id;
      const trimmedContent = content.trim();

      // Add user message
      addUserMessage(threadId, trimmedContent);

      // Add empty assistant message for streaming
      addAssistantMessage(threadId);

      setIsLoading(true);

      // Prepare messages for API
      const system = model.system
        ? [{ role: "system" as const, content: model.system }]
        : [];

      const history = [
        ...thread.messages,
        { role: "user" as const, content: trimmedContent },
      ].map((m) => ({ role: m.role, content: m.content }));

      const messages = [...system, ...history];
      const client = getClient();

      // Send the message (streaming or non-streaming based on settings)
      streamRef.current = client.chat({
        model: model.model,
        messages,
        temperature: model.temp,
        onToken: (token) => {
          appendToLastMessage(threadId, token);
        },
        onDone: async () => {
          setIsLoading(false);
          streamRef.current = null;

          // Generate title if this is a new chat
          const currentState = useAppStore.getState();
          const currentThread = currentState.chats[threadId];
          if (currentThread) {
            const hasDefaultTitle =
              currentThread.title.trim().toLowerCase() === "new chat";
            const hasUserMessage = currentThread.messages.some(
              (m) => m.role === "user",
            );

            if (hasDefaultTitle && hasUserMessage) {
              const firstUser = currentThread.messages.find(
                (m) => m.role === "user",
              );
              if (firstUser) {
                await generateTitle(threadId, firstUser.content, model.model);
              }
            }
          }
        },
        onError: (error) => {
          setIsLoading(false);
          streamRef.current = null;
          notifications.show({
            title: "Message failed",
            message: getErrorMessage(error),
            color: "red",
          });
        },
      });
    },
    [
      getClient,
      addUserMessage,
      addAssistantMessage,
      appendToLastMessage,
      generateTitle,
      setIsLoading,
    ],
  );

  /**
   * Cancels the current streaming response
   */
  const cancelStream = useCallback(() => {
    streamRef.current?.cancel();
    streamRef.current = null;
    setIsLoading(false);
    setIsRegenerating(false);
  }, [setIsLoading, setIsRegenerating]);

  /**
   * Regenerates the last assistant response
   */
  const regenerateLastMessage = useCallback(async () => {
    const state = useAppStore.getState();
    const thread = selectActiveThread(state);
    const model = selectActiveModel(state);

    if (!thread || !model || isRegenerating) return;

    // Find the last user message index
    const lastUserIndex = [...thread.messages]
      .map((m) => m.role)
      .lastIndexOf("user");

    if (lastUserIndex === -1) return;

    setIsRegenerating(true);

    // Remove messages after the last user message
    removeMessagesAfterIndex(thread.id, lastUserIndex);

    // Add empty assistant message for streaming
    addAssistantMessage(thread.id);

    // Get the updated thread state
    const updatedState = useAppStore.getState();
    const updatedThread = updatedState.chats[thread.id];
    if (!updatedThread) {
      setIsRegenerating(false);
      return;
    }

    // Prepare messages for API
    const system = model.system
      ? [{ role: "system" as const, content: model.system }]
      : [];

    const history = updatedThread.messages
      .filter((m) => m.role !== "assistant" || m.content)
      .slice(0, -1) // Exclude the empty assistant message we just added
      .map((m) => ({ role: m.role, content: m.content }));

    const messages = [...system, ...history];
    const client = getClient();

    // Send the message (streaming or non-streaming based on settings)
    streamRef.current = client.chat({
      model: model.model,
      messages,
      temperature: model.temp,
      onToken: (token) => {
        appendToLastMessage(thread.id, token);
      },
      onDone: () => {
        setIsRegenerating(false);
        streamRef.current = null;
      },
      onError: (error) => {
        setIsRegenerating(false);
        streamRef.current = null;
        notifications.show({
          title: "Regeneration failed",
          message: getErrorMessage(error),
          color: "red",
        });
      },
    });
  }, [
    getClient,
    removeMessagesAfterIndex,
    addAssistantMessage,
    appendToLastMessage,
    isRegenerating,
    setIsRegenerating,
  ]);

  return {
    isLoading,
    isRegenerating,
    sendMessage,
    cancelStream,
    regenerateLastMessage,
  };
}
