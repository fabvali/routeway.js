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
  reasoning?: string | null;
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

export interface StreamCallbacks {
  onChunk?: (chunk: CompletionChunk) => void;
  onContent?: (content: string) => void;
  onReasoning?: (reasoning: string) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

class Completions {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  public constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  public async create(
    options: CreateCompletionOptions & { stream?: false | undefined }
  ): Promise<CompletionResponse>;
  
  public async create(
    options: CreateCompletionOptions & { stream: true },
    callbacks: StreamCallbacks
  ): Promise<void>;
  
  public async create(
    options: CreateCompletionOptions,
    callbacks?: StreamCallbacks
  ): Promise<CompletionResponse | void> {
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
      
      await this.handleStreamingResponse(response.body, callbacks || {});
      return;
    }

    return response.json() as Promise<CompletionResponse>;
  }

  private async handleStreamingResponse(
    body: ReadableStream<Uint8Array>,
    callbacks: StreamCallbacks
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
          await this.processLine(line.trim(), callbacks);
        }
      }
      
      if (buffer.trim()) {
        await this.processLine(buffer.trim(), callbacks);
      }
      
      callbacks.onDone?.();
      
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
  private async processLine(
    line: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (!line || line.startsWith(":")) return;
    
    if (!line.startsWith("data: ")) return;
    
    const data = line.slice(6).trim();
    
    if (data === "[DONE]") {
      return;
    }
    
    try {
      const chunk: CompletionChunk = JSON.parse(data);
      callbacks.onChunk?.(chunk);
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        callbacks.onContent?.(delta.content);
      }
      if (delta?.reasoning) {
        callbacks.onReasoning?.(delta.reasoning);
      }
    } catch (error) {
      console.warn("Failed to parse chunk:", line);
    }
  }
  public async *createIterator(
    options: CreateCompletionOptions
  ): AsyncGenerator<CompletionChunk, void, unknown> {
    if (!options.stream) {
      throw new Error("createIterator requires stream: true");
    }

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
          if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data: ")) continue;
          
          const data = trimmed.slice(6).trim();
          if (data === "[DONE]") return;
          
          try {
            const chunk: CompletionChunk = JSON.parse(data);
            yield chunk;
          } catch {
          }
        }
      }
      
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6).trim();
          if (data !== "[DONE]") {
            try {
              const chunk: CompletionChunk = JSON.parse(data);
              yield chunk;
            } catch {
            }
          }
        }
      }
      
    } finally {
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
  private readonly apiKey: string;
  private readonly baseUrl: string;
  public readonly chat: Chat;

  public constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl ?? "https://api.routeway.ai";
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