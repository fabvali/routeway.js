# Routeway.js

> A modern TypeScript/JavaScript wrapper for the [Routeway API](https://routeway.ai)

## Features

- **Full TypeScript Support** - Complete type definitions
- **OpenAI-Compatible API** - Drop-in replacement for OpenAI SDK
- **Chat Completions** - Non-streaming and streaming responses
- **Reasoning Models** - Support for DeepSeek-R1 with reasoning traces
- **Model Management** - List available models

## Installation

```bash
npm install routeway.js
```

## Quick Start

```typescript
import { Client } from 'routeway.js';

const client = new Client(process.env.ROUTEWAY_API_KEY!);

const response = await client.chat.completions.create({
  model: 'deepseek-v3.2',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);
```

## Examples

Explore complete examples in the [`examples/`](./examples) directory:

- **[Basic Chat](./examples/basic-chat.ts)** - Simple non-streaming chat completion
- **[Streaming Chat](./examples/streaming-chat.ts)** - Real-time streaming responses
- **[Reasoning Model](./examples/reasoning-model.ts)** - DeepSeek-R1 with reasoning traces

## Usage

### Basic Chat Completion

```typescript
import { Client } from 'routeway.js';

const client = new Client(process.env.ROUTEWAY_API_KEY!);

const response = await client.chat.completions.create({
  model: 'deepseek-v3.2',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing.' }
  ],
  temperature: 0.7,
  max_tokens: 500
});

console.log(response.choices[0].message.content);
```

### Streaming Responses

```typescript
await (client.chat.completions.create as any)(
  {
    model: 'deepseek-v3.2',
    messages: [{ role: 'user', content: 'Tell me a story.' }],
    stream: true
  },
  {
    onContent: (content: string) => {
      process.stdout.write(content);
    },
    onDone: () => console.log('\nComplete.'),
    onError: (error: Error) => console.error(error)
  }
);
```

### Reasoning Models (DeepSeek-R1)

```typescript
await (client.chat.completions.create as any)(
  {
    model: 'deepseek-r1-0528',
    messages: [{ role: 'user', content: 'Solve 127 * 384' }],
    stream: true
  },
  {
    onReasoning: (reasoning: string) => {
      console.log('[Thinking]:', reasoning);
    },
    onContent: (content: string) => {
      process.stdout.write(content);
    }
  }
);
```

### List Available Models

```typescript
const models = await client.models();
models.data.forEach(model => {
  console.log(`${model.id} (${model.type})`);
});
```

## API Reference

### Client

```typescript
const client = new Client(apiKey: string);
```

### Chat Completions

```typescript
await client.chat.completions.create({
  model: string;
  messages: Array<{role: string; content: string}>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
});
```

### Models

```typescript
await client.models();
```

## License

MIT © [fabvali](https://github.com/fabvali)
*this npm package is a renewal and remake of the old clashai one made by verleihernix*

## Links

- [Routeway API](https://routeway.ai)
- [GitHub](https://github.com/fabvali/routeway.js)

<h3 align="center">☕ Support My Work</h3>
<div align="center">
  <a href="https://ko-fi.com/nevika">
    <img src="https://img.shields.io/badge/Ko--fi-Support%20Me%20%E2%98%95%EF%B8%8F-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Support me on Ko-fi" height="40">
  </a>
</div>
