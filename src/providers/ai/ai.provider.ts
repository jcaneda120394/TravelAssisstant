import type { AIChatRequest, AIChatResponse, AIMessage } from '@/types/domain';
import {
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

function buildPlanFromTools(mode: string, toolSummary: string): string {
  if (mode === 'planner') {
    return [
      'Suggested afternoon plan (tool-backed, mock providers):',
      '1:45 PM — Visit a nearby attraction from PlacesProvider',
      '3:15 PM — Indoor option if weather tool reports rain risk',
      '4:30 PM — Transit via TransportProvider comparison',
      '6:30 PM — Dinner area near your evening destination',
      '',
      'I will not invent live opening hours, train times, or fares. Verify before you go.',
      '',
      'Tool results used:',
      toolSummary,
    ].join('\n');
  }

  if (mode === 'emergency') {
    return [
      'Emergency assistance (from PlacesProvider tools only):',
      toolSummary,
      '',
      'Call local emergency numbers when needed. Confirm facility status before traveling.',
    ].join('\n');
  }

  return [
    `TravelAssistant AI (${mode} mode)`,
    '',
    'I used tools for factual travel data. I do not invent hotel prices, transit times, platforms, fares, weather, or eSIM prices.',
    '',
    'Tool results:',
    toolSummary,
    '',
    'Ask me to compare routes, find nearby food, check weather, or draft an itinerary.',
  ].join('\n');
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock-ai';

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const toolResults = await executeTravelTools(request);
    const toolSummary = summarizeToolResults(toolResults);
    const mode = request.mode ?? 'ask';

    return {
      message: createAssistantMessage(buildPlanFromTools(mode, toolSummary)),
      toolCalls: toolResults.map((item) => ({ name: item.name, arguments: {} })),
      toolResults,
      isMock: true,
    };
  }
}
