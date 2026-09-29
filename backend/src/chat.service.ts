import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatService {
  private readonly model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  async send(messages: ChatCompletionMessage[]): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured on the server.',
      );
    }
    if (!messages || messages.length === 0) {
      throw new BadRequestException('Messages are required.');
    }

    const systemPrompt =
      process.env.CHAT_SYSTEM_PROMPT ||
      [
        'You are the helpful AI assistant for the Mall Management Information System (SIM Mall).',
        'Answer questions only about the mall: its tenants, facilities, parking, opening hours, directions, events, and promotions.',
        'If a question is unrelated to the mall, politely redirect the user back to mall topics.',
        'Be concise, friendly, and respond in the same language as the user (Indonesian if the user writes in Indonesian).',
      ].join(' ');

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
    };

    let res: Response;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ServiceUnavailableException('Unable to reach the Groq API.');
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 429) {
        throw new ServiceUnavailableException('AI service is busy. Please try again shortly.');
      }
      throw new ServiceUnavailableException(`AI service error (${res.status}): ${text}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableException('AI service returned an empty response.');
    }
    return content;
  }
}
