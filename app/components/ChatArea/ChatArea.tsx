import React, {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useAppStore, selectActiveThread } from "../../state/store";
import { useChat } from "../../hooks";
import { renderMarkdown } from "../../utils/markdown";
import { sanitizeText } from "../../utils/textSanitizer";
import { getImagesByIds } from "../../utils/imageStore";
import { notifications } from "@mantine/notifications";
import Composer from "../Composer";
import ThinkingBlock from "../ThinkingBlock";
import ImageViewer from "../ImageViewer";
import "./ChatArea.css";

/**
 * Chat bubble illustration SVG component
 */
function ChatIllustration() {
  return (
    <svg
      className="empty-state-illustration"
      width="120"
      height="100"
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main chat bubble */}
      <rect
        x="10"
        y="20"
        width="70"
        height="45"
        rx="12"
        fill="url(#bubbleGradient1)"
        opacity="0.8"
      />
      <circle
        cx="30"
        cy="42"
        r="4"
        fill="var(--color-text-muted)"
        opacity="0.6"
      >
        <animate
          attributeName="opacity"
          values="0.6;1;0.6"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="45"
        cy="42"
        r="4"
        fill="var(--color-text-muted)"
        opacity="0.6"
      >
        <animate
          attributeName="opacity"
          values="0.6;1;0.6"
          dur="1.5s"
          repeatCount="indefinite"
          begin="0.2s"
        />
      </circle>
      <circle
        cx="60"
        cy="42"
        r="4"
        fill="var(--color-text-muted)"
        opacity="0.6"
      >
        <animate
          attributeName="opacity"
          values="0.6;1;0.6"
          dur="1.5s"
          repeatCount="indefinite"
          begin="0.4s"
        />
      </circle>

      {/* Response bubble */}
      <rect
        x="40"
        y="50"
        width="70"
        height="40"
        rx="12"
        fill="url(#bubbleGradient2)"
        opacity="0.6"
      />
      <line
        x1="55"
        y1="65"
        x2="95"
        y2="65"
        stroke="var(--color-text-muted)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="55"
        y1="75"
        x2="80"
        y2="75"
        stroke="var(--color-text-muted)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Sparkle effects */}
      <circle
        cx="95"
        cy="25"
        r="3"
        fill="var(--color-primary-400)"
        opacity="0.8"
      >
        <animate
          attributeName="opacity"
          values="0.4;1;0.4"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="15"
        cy="75"
        r="2"
        fill="var(--color-success-400)"
        opacity="0.6"
      >
        <animate
          attributeName="opacity"
          values="0.3;0.8;0.3"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </circle>

      <defs>
        <linearGradient
          id="bubbleGradient1"
          x1="10"
          y1="20"
          x2="80"
          y2="65"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-primary-500)" stopOpacity="0.3" />
          <stop
            offset="1"
            stopColor="var(--color-primary-700)"
            stopOpacity="0.15"
          />
        </linearGradient>
        <linearGradient
          id="bubbleGradient2"
          x1="40"
          y1="50"
          x2="110"
          y2="90"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-success-500)" stopOpacity="0.25" />
          <stop
            offset="1"
            stopColor="var(--color-success-700)"
            stopOpacity="0.1"
          />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Typing indicator component shown when AI is responding
 */
function TypingIndicator() {
  return (
    <article
      className="message-bubble typing-indicator"
      role="status"
      aria-label="AI is typing"
    >
      <div className="message-role" aria-hidden="true">
        Assistant
      </div>
      <div className="typing-dots">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </article>
  );
}

/**
 * Enhanced empty state component with centered illustration
 */
function EnhancedEmptyState() {
  return (
    <div className="empty-state-enhanced" role="status">
      <ChatIllustration />
      <p className="empty-state-hint">Start a conversation below</p>
    </div>
  );
}

/**
 * Animated checkmark component with draw-in effect
 */
