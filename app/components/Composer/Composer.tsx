import React, { useRef, useState } from "react";
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
  const streamRef = useRef<ReturnType<
    OpenAICompatibleClient["streamChat"]
  > | null>(null);

  const activeThread = data.ui.activeThread
    ? data.chats[data.ui.activeThread]
    : null;
  const activeModel = activeThread
    ? data.models.find((m) => m.id === activeThread.modelId)
    : null;

  const client = new OpenAICompatibleClient({
    apiBaseUrl: data.settings.apiBaseUrl,
    apiKey: data.settings.apiKey,
  });

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
      onDone: () => setLoading(false),
      onError: () => setLoading(false),
    });
  };

  const cancel = () => {
    streamRef.current?.cancel();
    setLoading(false);
  };

  return (
    <footer className="composer">
      <div className="composer-content">
        <div className="quick-actions">
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
            >
              {q}
            </GlassButton>
          ))}
        </div>
        <div className="composer-input-area">
          <GlassSurface width={"100%"} height={100}>
            <textarea
              className="composer-textarea"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </GlassSurface>
          <div className="composer-actions">
            <GlassButton
              variant="round"
              color={loading ? "danger" : "primary"}
              disabled={(!input.trim() && !loading) || !activeThread}
              onClick={loading ? cancel : () => send(input)}
            >
              {loading ? (
                <GrClose className="w-5 h-5 text-white" />
              ) : (
                <GrSend className="w-5 h-5 text-white" />
              )}
            </GlassButton>
          </div>
        </div>
      </div>
    </footer>
  );
}
