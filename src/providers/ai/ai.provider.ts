import type { AIChatRequest, AIChatResponse, AIMessage } from '@/types/domain';
import {
  buildLocationAwareReply,
  executeTravelTools,
  summarizeToolResults,
} from '@/services/ai/tool-executor';

export interface AIProvider {
  readonly name: string;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
}

function createAssistantMessage(content: string): AIMessage {
  return {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content,
    createdAt: new Date().toISOString(),
  };
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock-ai';

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const toolResults = await executeTravelTools(request);
    const toolSummary = summarizeToolResults(toolResults);
    const mode = request.mode ?? 'ask';
    const locationLabel =
      (typeof request.context?.label === 'string' && request.context.label) || 'your area';

    return {
      message: createAssistantMessage(buildLocationAwareReply(mode, toolSummary, locationLabel)),
      toolCalls: toolResults.map((item) => ({ name: item.name, arguments: {} })),
      toolResults,
      isMock: true,
    };
  }
}
