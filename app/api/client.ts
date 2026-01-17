/**
 * API clients for chat completions
 * Supports OpenAI-compatible APIs and Anthropic API
 * @module api/client
 */
import type {
  DiscoveredModel,
  OpenAIChatMessage,
  StreamHandle,
  ThinkingEffort,
  ContentPart,
} from "../types";
import {
  DEFAULT_CHAT_TEMPERATURE,
  ANTHROPIC_DEFAULT_MAX_TOKENS,
  ANTHROPIC_API_VERSION,
  ANTHROPIC_PROVIDER_ID,
  MAX_RETRY_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRYABLE_STATUS_CODES,
} from "../constants";

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Configuration options for API clients */
export interface ClientOptions {
  /** Base URL of the API (e.g., "http://localhost:3017/v1") */
  apiBaseUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** API provider ID (for proxy routing) */
  apiProvider?: string;
  /** Whether streaming is enabled (default: true) */
  streamingEnabled?: boolean;
}

/** Options for chat completions (streaming or non-streaming) */
export interface ChatOptions {
  /** The model ID to use for completion */
  model: string;
  /** Array of messages in the conversation */
  messages: OpenAIChatMessage[];
  /** Temperature for response randomness (0-2, default: 0.7) */
  temperature?: number;
  /**
   * Enables "thinking"/reasoning mode for models/APIs that support it.
   * Optional for backwards compatibility.
   */
  thinkingEnabled?: boolean;
  /**
   * Controls thinking depth. Maps to reasoning_effort (OpenAI) or budget_tokens (Anthropic/Gemini).
   * Defaults to "medium" if not specified.
   */
  thinkingEffort?: ThinkingEffort;
  /** Optional abort signal for cancellation */
  signal?: AbortSignal;
  /** Callback invoked for each content token received (streaming only) */
  onToken?: (token: string) => void;
  /** Callback invoked for each thinking token received (streaming) */
  onThinking?: (thinkingToken: string) => void;
  /** Callback invoked when streaming completes */
  onDone?: () => void;
  /** Callback invoked on error */
  onError?: (err: unknown) => void;
}

/** Common interface for API clients */
export interface ApiClient {
  verify(): Promise<boolean>;
  listModels(): Promise<DiscoveredModel[]>;
  chat(opts: ChatOptions): StreamHandle;
  /** @deprecated Use chat() instead */
  streamChat(opts: ChatOptions): StreamHandle;
}

/** Response from non-streaming chat completion */
interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      /** Thinking/reasoning content from models that support it */
      reasoning_content?: string;
    };
  }>;
}

/** Anthropic non-streaming response */
interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// ============================================================================
// Retry Utility
// ============================================================================

/**
 * Calculates the delay for exponential backoff with jitter
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, RETRY_MAX_DELAY_MS);
  // Add jitter (±25%)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a fetch call with retry logic for transient failures
 * @param fetchFn - Function that returns a fetch promise
 * @param signal - Optional abort signal
 * @returns The successful response
 * @throws Error if all retries fail
 */
async function fetchWithRetry(
  fetchFn: () => Promise<Response>,
  signal?: AbortSignal,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetchFn();

      // Check if response status is retryable
      if (RETRYABLE_STATUS_CODES.includes(response.status)) {
        // Extract retry-after header if present
        const retryAfter = response.headers.get("retry-after");
        const retryDelay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : calculateBackoffDelay(attempt);

        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          console.warn(
            `Request failed with status ${response.status}, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`,
          );

          // Check if aborted before waiting
          if (signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }

          await delay(retryDelay);
          continue;
        }
      }

      return response;
    } catch (err) {
      // Don't retry abort errors
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }

      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on network errors, not on other errors
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const retryDelay = calculateBackoffDelay(attempt);
        console.warn(
          `Request failed with error: ${lastError.message}, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`,
        );

        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        await delay(retryDelay);
      }
    }
  }

  throw lastError ?? new Error("Request failed after all retries");
}

// ============================================================================
// Base Client
// ============================================================================

