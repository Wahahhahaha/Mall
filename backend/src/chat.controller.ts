import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';
import type { ChatCompletionMessage } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: { messages?: ChatCompletionMessage[] }) {
    const messages = (body.messages ?? []).filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant' || m.role === 'system') &&
        typeof m.content === 'string',
    );
    if (messages.length === 0) {
      throw new BadRequestException('At least one message is required.');
    }
    const content = await this.chatService.send(messages);
    return { content };
  }
}
