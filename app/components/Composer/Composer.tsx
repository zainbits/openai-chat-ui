import React, { useCallback, useState, useRef } from "react";
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

/**
 * Message composer component with quick actions and send functionality
 */
export default function Composer() {
  const thread = useAppStore(selectActiveThread);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isLoading, isRegenerating, sendMessage, cancelStream } = useChat();

  // Show stop button when either loading or regenerating
  const isStreaming = isLoading || isRegenerating;

  /**
   * Handles sending the message
   */
  const handleSend = useCallback(async () => {
    if (!input.trim() || !thread || isStreaming) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  }, [input, thread, isStreaming, sendMessage]);

  /**
   * Handles keyboard shortcuts (Enter to send, Shift+Enter for new line)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
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
          <GlassSurface width="100%" height={100}>
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Message input"
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
