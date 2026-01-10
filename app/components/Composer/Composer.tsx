import React, { useCallback, useState, useRef, useEffect } from "react";
import { useAppStore, selectActiveThread } from "../../state/store";
import { useChat } from "../../hooks";
import GlassSurface from "../GlassSurface";
import GlassButton from "../GlassButton";
import { GrClose } from "react-icons/gr";
import { IoArrowUp } from "react-icons/io5";
import "./Composer.css";

/** Min and max heights for the textarea */
const TEXTAREA_MIN_HEIGHT = 48;
const TEXTAREA_MAX_HEIGHT = 200;

/**
 * Message composer component with quick actions and send functionality
 */
export default function Composer() {
  const thread = useAppStore(selectActiveThread);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLElement>(null);
  const [textareaHeight, setTextareaHeight] = useState(TEXTAREA_MIN_HEIGHT);

  const { isLoading, isRegenerating, sendMessage, cancelStream } = useChat();

  /**
   * Update CSS custom property for composer height so messages container can adjust padding
   */
  useEffect(() => {
    const updateComposerHeight = () => {
      if (composerRef.current) {
        const height = composerRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--composer-height",
          `${height}px`,
        );
      }
    };

    updateComposerHeight();

    // Use ResizeObserver to track composer height changes
    const resizeObserver = new ResizeObserver(updateComposerHeight);
    if (composerRef.current) {
      resizeObserver.observe(composerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [textareaHeight]);

  /**
   * Auto-resize textarea based on content
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get accurate scrollHeight for shrinking content
    textarea.style.height = "auto";

    // Calculate new height
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, TEXTAREA_MIN_HEIGHT),
      TEXTAREA_MAX_HEIGHT,
    );

    textarea.style.height = `${newHeight}px`;
    setTextareaHeight(newHeight);
  }, []);

  // Adjust height when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Show stop button when either loading or regenerating
  const isStreaming = isLoading || isRegenerating;

  /**
   * Handles sending the message
   */
  const handleSend = useCallback(async () => {
    if (!input.trim() || !thread || isStreaming) return;
    const message = input;
    setInput("");
    // Reset textarea height after sending
    setTextareaHeight(TEXTAREA_MIN_HEIGHT);
    if (textareaRef.current) {
      textareaRef.current.style.height = `${TEXTAREA_MIN_HEIGHT}px`;
    }
    await sendMessage(message);
  }, [input, thread, isStreaming, sendMessage]);

  /**
   * Handles keyboard shortcuts (Enter to send, Shift+Enter for new line)
   * Enter-to-send is disabled on mobile devices (touch-primary)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Skip Enter-to-send on mobile/touch devices
        const isMobile = window.matchMedia("(pointer: coarse)").matches;
        if (isMobile) return;

        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <footer
      ref={composerRef}
      className="composer"
      role="region"
      aria-label="Message composer"
    >
      <div className="composer-content">
        <div className="composer-input-area">
          <GlassSurface width="100%" height={textareaHeight + 24}>
            <div className="composer-input-container">
              <textarea
                ref={textareaRef}
                className="composer-textarea"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Message input"
                style={{ height: `${textareaHeight}px` }}
              />
              <div className="composer-actions">
                <GlassButton
                  variant="round"
                  width={32}
                  height={32}
                  glassClassName="composer-send-button-glass"
                  disabled={(!input.trim() && !isStreaming) || !thread}
                  onClick={isStreaming ? cancelStream : handleSend}
                  aria-label={isStreaming ? "Stop generation" : "Send message"}
                >
                  {isStreaming ? (
                    <GrClose className="composer-icon" aria-hidden="true" />
                  ) : (
                    <IoArrowUp className="composer-icon" aria-hidden="true" />
                  )}
                </GlassButton>
              </div>
            </div>
          </GlassSurface>
        </div>
      </div>
    </footer>
  );
}
