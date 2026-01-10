import React, {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from "react";
import { useAppStore, selectActiveThread } from "../../state/store";
import { useChat } from "../../hooks";
import { renderMarkdown } from "../../utils/markdown";
import { sanitizeText } from "../../utils/textSanitizer";
import { notifications } from "@mantine/notifications";
import Composer from "../Composer";
import ThinkingBlock from "../ThinkingBlock";
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
 * Copy button component for assistant messages
 */
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      notifications.show({
        message: "Copied to clipboard",
        color: "green",
        autoClose: 2000,
      });
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
      title="Copy to clipboard"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <svg
          className="copy-icon"
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
      ) : (
        <svg
          className="copy-icon"
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
      )}
      <span className="copy-text">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

/**
 * Main chat area component displaying messages and the composer
 */
export default function ChatArea() {
  const thread = useAppStore(selectActiveThread);
  const { isLoading, isRegenerating, regenerateLastMessage } = useChat();

  const messages = useMemo(() => thread?.messages ?? [], [thread]);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Track if user has scrolled up to cancel auto-scroll
  const userScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  // Combined streaming state for both regular loading and regeneration
  const isStreamingActive = isLoading || isRegenerating;

  // Check if the last message is an empty assistant message (streaming in progress)
  const isStreaming = useMemo(() => {
    if (!isStreamingActive || messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.role === "assistant" && lastMessage?.content === "";
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

  // Reset scroll tracking when streaming starts
  useEffect(() => {
    if (isStreamingActive) {
      userScrolledUpRef.current = false;
    }
  }, [isStreamingActive]);

  // Auto-scroll to bottom when messages change, unless user scrolled up
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    
    // Don't auto-scroll if user has scrolled up during streaming
    if (userScrolledUpRef.current && isStreamingActive) {
      return;
    }
    
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming, isStreamingActive]);

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
              const isEmptyAssistant = isAssistantMessage && m.content === "";
              // Show regenerate on last assistant message (even if empty/failed)
              const showRegenerateButton =
                isLastMessage && isAssistantMessage && !isStreamingActive;

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
                  {isFailedResponse ? (
                    <div className="message-content message-failed">
                      <span className="failed-icon">⚠</span>
                      <span>Response failed. Try regenerating.</span>
                    </div>
                  ) : (
                    <div
                      className="message-content"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(m.content),
                      }}
                    />
                  )}
                  {isStreamingActive && isLastMessage && isAssistantMessage && (
                    <span className="streaming-cursor" aria-hidden="true" />
                  )}
                  {isAssistantMessage &&
                    (!isEmptyAssistant || isFailedResponse) && (
                      <div
                        className={`message-actions ${isLastMessage ? "always-visible" : ""}`}
                      >
                        {!isFailedResponse && (
                          <CopyButton content={m.content} />
                        )}
                        {showRegenerateButton && (
                          <button
                            className={`regenerate-btn ${isRegenerating ? "regenerating" : ""}`}
                            disabled={isRegenerating}
                            onClick={regenerateLastMessage}
                            title="Regenerate response"
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
                </article>
              );
            })}
            {isStreaming && <TypingIndicator />}
          </div>
        )}
      </section>
      <Composer />
    </main>
  );
}
