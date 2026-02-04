"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
class Completions {
    constructor(apiKey, baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async create(options) {
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
            throw new Error(`Failed to fetch completion (${response.status}): ${errorText}`);
        }
        return response.json();
    }
}
class Chat {
    constructor(apiKey, baseUrl) {
        this.completions = new Completions(apiKey, baseUrl);
    }
}
class Client {
    constructor(apiKey, baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl ?? "https://api.routeway.ai";
        this.chat = new Chat(this.apiKey, this.baseUrl);
    }
    async models() {
        const endpoint = "v1/models";
        const url = `${this.baseUrl}/${endpoint}`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch models (${response.status}): ${errorText}`);
        }
        return response.json();
    }
}
exports.Client = Client;