/**
 * Abstract base class for API clients with shared functionality
 */
abstract class BaseApiClient implements ApiClient {
  protected baseUrl: string;
  protected apiKey?: string;
  protected apiProvider?: string;
  protected streamingEnabled: boolean;

  constructor(options: ClientOptions) {
    this.baseUrl = options.apiBaseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.apiProvider = options.apiProvider;
    this.streamingEnabled = options.streamingEnabled ?? true;
  }

  abstract verify(): Promise<boolean>;
  abstract listModels(): Promise<DiscoveredModel[]>;
  protected abstract postStreamingChat(
    opts: ChatOptions,
    signal: AbortSignal,
  ): Promise<void>;
  protected abstract postNonStreamingChat(
    opts: ChatOptions,
    signal: AbortSignal,
  ): Promise<string>;

  /**
   * Chat completion with support for both streaming and non-streaming modes
   */
  chat(opts: ChatOptions): StreamHandle {
    const abortController = new AbortController();
    const signal = opts.signal ?? abortController.signal;

    const execute = async () => {
      if (this.streamingEnabled) {
        await this.postStreamingChat(opts, signal);
      } else {
        const content = await this.postNonStreamingChat(opts, signal);
        // Emit all content at once for non-streaming
        opts.onToken?.(content);
      }
    };

    void execute()
      .then(() => opts.onDone?.())
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Chat error:", err);
          opts.onError?.(err);
        }
      });

    return {
      abortController,
      cancel: () => abortController.abort(),
    };
  }

  /**
   * @deprecated Use chat() instead
   */
  streamChat(opts: ChatOptions): StreamHandle {
    return this.chat(opts);
  }

  /**
   * Checks if we're running in development mode
   */
  protected isDev(): boolean {
    return (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")
    );
  }
}

// ============================================================================
// OpenAI-Compatible Client
// ============================================================================

/**
 * Client for interacting with OpenAI-compatible chat APIs
 *
 * @example
 * ```ts
 * const client = new OpenAICompatibleClient({
 *   apiBaseUrl: 'http://localhost:3017/v1',
 *   apiKey: 'sk-...',
 *   streamingEnabled: true,
 * });
 *
 * // Verify connection
 * const isConnected = await client.verify();
 *
 * // Chat with streaming
 * client.chat({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   onToken: (token) => console.log(token),
 *   onDone: () => console.log('Complete'),
 * });
 * ```
 */
