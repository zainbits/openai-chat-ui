import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../../state/AppState";
import { OpenAICompatibleClient } from "../../api/client";
import GlassSurface from "../GlassSurface";
import GlassButton from "../GlassButton";
import { GrSend, GrClose } from "react-icons/gr";
import "./Composer.css";

const QUICK_ACTIONS = [
  "Make this concise",
  "Fix grammar and tone",
  "Turn this into bullet points",
  "Explain like I'm 12",
];

export default function Composer() {
  const { data, setData } = useAppState();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const dataRef = useRef(data);
  const streamRef = useRef<ReturnType<
    OpenAICompatibleClient["streamChat"]
  > | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const activeThread = data.ui.activeThread
    ? data.chats[data.ui.activeThread]
    : null;
  const activeModel = activeThread
    ? data.models.find((m) => m.id === activeThread.modelId)
    : null;

  // Memoize the API client to avoid re-instantiation on every render
  const client = useMemo(
    () =>
      new OpenAICompatibleClient({
        apiBaseUrl: data.settings.apiBaseUrl,
        apiKey: data.settings.apiKey,
      }),
    [data.settings.apiBaseUrl, data.settings.apiKey]
  );

  const send = async (text: string) => {
    if (!activeThread || !activeModel) return;
    if (!text.trim()) return;

    const now = Date.now();
    const userMsg = { role: "user" as const, content: text, ts: now };
    const assistantMsg = { role: "assistant" as const, content: "", ts: now };
    setData((d) => ({
      ...d,
      chats: {
        ...d.chats,
        [activeThread.id]: {
          ...d.chats[activeThread.id],
          messages: [
            ...d.chats[activeThread.id].messages,
            userMsg,
            assistantMsg,
          ],
          updatedAt: now,
          preview: d.chats[activeThread.id].preview || text.slice(0, 80),
        },
      },
    }));

    setInput("");
    setLoading(true);

    const system = activeModel.system
      ? [{ role: "system" as const, content: activeModel.system }]
      : [];
    const history = activeThread.messages
      .concat(userMsg)
      .map((m) => ({ role: m.role, content: m.content }));
    const messages = [...system, ...history];

    streamRef.current = client.streamChat({
      model: activeModel.model,
      messages,
      temperature: activeModel.temp,
      onToken: (t) =>
        setData((d) => ({
          ...d,
          chats: {
            ...d.chats,
            [activeThread.id]: {
              ...d.chats[activeThread.id],
              messages: d.chats[activeThread.id].messages.map((mm, i, arr) =>
                i === arr.length - 1 ? { ...mm, content: mm.content + t } : mm,
              ),
              updatedAt: Date.now(),
            },
          },
        })),
      onDone: async () => {
        setLoading(false);
        // Autogenerate a title once per thread: if the thread still has the default title
        // and at least one user message has been sent, create a short title using the
        // configured default remote model. Do not regenerate on later messages.
        try {
          const snapshot = dataRef.current;
          const current = snapshot.chats[activeThread.id];
          if (!current) return;
          const hasDefaultTitle =
            (current.title || "").trim().toLowerCase() === "new chat";
          const hasAnyUser = current.messages.some((m) => m.role === "user");
          if (!hasDefaultTitle || !hasAnyUser) return;

          // Use the selected thread's remote model for title generation
          const threadModelId =
            snapshot.models.find((m) => m.id === current.modelId)?.model ||
            activeModel.model;
          const titleClient = new OpenAICompatibleClient({
            apiBaseUrl: snapshot.settings.apiBaseUrl,
            apiKey: snapshot.settings.apiKey,
          });

          const firstUser = current.messages.find((m) => m.role === "user");
          if (!firstUser) return;

          const prompt = `You are a helpful assistant. Create a concise, 3-6 word title for this conversation. No quotes, no punctuation at the end. Respond with title only. Conversation starts with: "${firstUser.content.slice(0, 500)}"`;

          let title = "";
          await new Promise<void>((resolve, reject) => {
            const handle = titleClient.streamChat({
              model: threadModelId,
              temperature: 0.2,
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
            // We could cancel if needed via handle.cancel()
          });

          // Sanitize and shorten: strip quotes/punctuation, collapse spaces, limit to ~6 words
          title = (title || "")
            .replace(/[\r\n]+/g, " ")
            .replace(/^['"“”‘’\s]+|['"“”‘’\s]+$/g, "")
            .replace(/[.:!?]+$/g, "")
            .replace(/\s+/g, " ")
            .trim();
          const words = title.split(" ").filter(Boolean);
          if (words.length > 6) title = words.slice(0, 6).join(" ");
          if (title) {
            setData((d) => ({
              ...d,
              chats: {
                ...d.chats,
                [activeThread.id]: {
                  ...d.chats[activeThread.id],
                  title: title.slice(0, 80),
                  updatedAt: Date.now(),
                },
              },
            }));
          }
        } catch (err) {
          // Swallow title errors silently
          console.warn("Title generation failed", err);
        }
      },
      onError: () => setLoading(false),
    });
  };

  const cancel = useCallback(() => {
    streamRef.current?.cancel();
    setLoading(false);
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter or Cmd+Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (input.trim() && activeThread && !loading) {
          send(input);
        }
      }
    },
    [input, activeThread, loading]
  );

  return (
    <footer className="composer" role="region" aria-label="Message composer">
      <div className="composer-content">
        <div className="quick-actions" role="toolbar" aria-label="Quick action shortcuts">
          {QUICK_ACTIONS.map((q) => (
            <GlassButton
              key={q}
              variant="default"
              width="auto"
              height={32}
              borderRadius={16}
              color="danger"
              glassClassName="text-xs px-3"
              onClick={() => setInput((v) => (v ? v + "\n\n" + q : q))}
              aria-label={`Add quick action: ${q}`}
            >
              {q}
            </GlassButton>
          ))}
        </div>
        <div className="composer-input-area">
          <GlassSurface width={"100%"} height={100}>
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
              color={loading ? "danger" : "primary"}
              disabled={(!input.trim() && !loading) || !activeThread}
              onClick={loading ? cancel : () => send(input)}
              aria-label={loading ? "Cancel message" : "Send message"}
            >
              {loading ? (
                <GrClose className="w-5 h-5 text-white" aria-hidden="true" />
              ) : (
                <GrSend className="w-5 h-5 text-white" aria-hidden="true" />
              )}
            </GlassButton>
          </div>
        </div>
      </div>
    </footer>
  );
}
