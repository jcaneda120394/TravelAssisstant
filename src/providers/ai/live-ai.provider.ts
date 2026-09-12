import { env } from '@/config/env';
import { assertSupabase, supabase } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/errors/app-error';
import type { AIProvider } from '@/providers/ai/ai.provider';
import {
  buildLocationAwareReply,
  executeTravelTools,
  summarizeToolResults,
} from '@/services/ai/tool-executor';
import { evaluateTravelScope } from '@/services/ai/travel-scope';
import type { AIChatRequest, AIChatResponse, AIMessage } from '@/types/domain';

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

export class LiveAIProvider implements AIProvider {
  readonly name = 'live-ai';

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const scope = evaluateTravelScope(latestUserText(request));
    if (!scope.ok) {
      return {
        message: createAssistantMessage(scope.rejectionMessage),
        toolCalls: [],
        toolResults: [{ name: 'travel_scope', result: { rejected: true, reason: scope.reason } }],
        isMock: false,
      };
    }

    let toolResults: Awaited<ReturnType<typeof executeTravelTools>> = [];
    try {
      toolResults = await executeTravelTools(request);
    } catch (error) {
      toolResults = [
        {
          name: 'tools',
          result: { error: getErrorMessage(error) },
        },
      ];
    }

    const toolSummary = summarizeToolResults(toolResults);
    const mode = request.mode ?? 'ask';
    const locationLabel =
      (typeof request.context?.label === 'string' && request.context.label) ||
      (typeof request.context?.city === 'string' && request.context.city) ||
      'your area';

    if (env.isSupabaseConfigured && supabase) {
      try {
        const client = assertSupabase();
        const { data, error } = await client.functions.invoke<{
          message?: string;
          content?: string;
          error?: string;
        }>('ai-chat', {
          body: {
            messages: request.messages,
            mode,
            toolSummary,
            context: request.context,
            scope: 'travel_only',
          },
        });

        if (!error && (data?.message || data?.content)) {
          return {
            message: createAssistantMessage(data.message ?? data.content ?? ''),
            toolCalls: toolResults.map((item) => ({ name: item.name, arguments: {} })),
            toolResults,
            isMock: false,
          };
        }
      } catch {
        // Fall through to local composition when gateway is unavailable.
      }
    }

    return {
      message: createAssistantMessage(buildLocationAwareReply(mode, toolSummary, locationLabel)),
      toolCalls: toolResults.map((item) => ({ name: item.name, arguments: {} })),
      toolResults,
      isMock: false,
    };
  }
}
