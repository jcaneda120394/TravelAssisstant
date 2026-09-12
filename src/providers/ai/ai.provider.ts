import type { AIChatRequest, AIChatResponse, AIMessage } from '@/types/domain';
import {
  buildLocationAwareReply,
  executeTravelTools,
  summarizeToolResults,
} from '@/services/ai/tool-executor';
import { evaluateTravelScope } from '@/services/ai/travel-scope';

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

function latestUserText(request: AIChatRequest): string {
  for (let i = request.messages.length - 1; i >= 0; i--) {
    const message = request.messages[i];
    if (message?.role === 'user') {
      return message.content;
    }
  }
  return '';
}

function rejectIfOutOfScope(request: AIChatRequest): AIChatResponse | null {
  const scope = evaluateTravelScope(latestUserText(request));
  if (scope.ok) return null;
  return {
    message: createAssistantMessage(scope.rejectionMessage),
    toolCalls: [],
    toolResults: [{ name: 'travel_scope', result: { rejected: true, reason: scope.reason } }],
    isMock: true,
  };
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock-ai';

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const rejected = rejectIfOutOfScope(request);
    if (rejected) return rejected;

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
