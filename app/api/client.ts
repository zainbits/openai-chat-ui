import type {
  DiscoveredModel,
  OpenAIChatMessage,
  StreamHandle,
} from "../types";

interface ClientOptions {
  apiBaseUrl: string;
  apiKey?: string;
}

export class OpenAICompatibleClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(options: ClientOptions) {
    this.baseUrl = options.apiBaseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  async verify(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/models`;
      const res = await fetch(url, {
        headers: this.headers(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<DiscoveredModel[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.status}`);
    }
    const data = await res.json();
    // OpenAI-compatible returns { data: Model[] }
    return Array.isArray(data?.data) ? (data.data as DiscoveredModel[]) : [];
  }

  streamChat(opts: {
    model: string;
    messages: OpenAIChatMessage[];
    temperature?: number;
    signal?: AbortSignal;
    onToken?: (token: string) => void;
    onDone?: () => void;
    onError?: (err: unknown) => void;
  }): StreamHandle {
    const abortController = new AbortController();
    const signal = opts.signal ?? abortController.signal;

    void this.postChat(opts, signal)
      .then(() => opts.onDone?.())
      .catch((err) => {
        console.error("streamChat error", err);
        opts.onError?.(err);
      });

    return {
      abortController,
      cancel: () => abortController.abort(),
    };
  }

  private async postChat(
    opts: {
      model: string;
      messages: OpenAIChatMessage[];
      temperature?: number;
      onToken?: (t: string) => void;
    },
    signal: AbortSignal,
  ) {
    const url = `${this.baseUrl}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        stream: true,
      }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Chat request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Expect SSE lines starting with data:
      const lines = chunk.split(/\n/).filter(Boolean);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const data = JSON.parse(payload);
          const delta = data?.choices?.[0]?.delta?.content ?? "";
          if (delta && opts.onToken) opts.onToken(delta);
        } catch (err) {
          // Non-JSON lines in some implementations; ignore
        }
      }
    }
  }

  private headers(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;
    return headers;
  }
}
