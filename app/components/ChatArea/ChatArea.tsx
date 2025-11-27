import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../../state/AppState";
import { renderMarkdown } from "../../utils/markdown";
import Composer from "../Composer";
import { OpenAICompatibleClient } from "../../api/client";
import GlassButton from "../GlassButton";
import "./ChatArea.css";

export default function ChatArea() {
  const { data, setData } = useAppState();
  const active = data.ui.activeThread ? data.chats[data.ui.activeThread] : null;
  const [regenerating, setRegenerating] = useState(false);

  const messages = useMemo(() => active?.messages ?? [], [active]);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Memoize the API client to avoid re-instantiation on every render
  const client = useMemo(
    () =>
      new OpenAICompatibleClient({
        apiBaseUrl: data.settings.apiBaseUrl,
        apiKey: data.settings.apiKey,
      }),
    [data.settings.apiBaseUrl, data.settings.apiKey]
  );

  useEffect(() => {
    // Auto-scroll to the bottom when messages change
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const regenerateLastMessage = async () => {
    if (!active || regenerating) return;

    const activeModel = data.models.find((m) => m.id === active.modelId);
    if (!activeModel) return;

    const lastUserIndex = [...active.messages]
      .map((m) => m.role)
      .lastIndexOf("user");
    if (lastUserIndex === -1) return;

    const trimmed = active.messages.slice(0, lastUserIndex + 1);
    setData((d) => ({
      ...d,
      chats: {
        ...d.chats,
        [active.id]: {
          ...d.chats[active.id],
          messages: trimmed,
        },
      },
    }));

    setRegenerating(true);

    const now = Date.now();
    const assistantMsg = { role: "assistant" as const, content: "", ts: now };
    setData((d) => ({
      ...d,
      chats: {
        ...d.chats,
        [active.id]: {
          ...d.chats[active.id],
          messages: [...trimmed, assistantMsg],
          updatedAt: now,
        },
      },
    }));

    const system = activeModel.system
      ? [{ role: "system" as const, content: activeModel.system }]
      : [];
    const history = trimmed.map((m) => ({ role: m.role, content: m.content }));
    const allMessages = [...system, ...history];

    client.streamChat({
      model: activeModel.model,
      messages: allMessages,
      temperature: activeModel.temp,
      onToken: (t) =>
        setData((d) => ({
          ...d,
          chats: {
            ...d.chats,
            [active.id]: {
              ...d.chats[active.id],
              messages: d.chats[active.id].messages.map((mm, i, arr) =>
                i === arr.length - 1 ? { ...mm, content: mm.content + t } : mm,
              ),
              updatedAt: Date.now(),
            },
          },
        })),
      onDone: () => setRegenerating(false),
      onError: () => setRegenerating(false),
    });
  };

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
                      disabled={regenerating}
                      onClick={regenerateLastMessage}
                      width="auto"
                      height={24}
                      borderRadius={12}
                      glassClassName="text-xs px-2 py-1 text-[10px] md:text-[11px]"
                      title="Regenerate last response"
                      aria-label={regenerating ? "Regenerating response" : "Regenerate last response"}
                    >
                      {regenerating ? "Regenerating..." : "Regenerate"}
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
