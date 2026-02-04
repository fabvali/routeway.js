import { Client } from 'routeway.js';

const client = new Client(process.env.ROUTEWAY_API_KEY!);

async function main() {
  await (client.chat.completions.create as any)(
    {
      model: 'deepseek-r1-0528',
      messages: [
        { role: 'system', content: 'You are a mathematical reasoning assistant.' },
        { role: 'user', content: 'What is 125 * 328? Show your work.' }
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 500
    },
    {
      onReasoning: (reasoning: string) => {
        process.stdout.write(`[Thinking: ${reasoning}]`);
      },
      onContent: (content: string) => {
        process.stdout.write(content);
      },
      onDone: () => {
        console.log('\n\nComplete.');
      }
    }
  );
}

main().catch(console.error);
