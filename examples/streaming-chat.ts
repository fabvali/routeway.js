import { Client } from 'routeway.js';

const client = new Client(process.env.ROUTEWAY_API_KEY!);

async function main() {
  await (client.chat.completions.create as any)(
    {
      model: 'deepseek-v3.2',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Tell me a joke.' }
      ],
      stream: true
    },
    {
      onContent: (content: string) => {
        process.stdout.write(content);
      },
      onDone: () => {
        console.log('\n\nStream complete.');
      },
      onError: (error: Error) => {
        console.error('Stream error:', error);
      }
    }
  );
}

main().catch(console.error);
