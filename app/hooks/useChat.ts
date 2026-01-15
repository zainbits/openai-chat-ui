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
import type {
  StreamHandle,
  OpenAIChatMessage,
  ContentPart,
  ChatMessage,
  ChatThread,
  CustomModel,
} from "../types";
import {
  TITLE_GENERATION_TEMPERATURE,
  TITLE_PROMPT_MAX_CHARS,
  MAX_TITLE_WORDS,
} from "../constants";
import { getImagesByIds, saveImages } from "../utils/imageStore";
import { generateId } from "../state/utils";

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

/**
 * Best-effort detector for "thinking"/reasoning parameter rejections.
 * We use this to auto-disable the thinking toggle and retry once without it.
 */
function isThinkingUnsupportedError(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();

  const mentionsThinkingParam =
    msg.includes("thinking") ||
    msg.includes("reasoning_effort") ||
    msg.includes("reasoning effort");

  const looksLikeParamRejection =
    msg.includes("unrecognized") ||
    msg.includes("unknown") ||
    msg.includes("unexpected") ||
    msg.includes("not permitted") ||
    msg.includes("invalid") ||
    msg.includes("additional properties") ||
    msg.includes("extra inputs");

  return mentionsThinkingParam && looksLikeParamRejection;
}

/**
 * Builds OpenAI-compatible message content from text and optional images.
 * Returns a string for text-only messages, or a ContentPart array for multimodal.
 */
