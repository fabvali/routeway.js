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

declare class Completions {
    private readonly apiKey;
    private readonly baseUrl;
    constructor(apiKey: string, baseUrl: string);
    create(options: CreateCompletionOptions): Promise<CompletionResponse>;
}

declare class Chat {
    readonly completions: Completions;
    constructor(apiKey: string, baseUrl: string);
}

export declare class Client {
    private readonly apiKey;
    private readonly baseUrl;
    readonly chat: Chat;
    constructor(apiKey: string, baseUrl?: string);
    models(): Promise<ModelResponse>;
}
