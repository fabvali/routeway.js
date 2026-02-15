import { EventEmitter } from "events";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CreateCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface StreamingDelta {
  role?: "assistant";
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: null;
}

export interface CompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: StreamingDelta;
    finish_reason?: string | null;
  }[];
  system_fingerprint?: string | null;
  usage?: null;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: unknown;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    index: number;
    message: ChatMessage;
    logprobs: string | null;
    finish_reason: string;
  }[];
}

export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  type: string;
  access: {
    Starter: boolean;
    Pro: boolean;
    Enterprise: boolean;
  };
}

export interface ModelResponse {
  object: string;
  data: Model[];
}

type NonStreamingOptions = Omit<CreateCompletionOptions, "stream"> & {
  stream?: false | undefined;
};

type StreamingOptions = CreateCompletionOptions & {
  stream: true;
};


export interface StreamEvents {
  chunk: (chunk: CompletionChunk) => void;
  content: (content: string) => void;
  reasoning: (reasoning: string) => void;
  error: (error: Error) => void;
  done: () => void;
}

export class CompletionStream extends EventEmitter {
  public emit<K extends keyof StreamEvents>(
    event: K,
    ...args: Parameters<StreamEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  public on<K extends keyof StreamEvents>(
    event: K,
    listener: StreamEvents[K]
  ): this {
    return super.on(event, listener);
  }

  public once<K extends keyof StreamEvents>(
    event: K,
    listener: StreamEvents[K]
  ): this {
    return super.once(event, listener);
  }
}

class Completions {

  public constructor(private readonly apiKey: string, private readonly baseUrl: string) {}

  public async create(
    options: NonStreamingOptions
  ): Promise<CompletionResponse>;

  public async create(
    options: StreamingOptions
  ): Promise<CompletionStream>;

  public async create(
    options: CreateCompletionOptions
  ): Promise<CompletionResponse | CompletionStream> {
    const endpoint = "v1/chat/completions";
    const url = `${this.baseUrl}/${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch completion (${response.status}): ${errorText}`
      );
    }

    if (options.stream) {
      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      const stream = new CompletionStream();

      this.handleStreamingResponse(response.body, stream).catch((err) =>
        stream.emit("error", err)
      );

      return stream;
    }

    return response.json() as Promise<CompletionResponse>;
  }

  private async handleStreamingResponse(
    body: ReadableStream<Uint8Array>,
    emitter: CompletionStream
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          this.processLine(line.trim(), emitter);
        }
      }

      if (buffer.trim()) {
        this.processLine(buffer.trim(), emitter);
      }

      emitter.emit("done");
    } catch (error) {
      emitter.emit(
        "error",
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      reader.releaseLock();
    }
  }

  private processLine(
    line: string,
    emitter: CompletionStream
  ): void {
    if (!line || line.startsWith(":")) return;
    if (!line.startsWith("data: ")) return;

    const data = line.slice(6).trim();
    if (data === "[DONE]") return;

    try {
      const chunk: CompletionChunk = JSON.parse(data);
      emitter.emit("chunk", chunk);

      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        emitter.emit("content", delta.content);
      }

      if (delta?.reasoning_content) {
        emitter.emit("reasoning", delta.reasoning_content);
      }
    } catch (error) {
      console.warn("Failed to parse chunk: ", error);
    }
  }

  public async *createIterator(
    options: StreamingOptions
  ): AsyncGenerator<CompletionChunk, void, unknown> {
    const endpoint = "v1/chat/completions";
    const url = `${this.baseUrl}/${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch completion (${response.status}): ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("No response body for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (
            !trimmed ||
            trimmed.startsWith(":") ||
            !trimmed.startsWith("data: ")
          )
            continue;

          const data = trimmed.slice(6).trim();
          if (data === "[DONE]") return;

          try {
            const chunk: CompletionChunk = JSON.parse(data);
            yield chunk;
          } catch {}
        }
      }
    } catch {} finally {
      reader.releaseLock();
    }
  }
}

class Chat {
  public readonly completions: Completions;

  public constructor(apiKey: string, baseUrl: string) {
    this.completions = new Completions(apiKey, baseUrl);
  }
}

export class Client {
  public readonly chat: Chat;

  public constructor(private readonly apiKey: string, private readonly baseUrl = "https://api.routeway.ai") {
    this.chat = new Chat(this.apiKey, this.baseUrl);
  }

  public async models(): Promise<ModelResponse> {
    const endpoint = "v1/models";
    const url = `${this.baseUrl}/${endpoint}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch models (${response.status}): ${errorText}`
      );
    }

    return response.json() as Promise<ModelResponse>;
  }
}