function buildMessageContent(
  text: string,
  images?: string[],
): string | ContentPart[] {
  if (!images || images.length === 0) {
    return text;
  }

  const parts: ContentPart[] = [];

  // Add text part if there's text content
  if (text) {
    parts.push({ type: "text", text });
  }

  // Add image parts
  for (const imageUrl of images) {
    parts.push({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  }

  return parts;
}

/**
 * Builds OpenAI-compatible messages from a thread and model settings.
 */
async function resolveMessageImages(
  message: ChatMessage,
): Promise<string[] | undefined> {
  if (message.images && message.images.length > 0) {
    return message.images;
  }

  if (message.imageIds && message.imageIds.length > 0) {
    try {
      const resolved = await getImagesByIds(message.imageIds);
      return resolved.filter(Boolean) as string[];
    } catch (error) {
      console.warn("Failed to resolve image IDs:", error);
      return undefined;
    }
  }

  return undefined;
}

async function buildChatMessages(
  thread: ChatThread,
  model: CustomModel,
): Promise<OpenAIChatMessage[]> {
  const system: OpenAIChatMessage[] = model.system
    ? [{ role: "system" as const, content: model.system }]
    : [];

  const history: OpenAIChatMessage[] = await Promise.all(
    thread.messages
      // Exclude empty assistant placeholders
      .filter((m) => m.role !== "assistant" || m.content)
      .map(async (m) => ({
        role: m.role,
        content: buildMessageContent(m.content, await resolveMessageImages(m)),
      })),
  );

  return [...system, ...history];
}

interface UseChatReturn {
  /** Whether a message is currently being sent/streamed */
  isLoading: boolean;
  /** Whether the last message is being regenerated */
  isRegenerating: boolean;
  /** Send a message to the AI, optionally with image attachments (base64 data URLs) */
  sendMessage: (content: string, images?: string[]) => Promise<void>;
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
  const setThinkingOnLastMessage = useAppStore(
    (s) => s.setThinkingOnLastMessage,
  );
  const removeMessagesAfterIndex = useAppStore(
    (s) => s.removeMessagesAfterIndex,
  );
  const updateModel = useAppStore((s) => s.updateModel);
  const updateThreadTitle = useAppStore((s) => s.updateThreadTitle);

  /**
   * Starts a streaming chat request and wires up common callbacks.
   */
  const startStream = useCallback(
    (
      threadId: string,
      model: CustomModel,
      messages: OpenAIChatMessage[],
      thinkingEnabled: boolean,
      handlers: { onDone: () => void; onError: (error: unknown) => void },
    ) => {
      const client = getClient();
      streamRef.current = client.chat({
        model: model.model,
        messages,
        temperature: model.temp,
        thinkingEnabled,
        thinkingEffort: model.thinkingEffort,
        onToken: (token) => {
          appendToLastMessage(threadId, token);
        },
        onThinking: (thinking) => {
          setThinkingOnLastMessage(threadId, thinking);
        },
        onDone: handlers.onDone,
        onError: handlers.onError,
      });
    },
    [getClient, appendToLastMessage, setThinkingOnLastMessage],
  );

  /**
   * Generates a title for a thread based on the first user message
   */
  const generateTitle = useCallback(
    async (threadId: string, firstUserContent: string, modelId: string) => {
      try {
        const client = getClient();
        const truncatedContent = firstUserContent.slice(
          0,
          TITLE_PROMPT_MAX_CHARS,
        );
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
   * @param content - The text content of the message
   * @param images - Optional array of base64 data URLs for image attachments
   */
  const sendMessage = useCallback(
    async (content: string, images?: string[]) => {
      const state = useAppStore.getState();
      const thread = selectActiveThread(state);
      const model = selectActiveModel(state);

      const hasContent = content.trim() || (images && images.length > 0);
      if (!thread || !model || !hasContent) return;

      const threadId = thread.id;
      const trimmedContent = content.trim();
      const userMessageIndex = thread.messages.length;
      let retriedWithoutThinking = false;

      let imageIds: string[] | undefined;
      if (images && images.length > 0) {
        const records = images.map((dataUrl) => ({
          id: generateId(),
          dataUrl,
        }));
        imageIds = records.map((record) => record.id);
        const stored = await saveImages(records);
        if (!stored) {
          console.warn("Failed to store images in IndexedDB");
          imageIds = undefined;
        }
      }

      // Add user message with optional images
      addUserMessage(threadId, trimmedContent, images, imageIds);

      // Add empty assistant message for streaming
      addAssistantMessage(threadId);

      setIsLoading(true);

      const startRequest = async (thinkingEnabled: boolean) => {
        const currentState = useAppStore.getState();
        const currentThread = currentState.chats[threadId];
        const currentModel = currentThread
          ? currentState.models.find((m) => m.id === currentThread.modelId)
          : null;

        if (!currentThread || !currentModel) {
          setIsLoading(false);
          streamRef.current = null;
          return;
        }

        const messages = await buildChatMessages(currentThread, currentModel);

        startStream(threadId, currentModel, messages, thinkingEnabled, {
          onDone: async () => {
            setIsLoading(false);
            streamRef.current = null;

            // Generate title if this is a new chat
            const latestState = useAppStore.getState();
            const latestThread = latestState.chats[threadId];
            if (latestThread) {
              const hasDefaultTitle =
                latestThread.title.trim().toLowerCase() === "new chat";
              const hasUserMessage = latestThread.messages.some(
                (m) => m.role === "user",
              );

              if (hasDefaultTitle && hasUserMessage) {
                const firstUser = latestThread.messages.find(
                  (m) => m.role === "user",
                );
                if (firstUser) {
                  // Use text content for title, or indicate image-only message
                  const hasImages =
                    (firstUser.images && firstUser.images.length > 0) ||
                    (firstUser.imageIds && firstUser.imageIds.length > 0);
                  const titleContent =
                    firstUser.content ||
                    (hasImages ? "Image conversation" : "");
                  if (titleContent) {
                    await generateTitle(
                      threadId,
                      titleContent,
                      currentModel.model,
                    );
                  }
                }
              }
            }
          },
          onError: (error) => {
            // If thinking was enabled and the API rejects it, auto-disable and retry once.
            if (
              thinkingEnabled &&
              !retriedWithoutThinking &&
              isThinkingUnsupportedError(error)
            ) {
              retriedWithoutThinking = true;
              updateModel(currentModel.id, { thinkingEnabled: false });

              notifications.show({
                title: "Thinking disabled",
                message:
                  "This model/provider rejected the thinking parameter. I turned it off and retried.",
                color: "yellow",
              });

              // Remove the (possibly partial) assistant message and retry without thinking
              removeMessagesAfterIndex(threadId, userMessageIndex);
              addAssistantMessage(threadId);
              streamRef.current = null;
              void startRequest(false);
              return;
            }

            setIsLoading(false);
            streamRef.current = null;
            notifications.show({
              title: "Message failed",
              message: getErrorMessage(error),
              color: "red",
            });
          },
        });
      };

      void startRequest(!!model.thinkingEnabled);
    },
    [
      addUserMessage,
      addAssistantMessage,
      generateTitle,
      setIsLoading,
      updateModel,
      removeMessagesAfterIndex,
      startStream,
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
    let retriedWithoutThinking = false;

    // Remove messages after the last user message
    removeMessagesAfterIndex(thread.id, lastUserIndex);

    // Add empty assistant message for streaming
    addAssistantMessage(thread.id);

    const startRequest = async (thinkingEnabled: boolean) => {
      const updatedState = useAppStore.getState();
      const updatedThread = updatedState.chats[thread.id];
      const updatedModel = updatedThread
        ? updatedState.models.find((m) => m.id === updatedThread.modelId)
        : null;

      if (!updatedThread || !updatedModel) {
        setIsRegenerating(false);
        streamRef.current = null;
        return;
      }

      const messages = await buildChatMessages(updatedThread, updatedModel);

      // Send the message (streaming or non-streaming based on settings)
      startStream(thread.id, updatedModel, messages, thinkingEnabled, {
        onDone: () => {
          setIsRegenerating(false);
          streamRef.current = null;
        },
        onError: (error) => {
          if (
            thinkingEnabled &&
            !retriedWithoutThinking &&
            isThinkingUnsupportedError(error)
          ) {
            retriedWithoutThinking = true;
            updateModel(updatedModel.id, { thinkingEnabled: false });

            notifications.show({
              title: "Thinking disabled",
              message:
                "This model/provider rejected the thinking parameter. I turned it off and retried.",
              color: "yellow",
            });

            removeMessagesAfterIndex(thread.id, lastUserIndex);
            addAssistantMessage(thread.id);
            streamRef.current = null;
            void startRequest(false);
            return;
          }

          setIsRegenerating(false);
          streamRef.current = null;
          notifications.show({
            title: "Regeneration failed",
            message: getErrorMessage(error),
            color: "red",
          });
        },
      });
    };

    void startRequest(!!model.thinkingEnabled);
  }, [
    removeMessagesAfterIndex,
    addAssistantMessage,
    isRegenerating,
    setIsRegenerating,
    updateModel,
    startStream,
  ]);

  return {
    isLoading,
    isRegenerating,
    sendMessage,
    cancelStream,
    regenerateLastMessage,
  };
}
