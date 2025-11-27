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

  const { isLoading, sendMessage, cancelStream } = useChat();

  /**
   * Handles sending the message
   */
  const handleSend = useCallback(async () => {
    if (!input.trim() || !thread || isLoading) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  }, [input, thread, isLoading, sendMessage]);

  /**
   * Handles keyboard shortcuts (Ctrl+Enter to send)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
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
              placeholder="Type your message... (Ctrl+Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Message input"
            />
          </GlassSurface>
          <div className="composer-actions">
            <GlassButton
              variant="round"
              color={isLoading ? "danger" : "primary"}
              disabled={(!input.trim() && !isLoading) || !thread}
              onClick={isLoading ? cancelStream : handleSend}
              aria-label={isLoading ? "Cancel message" : "Send message"}
            >
              {isLoading ? (
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
