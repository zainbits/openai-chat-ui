/**
 * API clients for chat completions
 * Supports OpenAI-compatible APIs and Anthropic API
 * @module api/client
 */
import type {
  DiscoveredModel,
  OpenAIChatMessage,
  StreamHandle,
} from "../types";

/** Configuration options for API clients */
interface ClientOptions {
  /** Base URL of the API (e.g., "http://localhost:3017/v1") */
  apiBaseUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** API provider ID (for proxy routing) */
  apiProvider?: string;
}

/** Common interface for API clients */
export interface ApiClient {
  verify(): Promise<boolean>;
  listModels(): Promise<DiscoveredModel[]>;
  streamChat(opts: StreamChatOptions): StreamHandle;
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
  private apiProvider?: string;

  /**
   * Creates a new API client instance
   * @param options - Client configuration options
   */
  constructor(options: ClientOptions) {
    this.baseUrl = options.apiBaseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.apiProvider = options.apiProvider;
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
   * Uses Vite dev proxy to avoid CORS issues in development
   */
  private async postChat(
    opts: Pick<
      StreamChatOptions,
      "model" | "messages" | "temperature" | "onToken"
    >,
    signal: AbortSignal,
  ): Promise<void> {
    const targetUrl = `${this.baseUrl}/chat/completions`;
    
    // Use Vite proxy in development to avoid CORS
    const isDev = typeof window !== "undefined" && 
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    
    let fetchUrl: string;
    if (isDev) {
      // Replace the host with the proxy path for OpenAI-compatible APIs
      try {
        const url = new URL(targetUrl);
        // Check if it's OpenAI or another provider
        if (url.host.includes("openai.com")) {
          fetchUrl = `/openai-proxy${url.pathname}`;
        } else {
          // For other providers (Groq, Cerebras, etc.), make direct request
          // They typically have CORS enabled, or use the full URL
          fetchUrl = targetUrl;
        }
      } catch {
        fetchUrl = targetUrl;
      }
    } else {
      fetchUrl = targetUrl;
    }
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        stream: true,
      }),
      signal,
    });

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Chat request failed: ${res.status} - ${errorText}`);
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

// ============================================================================
// Anthropic API Client
// ============================================================================

/** Anthropic message format */
interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

/** Anthropic API version */
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Client for interacting with Anthropic's Messages API
 *
 * @example
 * ```ts
 * const client = new AnthropicClient({
 *   apiBaseUrl: 'https://api.anthropic.com/v1',
 *   apiKey: 'sk-ant-...',
 * });
 *
 * client.streamChat({
 *   model: 'claude-3-5-sonnet-20241022',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   onToken: (token) => console.log(token),
 *   onDone: () => console.log('Complete'),
 * });
 * ```
 */
export class AnthropicClient implements ApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private apiProvider: string;

  constructor(options: ClientOptions) {
    this.baseUrl = options.apiBaseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.apiProvider = options.apiProvider ?? "anthropic";
  }

  /**
   * Verifies the API connection by attempting a minimal request
   * Note: Anthropic doesn't have a /models endpoint, so we verify by checking auth
   */
  async verify(): Promise<boolean> {
    try {
      // Try to list models (will fail gracefully if not available)
      const models = await this.listModels();
      return models.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Lists available models from Anthropic
   * Note: Anthropic doesn't have a models endpoint, so we return known models
   */
  async listModels(): Promise<DiscoveredModel[]> {
    // Anthropic doesn't have a public models endpoint
    // Return known Claude models
    return [
      { id: "claude-sonnet-4-5-20250929", object: "model", owned_by: "anthropic" },
    ];
  }

  /**
   * Streams a chat completion response using Anthropic's Messages API
   */
  streamChat(opts: StreamChatOptions): StreamHandle {
    const abortController = new AbortController();
    const signal = opts.signal ?? abortController.signal;

    void this.postChat(opts, signal)
      .then(() => opts.onDone?.())
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Anthropic streamChat error:", err);
          opts.onError?.(err);
        }
      });

    return {
      abortController,
      cancel: () => abortController.abort(),
    };
  }

  /**
   * Internal method for posting chat completion request to Anthropic
   * Uses Vite dev proxy to avoid CORS issues in development
   */
  private async postChat(
    opts: Pick<
      StreamChatOptions,
      "model" | "messages" | "temperature" | "onToken"
    >,
    signal: AbortSignal,
  ): Promise<void> {
    // Convert OpenAI message format to Anthropic format
    const { systemPrompt, messages } = this.convertMessages(opts.messages);
    
    // Build the request URL
    // In dev mode, use proxy to avoid CORS
    const isDev = typeof window !== "undefined" && 
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    
    let fetchUrl: string;
    if (isDev) {
      // Replace the host with the proxy path
      // e.g., https://anthropic.prod.ai-gateway.quantumblack.com/xxx/v1/messages
      // becomes /anthropic-proxy/xxx/v1/messages
      try {
        const url = new URL(`${this.baseUrl}/messages`);
        fetchUrl = `/anthropic-proxy${url.pathname}`;
      } catch {
        fetchUrl = `${this.baseUrl}/messages`;
      }
    } else {
      fetchUrl = `${this.baseUrl}/messages`;
    }
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    };
    
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      max_tokens: 8192,
      stream: true,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (opts.temperature !== undefined) {
      body.temperature = opts.temperature;
    }

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Anthropic request failed: ${res.status} - ${errorText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE lines (format: "event: ...\ndata: {...}")
      const lines = chunk.split(/\n/).filter(Boolean);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;

        try {
          const data = JSON.parse(payload);

          // Handle different Anthropic event types
          if (data.type === "content_block_delta") {
            const delta = data.delta?.text ?? "";
            if (delta && opts.onToken) {
              opts.onToken(delta);
            }
          } else if (data.type === "message_stop") {
            return;
          }
        } catch {
          // Non-JSON lines; ignore
        }
      }
    }
  }

  /**
   * Converts OpenAI message format to Anthropic format
   * Extracts system prompts and converts messages
   */
  private convertMessages(messages: OpenAIChatMessage[]): {
    systemPrompt: string | null;
    messages: AnthropicMessage[];
  } {
    let systemPrompt: string | null = null;
    const anthropicMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        // Combine multiple system messages
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${msg.content}` : msg.content;
      } else if (msg.role === "user" || msg.role === "assistant") {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
      // Skip "tool" role as we don't support tools yet
    }

    return { systemPrompt, messages: anthropicMessages };
  }

  /**
   * Builds request headers for Anthropic API
   */
  private headers(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }
    return headers;
  }
}