function AnimatedCheckmark() {
  return (
    <svg
      className="copy-icon checkmark-animated"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path className="checkmark-path" d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/**
 * Copy button component for assistant messages
 */
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifications.show({
        message: "Failed to copy",
        color: "red",
      });
    }
  }, [content]);

  return (
    <button
      className={`copy-btn ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      <span className="copy-icon-wrapper">
        <svg
          className={`copy-icon copy-icon-default ${copied ? "icon-exit" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied && <AnimatedCheckmark />}
      </span>
      <span className="copy-text">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

/**
 * Edit button component for messages
 */
function EditButton({ onEdit }: { onEdit: () => void }) {
  return (
    <button className="edit-btn" onClick={onEdit} aria-label="Edit message">
      <svg
        className="edit-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      <span className="edit-text">Edit</span>
    </button>
  );
}

/**
 * Main chat area component displaying messages and the composer
 */
/** State for the image viewer */
interface ImageViewerState {
  images: string[];
  initialIndex: number;
}

export default function ChatArea() {
  const thread = useAppStore(selectActiveThread);
  const updateMessageContent = useAppStore(
    (state) => state.updateMessageContent,
  );
  const forkThread = useAppStore((state) => state.forkThread);
  const { isLoading, isRegenerating, regenerateLastMessage, sendMessage } =
    useChat();

  const messages = useMemo(() => thread?.messages ?? [], [thread]);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Track if user has scrolled up to cancel auto-scroll
  const userScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({});

  // Image viewer state
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null);

  // Edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Combined streaming state for both regular loading and regeneration
  const isStreamingActive = isLoading || isRegenerating;
  // Track previous streaming state to detect when streaming ends
  const wasStreamingRef = useRef(false);

  // Check if the last message is an empty assistant message (streaming in progress)
  // Only show typing indicator if there's no content AND no thinking yet
  const isStreaming = useMemo(() => {
    if (!isStreamingActive || messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    return (
      lastMessage?.role === "assistant" &&
      lastMessage?.content === "" &&
      !lastMessage?.thinking
    );
  }, [isStreamingActive, messages]);

  // Detect when user scrolls up during streaming to cancel auto-scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const handleScroll = () => {
      const currentScrollTop = el.scrollTop;
      const maxScrollTop = el.scrollHeight - el.clientHeight;
      const isAtBottom = maxScrollTop - currentScrollTop < 50; // 50px threshold

      // User scrolled up if current position is less than last and not at bottom
      if (currentScrollTop < lastScrollTopRef.current && !isAtBottom) {
        userScrolledUpRef.current = true;
      }

      // Reset when user scrolls back to bottom
      if (isAtBottom) {
        userScrolledUpRef.current = false;
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Track message count to detect new messages
  const prevMessageCountRef = useRef(messages.length);

  // Reset scroll tracking when a new message is added (user sends a message)
  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    // Reset scroll tracking when new messages are added (not during streaming updates)
    // This happens when user sends a new message
    if (currentCount > prevCount && !wasStreamingRef.current) {
      userScrolledUpRef.current = false;
    }

    prevMessageCountRef.current = currentCount;
  }, [messages.length]);

  // Track streaming state changes
  useEffect(() => {
    wasStreamingRef.current = isStreamingActive;
  }, [isStreamingActive]);

  // Auto-scroll to bottom when messages change, unless user scrolled up or just saved an edit
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    // Don't auto-scroll if user has scrolled up (respect during and after streaming)
    if (userScrolledUpRef.current) {
      return;
    }

    // Don't auto-scroll if we just saved an edit (preserve scroll position)
    if (justSavedEditRef.current) {
      return;
    }

    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming, isStreamingActive]);

  // Resolve image IDs to data URLs for rendering
  useEffect(() => {
    const pendingIds = new Set<string>();
    messages.forEach((message) => {
      message.imageIds?.forEach((id) => {
        if (!Object.prototype.hasOwnProperty.call(imageMap, id)) {
          pendingIds.add(id);
        }
      });
    });

    if (pendingIds.size === 0) return;

    let cancelled = false;
    const ids = Array.from(pendingIds);

    const loadImages = async () => {
      try {
        const resolved = await getImagesByIds(ids);
        if (cancelled) return;
        setImageMap((prev) => {
          const next = { ...prev };
          ids.forEach((id, index) => {
            const dataUrl = resolved[index];
            next[id] = dataUrl ?? null;
          });
          return next;
        });
      } catch (error) {
        console.warn("Failed to load images from storage:", error);
      }
    };

    void loadImages();
    return () => {
      cancelled = true;
    };
  }, [messages, imageMap]);

  // Handle copy code button clicks (both standard and sanitized)
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const handleCopyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const copyBtn = target.closest(".copy-code-btn");
      const sanitizeBtn = target.closest(".sanitize-copy-btn");

      if (!copyBtn && !sanitizeBtn) return;

      const btn = (copyBtn || sanitizeBtn) as HTMLElement;
      const isSanitize = !!sanitizeBtn;

      const wrapper = btn.closest(".code-block-wrapper");
      const code = wrapper?.querySelector("code");
      if (!code) return;

      let text = code.textContent || "";

      if (isSanitize) {
        text = sanitizeText(text);
      }

      try {
        await navigator.clipboard.writeText(text);

        // Visual feedback
        btn.classList.add("copied");
        const originalHtml = btn.innerHTML;

        // Checkmark icon
        btn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="20 6 9 17 4 12"></polyline>' +
          "</svg>";

        // Restore label if it existed (for sanitize button)
        if (isSanitize) {
          btn.innerHTML += '<span class="btn-label">Copied</span>';
        }

        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = originalHtml;
        }, 2000);

        notifications.show({
          message: isSanitize
            ? "Sanitized & copied to clipboard"
            : "Code copied to clipboard",
          color: "green",
          autoClose: 2000,
        });
      } catch (err) {
        console.error("Failed to copy code:", err);
        notifications.show({
          message: "Failed to copy code",
          color: "red",
        });
      }
    };

    container.addEventListener("click", handleCopyClick);
    return () => container.removeEventListener("click", handleCopyClick);
  }, []);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingIndex !== null && editTextareaRef.current) {
      editTextareaRef.current.focus();
      // Move cursor to end
      const len = editTextareaRef.current.value.length;
      editTextareaRef.current.setSelectionRange(len, len);
    }
  }, [editingIndex]);

  // Handle starting edit
  const handleStartEdit = useCallback((index: number, content: string) => {
    setEditingIndex(index);
    setEditContent(content);
  }, []);

  // Track if we just saved an edit (to prevent auto-scroll)
  const justSavedEditRef = useRef(false);

  // Handle saving edit
  const handleSaveEdit = useCallback(() => {
    if (editingIndex !== null && thread) {
      justSavedEditRef.current = true;
      updateMessageContent(thread.id, editingIndex, editContent);
      setEditingIndex(null);
      setEditContent("");
      notifications.show({
        message: "Message updated",
        color: "green",
        autoClose: 2000,
      });
      // Reset flag after a short delay to allow the effect to run
      setTimeout(() => {
        justSavedEditRef.current = false;
      }, 100);
    }
  }, [editingIndex, thread, editContent, updateMessageContent]);

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditContent("");
  }, []);

  // Handle edit textarea change
  const handleEditChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setEditContent(e.target.value);
    },
    [],
  );

  // Handle keyboard shortcuts in edit mode
  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        handleCancelEdit();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveEdit();
      }
    },
    [handleCancelEdit, handleSaveEdit],
  );

  // Handle "Run" from edit - forks the chat and runs from that point
  const handleRunFromEdit = useCallback(async () => {
    if (editingIndex === null || !thread) return;

    const editedContent = editContent.trim();
    if (!editedContent) {
      notifications.show({
        message: "Cannot run with empty message",
        color: "red",
      });
      return;
    }

    // Fork the thread up to the editing index (excludes the message being edited)
    const newThread = forkThread(thread.id, editingIndex);
    if (!newThread) {
      notifications.show({
        message: "Failed to create new chat",
        color: "red",
      });
      return;
    }

    // Clear edit state
    setEditingIndex(null);
    setEditContent("");

    // Send the edited message in the new thread
    // Small delay to ensure the new thread is active
    setTimeout(() => {
      void sendMessage(editedContent);
    }, 50);

    notifications.show({
      message: "New chat created from edit",
      color: "green",
      autoClose: 2000,
    });
  }, [editingIndex, thread, editContent, forkThread, sendMessage]);

  return (
    <main className="chat-main" role="main" aria-label="Chat conversation">
      <section
        ref={listRef}
        className="messages-container"
        aria-label="Message history"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && !isStreamingActive ? (
          <EnhancedEmptyState />
        ) : (
          <div className="message-list" role="list">
            {messages.map((m, idx) => {
              const isLastMessage = m.ts === messages[messages.length - 1]?.ts;
              const isAssistantMessage = m.role === "assistant";
              // Message is "empty" only if it has no content AND no thinking
              const isEmptyAssistant =
                isAssistantMessage && m.content === "" && !m.thinking;
              // Show regenerate on last assistant message (even if empty/failed)
              const showRegenerateButton =
                isLastMessage && isAssistantMessage && !isStreamingActive;
              const resolvedImages =
                m.images && m.images.length > 0
                  ? m.images
                  : m.imageIds
                    ? m.imageIds
                        .map((id) => imageMap[id])
                        .filter((img): img is string => typeof img === "string")
                    : [];
              const showMissingImagesNotice =
                (!resolvedImages || resolvedImages.length === 0) &&
                !!m.imageIds &&
                m.imageIds.length > 0;

              // Don't render empty assistant messages during streaming - show typing indicator instead
              if (isEmptyAssistant && isStreamingActive) {
                return null;
              }

              // Check if this is a failed response (empty content when not streaming)
              const isFailedResponse = isEmptyAssistant && !isStreamingActive;

              return (
                <article
                  key={`${m.ts}-${idx}`}
                  className={`message-bubble ${isStreamingActive && isLastMessage && isAssistantMessage ? "streaming" : ""} ${isFailedResponse ? "failed" : ""}`}
                  role="listitem"
                  aria-label={`${m.role === "user" ? "Your" : "Assistant"} message`}
                >
                  <div className="message-role" aria-hidden="true">
                    {m.role === "user" ? "You" : "Assistant"}
                  </div>
                  {isAssistantMessage && m.thinking && (
                    <ThinkingBlock thinking={m.thinking} />
                  )}
                  {/* Display image attachments for user messages */}
                  {resolvedImages.length > 0 && (
                    <div className="message-images">
                      {resolvedImages.map((imgUrl, imgIdx) => (
                        <div key={imgIdx} className="message-image-container">
                          <img
                            src={imgUrl}
                            alt={`Attachment ${imgIdx + 1}`}
                            className="message-image"
                            loading="lazy"
                            onClick={() =>
                              setImageViewer({
                                images: resolvedImages,
                                initialIndex: imgIdx,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {showMissingImagesNotice && (
                    <div className="message-images-missing" role="status">
                      Images unavailable
                    </div>
                  )}
                  {/* In-place edit mode - replaces content when editing */}
                  {editingIndex === idx ? (
                    <div className="edit-container in-place">
                      <textarea
                        ref={editTextareaRef}
                        className="edit-textarea"
                        value={editContent}
                        onChange={handleEditChange}
                        onKeyDown={handleEditKeyDown}
                        rows={Math.max(3, editContent.split("\n").length)}
                        placeholder="Edit message..."
                      />
                      <div className="edit-actions">
                        <button
                          className="edit-save-btn"
                          onClick={handleSaveEdit}
                          aria-label="Save (Ctrl+Enter)"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span>Save</span>
                        </button>
                        <button
                          className="edit-run-btn"
                          onClick={handleRunFromEdit}
                          aria-label="Run in new chat"
                          title="Create new chat and run from this point"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Run</span>
                        </button>
                        <button
                          className="edit-cancel-btn"
                          onClick={handleCancelEdit}
                          aria-label="Cancel (Esc)"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                          </svg>
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : isFailedResponse ? (
                    <div className="message-content message-failed">
                      <span className="failed-icon">⚠</span>
                      <span>Response failed. Try regenerating.</span>
                    </div>
                  ) : m.content ? (
                    <div
                      className="message-content"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(m.content),
                      }}
                    />
                  ) : null}
                  {isStreamingActive && isLastMessage && isAssistantMessage && (
                    <span className="streaming-cursor" aria-hidden="true" />
                  )}
                  {isAssistantMessage &&
                    (!isEmptyAssistant || isFailedResponse) && (
                      <div className="message-actions">
                        {!isFailedResponse && (
                          <CopyButton content={m.content} />
                        )}
                        {!isFailedResponse && editingIndex !== idx && (
                          <EditButton
                            onEdit={() => handleStartEdit(idx, m.content)}
                          />
                        )}
                        {showRegenerateButton && (
                          <button
                            className={`regenerate-btn ${isRegenerating ? "regenerating" : ""}`}
                            disabled={isRegenerating}
                            onClick={regenerateLastMessage}
                            aria-label={
                              isRegenerating
                                ? "Regenerating response"
                                : "Regenerate response"
                            }
                          >
                            <svg
                              className="regenerate-icon"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85 1.04 6.5 2.75L21 3" />
                              <path d="M21 3v6h-6" />
                            </svg>
                            <span className="regenerate-text">
                              {isRegenerating
                                ? "Regenerating..."
                                : "Regenerate"}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  {!isAssistantMessage && (
                    <div className="message-actions">
                      <CopyButton content={m.content} />
                      {editingIndex !== idx && (
                        <EditButton
                          onEdit={() => handleStartEdit(idx, m.content)}
                        />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {isStreaming && <TypingIndicator />}
          </div>
        )}
      </section>
      <Composer />

      {/* Image Viewer Modal */}
      {imageViewer && (
        <ImageViewer
          images={imageViewer.images}
          initialIndex={imageViewer.initialIndex}
          onClose={() => setImageViewer(null)}
        />
      )}
    </main>
  );
}
