import React, { useCallback, useState, useRef, useEffect } from "react";
import { useAppStore, selectActiveThread } from "../../state/store";
import { useChat } from "../../hooks";
import GlassSurface from "../GlassSurface";
import GlassButton from "../GlassButton";
import { GrSend, GrClose } from "react-icons/gr";
import "./Composer.css";

/** Quick action prompts for common tasks */
const QUICK_ACTIONS = [
  "Make this concise",
  "Fix grammar and tone",
  "Turn this into bullet points",
  "Explain like I'm 12",
];

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
  const [textareaHeight, setTextareaHeight] = useState(TEXTAREA_MIN_HEIGHT);

  const { isLoading, isRegenerating, sendMessage, cancelStream } = useChat();

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

  /**
   * Adds a quick action to the input
   */
  const addQuickAction = useCallback((action: string) => {
    setInput((v) => (v ? v + "\n\n" + action : action));
  }, []);

  return (
    <footer className="composer" role="region" aria-label="Message composer">
      <div className="composer-content">
        <div
          className="quick-actions"
          role="toolbar"
          aria-label="Quick action shortcuts"
        >
          {QUICK_ACTIONS.map((q) => (
            <GlassButton
              key={q}
              variant="default"
              width="auto"
              height={32}
              borderRadius={16}
              color="danger"
              glassClassName="glass-button-text-xs glass-button-px-3"
              onClick={() => addQuickAction(q)}
              aria-label={`Add quick action: ${q}`}
            >
              {q}
            </GlassButton>
          ))}
        </div>
        <div className="composer-input-area">
          <GlassSurface width="100%" height={textareaHeight + 24}>
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
          </GlassSurface>
          <div className="composer-actions">
            <GlassButton
              variant="round"
              color={isStreaming ? "danger" : "primary"}
              disabled={(!input.trim() && !isStreaming) || !thread}
              onClick={isStreaming ? cancelStream : handleSend}
              aria-label={isStreaming ? "Stop generation" : "Send message"}
            >
              {isStreaming ? (
                <GrClose className="composer-icon" aria-hidden="true" />
              ) : (
                <GrSend className="composer-icon" aria-hidden="true" />
              )}
            </GlassButton>
          </div>
        </div>
      </div>
    </footer>
  );
}
