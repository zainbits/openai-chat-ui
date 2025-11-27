/**
 * OpenAI-compatible API client for chat completions
 * Supports streaming responses via Server-Sent Events (SSE)
 * @module api/client
 */
import type {
  DiscoveredModel,
  OpenAIChatMessage,
  StreamHandle,
} from "../types";

/** Configuration options for the API client */
interface ClientOptions {
  /** Base URL of the OpenAI-compatible API (e.g., "http://localhost:3017/v1") */
  apiBaseUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
}

/** Options for streaming chat completions */
interface StreamChatOptions {
  /** The model ID to use for completion */
  model: string;
  /** Array of messages in the conversation */
  messages: OpenAIChatMessage[];
  /** Temperature for response randomness (0-2, default: 0.7) */
  temperature?: number;
  /** Optional abort signal for cancellation */
  signal?: AbortSignal;
  /** Callback invoked for each token received */
  onToken?: (token: string) => void;
  /** Callback invoked when streaming completes */
  onDone?: () => void;
  /** Callback invoked on error */
  onError?: (err: unknown) => void;
}

/**
 * Client for interacting with OpenAI-compatible chat APIs
 *
 * @example
 * ```ts
 * const client = new OpenAICompatibleClient({
 *   apiBaseUrl: 'http://localhost:3017/v1',
 *   apiKey: 'sk-...',
 * });
 *
 * // Verify connection
 * const isConnected = await client.verify();
 *
 * // Stream a chat response
 * client.streamChat({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   onToken: (token) => console.log(token),
 *   onDone: () => console.log('Complete'),
 * });
 * ```
 */
export class OpenAICompatibleClient {
  private baseUrl: string;
  private apiKey?: string;

  /**
   * Creates a new API client instance
   * @param options - Client configuration options
   */
  constructor(options: ClientOptions) {
    this.baseUrl = options.apiBaseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  /**
   * Verifies the API connection by checking the models endpoint
   * @returns True if the connection is successful, false otherwise
   */
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

  /**
   * Lists available models from the API
   * @returns Array of discovered models
   * @throws Error if the request fails
   */
  async listModels(): Promise<DiscoveredModel[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.status}`);
    }

    const data = await res.json();
    // OpenAI-compatible APIs return { data: Model[] }
    return Array.isArray(data?.data) ? (data.data as DiscoveredModel[]) : [];
  }

  /**
   * Streams a chat completion response
   * @param opts - Streaming options including model, messages, and callbacks
   * @returns Handle for canceling the stream
   */
  streamChat(opts: StreamChatOptions): StreamHandle {
    const abortController = new AbortController();
    const signal = opts.signal ?? abortController.signal;

    void this.postChat(opts, signal)
      .then(() => opts.onDone?.())
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("streamChat error:", err);
          opts.onError?.(err);
        }
      });

    return {
      abortController,
      cancel: () => abortController.abort(),
    };
  }

  /**
   * Internal method for posting chat completion request
   */
  private async postChat(
    opts: Pick<
      StreamChatOptions,
      "model" | "messages" | "temperature" | "onToken"
    >,
    signal: AbortSignal,
  ): Promise<void> {
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
      // Parse SSE lines (format: "data: {...}")
      const lines = chunk.split(/\n/).filter(Boolean);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;

        try {
          const data = JSON.parse(payload);
          const delta = data?.choices?.[0]?.delta?.content ?? "";
          if (delta && opts.onToken) {
            opts.onToken(delta);
          }
        } catch {
          // Non-JSON lines in some implementations; ignore
        }
      }
    }
  }

  /**
   * Builds request headers including authorization if API key is set
   */
  private headers(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
}
