export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
  json_mode?: boolean;
}

export interface GroqCompletionResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
  }

  async getChatCompletion(
    messages: GroqMessage[],
    options: GroqCompletionOptions
  ): Promise<GroqCompletionResponse> {
    if (!this.apiKey) {
      console.warn('GROQ_API_KEY is not set. Falling back to mock completion.');
      return this.getMockCompletion(messages, options.model);
    }

    const startTime = Date.now();
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      const body: Record<string, any> = {
        model: options.model,
        messages,
        temperature: options.temperature ?? 0.1,
      };

      if (options.max_tokens) {
        body.max_tokens = options.max_tokens;
      }

      if (options.json_mode) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Groq API returned HTTP ${res.status}: ${errorBody}`);
      }

      const data = await res.json();
      const latencyMs = Date.now() - startTime;

      const content = data.choices?.[0]?.message?.content || '';
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;

      return {
        content,
        model: options.model,
        promptTokens,
        completionTokens,
        latencyMs,
      };
    } catch (err: any) {
      console.error('Groq Service error:', err);
      throw new Error(`Groq Completion Failed: ${err.message || err}`);
    }
  }

  private getMockCompletion(messages: GroqMessage[], model: string): GroqCompletionResponse {
    const userMessage = messages[messages.length - 1]?.content || '';
    const latencyMs = 250;

    let content = 'This is a mock response because no GROQ_API_KEY is configured.';
    if (userMessage.toLowerCase().includes('laptop')) {
      content = JSON.stringify({
        decision: 'Yes, but with caveats.',
        reasons: ['Your average monthly surplus is $450.', 'A $1200 laptop would deplete savings unless spread over 3 months.'],
        recommendations: ['Spread the purchase or delay by 30 days.'],
        healthScore: 78
      });
    } else if (userMessage.toLowerCase().includes('overspend') || userMessage.toLowerCase().includes('highest')) {
      content = JSON.stringify({
        summary: 'Your highest expenditure is Food ($650), which is 30% over budget.',
        insights: ['Consistently exceeds Food budget.', 'Weekend restaurant visits represent 60% of food costs.'],
        score: 65
      });
    }

    return {
      content,
      model,
      promptTokens: 100,
      completionTokens: 50,
      latencyMs,
    };
  }
}

export const groqService = new GroqService();
