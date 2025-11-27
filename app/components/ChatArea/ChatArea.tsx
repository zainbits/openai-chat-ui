import React, { useEffect, useMemo, useRef } from "react";
import { useAppStore, selectActiveThread } from "../../state/store";
import { useChat } from "../../hooks";
import { renderMarkdown } from "../../utils/markdown";
import Composer from "../Composer";
import GlassButton from "../GlassButton";
import "./ChatArea.css";

/**
 * Main chat area component displaying messages and the composer
 */
export default function ChatArea() {
  const thread = useAppStore(selectActiveThread);
  const { isRegenerating, regenerateLastMessage } = useChat();

  const messages = useMemo(() => thread?.messages ?? [], [thread]);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <main className="chat-main" role="main" aria-label="Chat conversation">
      <section
        ref={listRef}
        className="messages-container"
        aria-label="Message history"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="empty-state" role="status">
            Start chatting by selecting a model and typing below.
          </div>
        )}
        <div className="message-list" role="list">
          {messages.map((m, idx) => {
            const isLastMessage = idx === messages.length - 1;
            const isAssistantMessage = m.role === "assistant";
            const showRegenerateButton =
              isLastMessage && isAssistantMessage && messages.length > 1;

            return (
              <article
                key={idx}
                className="message-bubble"
                role="listitem"
                aria-label={`${m.role === "user" ? "Your" : "Assistant"} message`}
              >
                <div className="message-role" aria-hidden="true">
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div
                  className="message-content"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(m.content),
                  }}
                />
                {showRegenerateButton && (
                  <div className="regenerate-section">
                    <GlassButton
                      variant="default"
                      color="primary"
                      disabled={isRegenerating}
                      onClick={regenerateLastMessage}
                      width="auto"
                      height={24}
                      borderRadius={12}
                      glassClassName="text-xs px-2 py-1 text-[10px] md:text-[11px]"
                      title="Regenerate last response"
                      aria-label={
                        isRegenerating
                          ? "Regenerating response"
                          : "Regenerate last response"
                      }
                    >
                      {isRegenerating ? "Regenerating..." : "Regenerate"}
                    </GlassButton>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <Composer />
    </main>
  );
}