export class OpenAICompatibleClient extends BaseApiClient {
  /**
   * Verifies the API connection by checking the models endpoint
   * @returns True if the connection is successful, false otherwise
   */
  async verify(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/models`;
      const res = await fetchWithRetry(() =>
        fetch(url, { headers: this.headers() }),
      );
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
    const res = await fetchWithRetry(() =>
      fetch(`${this.baseUrl}/models`, { headers: this.headers() }),
    );

    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.status}`);
    }

    const data = await res.json();
    // OpenAI-compatible APIs return { data: Model[] }
    return Array.isArray(data?.data) ? (data.data as DiscoveredModel[]) : [];
  }

  /**
   * Posts a streaming chat completion request
   */
  protected async postStreamingChat(
    opts: ChatOptions,
    signal: AbortSignal,
  ): Promise<void> {
    const fetchUrl = this.buildFetchUrl();

    const body: Record<string, unknown> = {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? DEFAULT_CHAT_TEMPERATURE,
      stream: true,
    };

    if (opts.thinkingEnabled) {
      const effort = opts.thinkingEffort ?? "medium";
      // Provider-specific best-effort mapping:
      // - OpenAI: reasoning_effort for reasoning-capable models
      // - Other OpenAI-compatible APIs: budget_tokens mapping (common in gateways)
      if (this.apiProvider === "openai") {
        body.reasoning_effort = effort;
      } else {
        const budgetMap = { low: 8192, medium: 16384, high: 32768 };
        body.thinking = { type: "enabled", budget_tokens: budgetMap[effort] };
      }
    }

    const res = await fetchWithRetry(
      () =>
        fetch(fetchUrl, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(body),
          signal,
        }),
      signal,
    );

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Chat request failed: ${res.status} - ${errorText}`);
    }

    await this.parseSSEStream(res.body, opts.onToken, opts.onThinking);
  }

  /**
   * Posts a non-streaming chat completion request
   */
  protected async postNonStreamingChat(
    opts: ChatOptions,
    signal: AbortSignal,
  ): Promise<string> {
    const fetchUrl = this.buildFetchUrl();

    const body: Record<string, unknown> = {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? DEFAULT_CHAT_TEMPERATURE,
      stream: false,
    };

    if (opts.thinkingEnabled) {
      const effort = opts.thinkingEffort ?? "medium";
      if (this.apiProvider === "openai") {
        body.reasoning_effort = effort;
      } else {
        const budgetMap = { low: 8192, medium: 16384, high: 32768 };
        body.thinking = { type: "enabled", budget_tokens: budgetMap[effort] };
      }
    }

    const res = await fetchWithRetry(
      () =>
        fetch(fetchUrl, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(body),
          signal,
        }),
      signal,
    );

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Chat request failed: ${res.status} - ${errorText}`);
    }

    const data = (await res.json()) as ChatCompletionResponse;
    // For non-streaming, emit thinking content if present and callback provided
    const reasoningContent = data.choices?.[0]?.message?.reasoning_content;
    if (reasoningContent && opts.onThinking) {
      opts.onThinking(reasoningContent);
    }
    return data.choices?.[0]?.message?.content ?? "";
  }

  /**
   * Builds the fetch URL, handling dev proxy if needed
   */
  private buildFetchUrl(): string {
    const targetUrl = `${this.baseUrl}/chat/completions`;

    if (this.isDev()) {
      try {
        const url = new URL(targetUrl);
        if (url.host.includes("openai.com")) {
          return `/openai-proxy${url.pathname}`;
        }
      } catch {
        // Fall through to return targetUrl
      }
    }

    return targetUrl;
  }

  /**
   * Parses Server-Sent Events stream for OpenAI format
   * Streams both content and thinking tokens in real-time
   * Properly buffers incomplete chunks to handle message boundaries
   */
  private async parseSSEStream(
    body: ReadableStream<Uint8Array>,
    onToken?: (token: string) => void,
    onThinking?: (thinkingToken: string) => void,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Process any remaining buffered data
          if (buffer.trim()) {
            this.processSSELine(buffer, onToken, onThinking);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (SSE messages are newline-delimited)
        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue; // Skip empty lines and comments

          if (trimmed.startsWith("data:")) {
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              return;
            }

            this.processSSELine(payload, onToken, onThinking);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Process a single SSE data payload
   * Streams both content and thinking tokens via callbacks
   */
  private processSSELine(
    payload: string,
    onToken?: (token: string) => void,
    onThinking?: (thinkingToken: string) => void,
  ): void {
    try {
      const data = JSON.parse(payload);
      const delta = data?.choices?.[0]?.delta;

      // Handle content tokens - stream immediately
      const content = delta?.content ?? "";
      if (content && onToken) {
        onToken(content);
      }

      // Handle thinking tokens - stream immediately
      // Some APIs return thinking in delta.thinking, delta.reasoning, or delta.reasoning_content
      const thinking =
        delta?.thinking ?? delta?.reasoning ?? delta?.reasoning_content ?? "";
      if (thinking && onThinking) {
        onThinking(thinking);
      }
    } catch {
      // Non-JSON lines in some implementations; ignore
    }
  }

  /**
   * Builds request headers including authorization if API key is set
   */
  private headers(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
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
  content: string | AnthropicContentPart[];
}

/** Anthropic content part types */
interface AnthropicTextPart {
  type: "text";
  text: string;
}

interface AnthropicImagePart {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

type AnthropicContentPart = AnthropicTextPart | AnthropicImagePart;

/**
 * Client for interacting with Anthropic's Messages API
 *
 * @example
 * ```ts
 * const client = new AnthropicClient({
 *   apiBaseUrl: 'https://api.anthropic.com/v1',
 *   apiKey: 'sk-ant-...',
 *   streamingEnabled: true,
 * });
 *
 * client.chat({
 *   model: 'claude-3-5-sonnet-20241022',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   onToken: (token) => console.log(token),
 *   onDone: () => console.log('Complete'),
 * });
 * ```
 */
export class AnthropicClient extends BaseApiClient {
  /**
   * Verifies the API connection by attempting a minimal request
   * Note: Anthropic doesn't have a /models endpoint, so we verify by checking auth
   */
  async verify(): Promise<boolean> {
    try {
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
    return [
      {
        id: "claude-sonnet-4-5-20250929",
        object: "model",
        owned_by: "anthropic",
      },
    ];
  }

  /**
   * Posts a streaming chat completion request to Anthropic
   */
  protected async postStreamingChat(
    opts: ChatOptions,
    signal: AbortSignal,
  ): Promise<void> {
    const { systemPrompt, messages } = this.convertMessages(opts.messages);
    const fetchUrl = this.buildFetchUrl();

    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      max_tokens: ANTHROPIC_DEFAULT_MAX_TOKENS,
      stream: true,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (opts.temperature !== undefined) {
      body.temperature = opts.temperature;
    }

    if (opts.thinkingEnabled) {
      // Best-effort Anthropic "thinking" request shape.
      // If the gateway/model doesn't support it, we'll auto-disable on error in the UI layer.
      const effort = opts.thinkingEffort ?? "medium";
      const budgetMap = { low: 8192, medium: 16384, high: 32768 };
      body.thinking = { type: "enabled", budget_tokens: budgetMap[effort] };
    }

    const res = await fetchWithRetry(
      () =>
        fetch(fetchUrl, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(body),
          signal,
        }),
      signal,
    );

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Anthropic request failed: ${res.status} - ${errorText}`);
    }

    await this.parseAnthropicStream(res.body, opts.onToken, opts.onThinking);
  }

  /**
   * Posts a non-streaming chat completion request to Anthropic
   */
  protected async postNonStreamingChat(
    opts: ChatOptions,
    signal: AbortSignal,
  ): Promise<string> {
    const { systemPrompt, messages } = this.convertMessages(opts.messages);
    const fetchUrl = this.buildFetchUrl();

    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      max_tokens: ANTHROPIC_DEFAULT_MAX_TOKENS,
      stream: false,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (opts.temperature !== undefined) {
      body.temperature = opts.temperature;
    }

    if (opts.thinkingEnabled) {
      const effort = opts.thinkingEffort ?? "medium";
      const budgetMap = { low: 8192, medium: 16384, high: 32768 };
      body.thinking = { type: "enabled", budget_tokens: budgetMap[effort] };
    }

    const res = await fetchWithRetry(
      () =>
        fetch(fetchUrl, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(body),
          signal,
        }),
      signal,
    );

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Anthropic request failed: ${res.status} - ${errorText}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    // For non-streaming, emit thinking content if present and callback provided
    const thinkingBlock = data.content?.find(
      (block) => block.type === "thinking",
    );
    if (thinkingBlock?.text && opts.onThinking) {
      opts.onThinking(thinkingBlock.text);
    }
    return data.content?.find((block) => block.type === "text")?.text ?? "";
  }

  /**
   * Builds the fetch URL, handling dev proxy if needed
   */
  private buildFetchUrl(): string {
    if (this.isDev()) {
      try {
        const url = new URL(`${this.baseUrl}/messages`);
        return `/anthropic-proxy${url.pathname}`;
      } catch {
        // Fall through
      }
    }
    return `${this.baseUrl}/messages`;
  }

  /**
   * Parses Server-Sent Events stream for Anthropic format
   * Streams both content and thinking tokens in real-time
   * Properly buffers incomplete chunks to handle message boundaries
   */
  private async parseAnthropicStream(
    body: ReadableStream<Uint8Array>,
    onToken?: (token: string) => void,
    onThinking?: (thinkingToken: string) => void,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // Track current content block type to route deltas correctly
    let currentBlockType: "text" | "thinking" | null = null;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Process any remaining buffered data
          if (buffer.trim()) {
            const result = this.processAnthropicLine(
              buffer,
              currentBlockType,
              onToken,
              onThinking,
            );
            if (result.newBlockType !== undefined) {
              currentBlockType = result.newBlockType;
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (SSE messages are newline-delimited)
        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue; // Skip empty lines and comments

          if (trimmed.startsWith("data:")) {
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              return;
            }

            const result = this.processAnthropicLine(
              payload,
              currentBlockType,
              onToken,
              onThinking,
            );
            if (result.shouldStop) {
              return;
            }
            if (result.newBlockType !== undefined) {
              currentBlockType = result.newBlockType;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Process a single Anthropic SSE data payload
   * Streams both content and thinking tokens via callbacks
   */
  private processAnthropicLine(
    payload: string,
    currentBlockType: "text" | "thinking" | null,
    onToken?: (token: string) => void,
    onThinking?: (thinkingToken: string) => void,
  ): {
    shouldStop?: boolean;
    newBlockType?: "text" | "thinking" | null;
  } {
    try {
      const data = JSON.parse(payload);

      if (data.type === "content_block_start") {
        // Track what type of block we're receiving
        return { newBlockType: data.content_block?.type ?? null };
      } else if (data.type === "content_block_delta") {
        // Route delta to appropriate callback based on block type or delta type
        const deltaType = data.delta?.type;

        if (deltaType === "thinking_delta" || currentBlockType === "thinking") {
          // Stream thinking immediately
          const thinking = data.delta?.thinking ?? "";
          if (thinking && onThinking) {
            onThinking(thinking);
          }
        } else if (deltaType === "text_delta" || currentBlockType === "text") {
          // Stream text immediately
          const text = data.delta?.text ?? "";
          if (text && onToken) {
            onToken(text);
          }
        }
      } else if (data.type === "content_block_stop") {
        return { newBlockType: null };
      } else if (data.type === "message_stop") {
        return { shouldStop: true };
      }
    } catch {
      // Non-JSON lines; ignore
    }
    return {};
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
        // System messages are always text-only
        const content = typeof msg.content === "string" ? msg.content : "";
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${content}` : content;
      } else if (msg.role === "user" || msg.role === "assistant") {
        anthropicMessages.push({
          role: msg.role,
          content: this.convertContentToAnthropic(msg.content),
        });
      }
    }

    return { systemPrompt, messages: anthropicMessages };
  }

  /**
   * Converts OpenAI content format to Anthropic content format
   */
  private convertContentToAnthropic(
    content: string | ContentPart[],
  ): string | AnthropicContentPart[] {
    // If it's a string, return as-is
    if (typeof content === "string") {
      return content;
    }

    // Convert ContentPart array to Anthropic format
    const anthropicParts: AnthropicContentPart[] = [];

    for (const part of content) {
      if (part.type === "text") {
        anthropicParts.push({ type: "text", text: part.text });
      } else if (part.type === "image_url") {
        // Parse base64 data URL
        const url = part.image_url.url;
        if (url.startsWith("data:")) {
          const match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (match && match[1] && match[2]) {
            anthropicParts.push({
              type: "image",
              source: {
                type: "base64",
                media_type: match[1],
                data: match[2],
              },
            });
          }
        }
      }
    }

    return anthropicParts.length > 0 ? anthropicParts : "";
  }

  /**
   * Builds request headers for Anthropic API
   */
  private headers(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_API_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }
    return headers;
  }
}

/**
 * Factory helper to build the correct API client for a provider.
 */
export function createApiClient(options: ClientOptions): ApiClient {
  if (options.apiProvider === ANTHROPIC_PROVIDER_ID) {
    return new AnthropicClient(options);
  }
  return new OpenAICompatibleClient(options);
}
