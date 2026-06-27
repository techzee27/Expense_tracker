import { groqService, GroqMessage } from './groq.service';
import { createClient } from '@/lib/supabase/server';

export type TaskComplexity = 'SIMPLE' | 'MEDIUM' | 'COMPLEX';

export interface CascadeflowOptions {
  taskType: string;
  complexity: TaskComplexity;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface CascadeflowResult {
  content: string;
  modelUsed: string;
  latencyMs: number;
  cost: number;
}

export class CascadeflowService {
  // Model mapping
  private models = {
    SIMPLE: 'llama-3.1-8b-instant',
    MEDIUM: 'llama-3.3-70b-versatile',
    COMPLEX: 'llama-3.3-70b-versatile',
  };

  // Pricing per 1M tokens in USD
  private pricing = {
    'llama-3.1-8b-instant': { prompt: 0.05, completion: 0.08 },
    'llama-3.3-70b-versatile': { prompt: 0.59, completion: 0.79 },
  };

  /**
   * Main entry point for executing AI queries through cascadeflow
   */
  async execute(
    userId: string,
    messages: GroqMessage[],
    options: CascadeflowOptions
  ): Promise<CascadeflowResult> {
    const startTime = Date.now();
    let model = this.models[options.complexity];
    let attempts = 0;
    const maxAttempts = 2;
    let lastError: Error | null = null;
    let content = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let latencyMs = 0;

    // Speculative escalation logic: if a request is marked as simple but fails, we try again with balanced model.
    while (attempts < maxAttempts) {
      attempts++;
      try {
        // Enforce a strict 15-second timeout for the LLM request
        const response = await this.withTimeout(
          groqService.getChatCompletion(messages, {
            model,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            json_mode: options.jsonMode,
          }),
          15000 // 15 seconds
        );

        content = response.content;
        promptTokens = response.promptTokens;
        completionTokens = response.completionTokens;
        latencyMs = response.latencyMs;
        break; // Success! Break retry loop
      } catch (err: any) {
        lastError = err;
        console.warn(`Cascadeflow attempt ${attempts} failed for model ${model}:`, err.message || err);
        
        // Auto-escalate to balanced model if lightweight fails
        if (options.complexity === 'SIMPLE' && model === this.models.SIMPLE) {
          console.log(`Escalating task from ${this.models.SIMPLE} to ${this.models.MEDIUM} due to failure.`);
          model = this.models.MEDIUM;
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    // Calculate Estimated Cost
    const modelPricing = this.pricing[model as keyof typeof this.pricing] || { prompt: 0, completion: 0 };
    const cost = (promptTokens / 1_000_000) * modelPricing.prompt + 
                 (completionTokens / 1_000_000) * modelPricing.completion;

    const success = content.length > 0;

    // Log the AI Decision Audit Trail
    await this.logAuditRecord(userId, {
      taskType: options.taskType,
      selectedModel: model,
      reasonForSelection: `Routed dynamically as complexity: ${options.complexity}. Attempt: ${attempts}. Reason: Budget/Cost optimization.`,
      latencyMs: totalDuration,
      promptTokens,
      completionTokens,
      estimatedCost: cost,
      success,
      errorMessage: success ? null : lastError?.message || 'Empty response content',
    });

    if (!success) {
      throw lastError || new Error('Cascadeflow execution failed to produce a valid response.');
    }

    return {
      content,
      modelUsed: model,
      latencyMs: totalDuration,
      cost,
    };
  }

  /**
   * Timeout wrapper helper
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`LLM Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Save audit record in supabase database
   */
  private async logAuditRecord(
    userId: string,
    record: {
      taskType: string;
      selectedModel: string;
      reasonForSelection: string;
      latencyMs: number;
      promptTokens: number;
      completionTokens: number;
      estimatedCost: number;
      success: boolean;
      errorMessage: string | null;
    }
  ) {
    try {
      const supabase = await createClient();
      await supabase.from('ai_audit_logs').insert({
        user_id: userId,
        task_type: record.taskType,
        selected_model: record.selectedModel,
        reason_for_selection: record.reasonForSelection,
        latency_ms: record.latencyMs,
        prompt_tokens: record.promptTokens,
        completion_tokens: record.completionTokens,
        estimated_cost: record.estimatedCost,
        success: record.success,
        error_message: record.errorMessage,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to save AI audit record:', err);
    }
  }
}

export const cascadeflowService = new CascadeflowService();
