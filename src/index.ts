interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
}

interface CompletionResponse {
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
    logprobs: string;
    finish_reason: string;
  }[];
}

interface Model {
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

interface ModelResponse {
  object: string;
  data: Model[];
}

class Completions {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  public constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  public async create(
    messages: ChatMessage[],
    model = "chatgpt-4o-latest"
  ): Promise<CompletionResponse> {
    const endpoint = "v1/chat/completions";
    const url = `${this.baseUrl}/${endpoint}`;
    const playload: CompletionRequest = { model, messages };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(playload),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch completion: ${response.statusText}`);
    }
    return response.json() as unknown as CompletionResponse;
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

  public async modelsPromise<ModelResponse> {
    const endpoint = "v1/models";
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    return response.json() as unknown as ModelResponse;
  }
}
