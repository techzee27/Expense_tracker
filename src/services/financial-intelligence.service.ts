import { analyticsService } from './analytics.service';
import { savingsGoalService } from './savings-goal.service';
import { hindsightService } from './hindsight.service';
import { cascadeflowService, TaskComplexity } from './cascadeflow.service';
import { createClient } from '@/lib/supabase/server';
import { currencyService } from './currency.service';

export interface FinancialContext {
  fullName: string;
  currency: string;
  monthlyIncome: number;
  totalExpenses: number;
  totalSavings: number;
  remainingBudget: number;
  topCategories: { name: string; value: number }[];
  budgetUsage: { category: string; budget: number; spent: number; usagePercent: number }[];
  savingsGoals: { name: string; targetAmount: number; currentAmount: number; completionPercentage: number }[];
  memories: any[];
  homeCurrencyCode?: string | null;
  exchangeRate?: number | null;
}

export class FinancialIntelligenceService {
  /**
   * Fetch complete financial snapshot for context injection
   */
  async getFinancialContext(userId: string): Promise<FinancialContext> {
    const supabase = await createClient();
    
    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 2. Fetch Analytics
    const analytics = await analyticsService.getAnalyticsSummary(userId);

    // 3. Fetch Savings Goals
    const goals = await savingsGoalService.getSavingsGoals(userId);

    // 4. Fetch Hindsight Memories
    const memories = await hindsightService.getAllMemories(userId);

    const homeCurrencyRaw = profile?.home_currency;
    let homeCurrencyCode: string | null = null;
    if (homeCurrencyRaw) {
      if (typeof homeCurrencyRaw === 'string') {
        try {
          homeCurrencyCode = JSON.parse(homeCurrencyRaw)?.code || null;
        } catch {}
      } else if (typeof homeCurrencyRaw === 'object') {
        homeCurrencyCode = (homeCurrencyRaw as any)?.code || null;
      }
    }
    const showHomeCurrency = profile?.show_home_currency !== false;
    const prefCurrency = profile?.preferred_currency || profile?.currency || 'USD';

    let exchangeRate: number | null = null;
    if (showHomeCurrency && homeCurrencyCode && homeCurrencyCode !== prefCurrency) {
      try {
        const ratesResult = await currencyService.getLatestRates(prefCurrency as any);
        exchangeRate = (ratesResult.rates as Record<string, number>)[homeCurrencyCode] || null;
      } catch (err) {
        console.error('Failed to fetch exchange rate for AI context', err);
      }
    }

    return {
      fullName: profile?.full_name || 'Student',
      currency: prefCurrency,
      monthlyIncome: analytics.cards.totalIncome,
      totalExpenses: analytics.cards.totalExpenses,
      totalSavings: analytics.cards.totalSavings,
      remainingBudget: analytics.cards.remainingBudget,
      topCategories: analytics.categoryDistribution,
      budgetUsage: analytics.budgetUsageTrend,
      savingsGoals: goals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount ?? 0,
        completionPercentage: g.completionPercentage,
      })),
      memories,
      homeCurrencyCode,
      exchangeRate,
    };
  }

  /**
   * Process natural language questions
   */
  async askQuestion(userId: string, question: string): Promise<{ answer: string; modelUsed?: string }> {
    const context = await this.getFinancialContext(userId);
    const qLower = question.toLowerCase();

    // PERFORMANCE OPTIMIZATION: Bypass LLM for basic queries that can be calculated/answered directly
    if (qLower.includes('biggest expense') || qLower.includes('highest spending') || qLower.includes('spend the most')) {
      if (context.topCategories.length > 0) {
        const top = context.topCategories[0];
        const valFormatted = context.exchangeRate && context.homeCurrencyCode
          ? `${context.currency} ${top.value.toFixed(2)} (≈ ${context.homeCurrencyCode} ${(top.value * context.exchangeRate).toFixed(2)})`
          : `${context.currency} ${top.value.toFixed(2)}`;
        return {
          answer: `According to your records, your highest spending category is **${top.name}** with a total of **${valFormatted}** spent.`,
        };
      }
      return { answer: 'You have not logged any expenses yet.' };
    }

    if (qLower.includes('my budget') || qLower.includes('budget limit')) {
      if (context.budgetUsage.length > 0) {
        const lines = context.budgetUsage.map(b => {
          const spentVal = context.exchangeRate && context.homeCurrencyCode
            ? `${context.currency} ${b.spent} (≈ ${context.homeCurrencyCode} ${(b.spent * context.exchangeRate).toFixed(2)})`
            : `${context.currency} ${b.spent}`;
          const budgetVal = context.exchangeRate && context.homeCurrencyCode
            ? `${context.currency} ${b.budget} (≈ ${context.homeCurrencyCode} ${(b.budget * context.exchangeRate).toFixed(2)})`
            : `${context.currency} ${b.budget}`;
          return `- **${b.category}**: ${spentVal} spent of ${budgetVal} (${b.usagePercent}% used)`;
        });
        return {
          answer: `Here is your budget usage summary:\n\n${lines.join('\n')}`,
        };
      }
      return { answer: 'You do not have any active budgets configured.' };
    }

    // Determine complexity based on keywords
    let complexity: TaskComplexity = 'MEDIUM';
    if (
      qLower.includes('predict') || 
      qLower.includes('forecast') || 
      qLower.includes('afford') || 
      qLower.includes('should i') || 
      qLower.includes('optimize')
    ) {
      complexity = 'COMPLEX';
    } else if (qLower.length < 35 && !qLower.includes('explain')) {
      complexity = 'SIMPLE';
    }

    const systemPrompt = `You are UniFinance AI, a highly capable financial intelligence agent.
You help university students budget, save, and manage cash flows.
Here is the student's current real-time financial context:
- Name: ${context.fullName}
- Monthly Income: ${context.currency} ${context.monthlyIncome}
- Total Expenses: ${context.currency} ${context.totalExpenses}
- Total Savings/Surplus: ${context.currency} ${context.totalSavings}
- Remaining Budget: ${context.currency} ${context.remainingBudget}

Budget Usage:
${JSON.stringify(context.budgetUsage, null, 2)}

Savings Goals:
${JSON.stringify(context.savingsGoals, null, 2)}

Long-Term Memories (from Hindsight memory system):
${JSON.stringify(context.memories, null, 2)}

Instructions:
1. Provide highly contextual, personalized, and actionable answers.
2. Refer to their goals, memories, and budget states.
3. Be supportive, friendly, yet direct about financial health.
4. Keep the math correct and double check limits.
5. If recommending adjustments, suggest memory hooks.
${context.exchangeRate && context.homeCurrencyCode ? `6. DUAL CURRENCY REQUIREMENT: Whenever you display, mention, or reference any monetary amounts or calculations in your response text, you MUST display them in BOTH Preferred Currency (${context.currency}) and native Home Currency (${context.homeCurrencyCode}) equivalent (using the exchange rate of 1 ${context.currency} = ${context.exchangeRate} ${context.homeCurrencyCode}, e.g. "$120 (≈ INR 9,960)"). Always use the "≈" prefix before the secondary home currency equivalent.` : ''}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question },
    ];

    const result = await cascadeflowService.execute(userId, messages, {
      taskType: 'chat',
      complexity,
    });

    return {
      answer: result.content,
      modelUsed: result.modelUsed,
    };
  }

  /**
   * Generate Monthly Financial Review report
   */
  async generateMonthlyReview(userId: string): Promise<any> {
    const context = await this.getFinancialContext(userId);

    // Check if there is insufficient historical data.
    // If the monthlyIncome is 0 and totalExpenses is 0 and no memories, we should not call the LLM or invent fake insights.
    if (context.monthlyIncome === 0 && context.totalExpenses === 0 && context.memories.length === 0) {
      return {
        insufficientData: true,
        healthScore: null,
        incomeSummary: "Continue using UniFinance to receive personalized financial insights.",
        expenseSummary: "Continue using UniFinance to receive personalized financial insights.",
        budgetPerformance: "Continue using UniFinance to receive personalized financial insights.",
        savingsPerformance: "Continue using UniFinance to receive personalized financial insights.",
        topMerchants: [],
        largestExpenseCategory: null,
        mostImprovedCategory: null,
        categoriesNeedingAttention: [],
        upcomingRisks: [],
        recommendations: []
      };
    }

    const systemPrompt = `You are UniFinance AI.
Generate a structured, professional monthly financial review report for ${context.fullName} in JSON format.
Context:
- Monthly Income: ${context.currency} ${context.monthlyIncome}
- Total Expenses: ${context.currency} ${context.totalExpenses}
- Remaining Budget: ${context.currency} ${context.remainingBudget}
- Budget Usage: ${JSON.stringify(context.budgetUsage)}
- Savings Goals: ${JSON.stringify(context.savingsGoals)}
- Hindsight Memories: ${JSON.stringify(context.memories)}
${context.exchangeRate && context.homeCurrencyCode ? `- DUAL CURRENCY RULE: Whenever you populate text fields summarizing finances (such as "incomeSummary", "expenseSummary", "budgetPerformance", "savingsPerformance", "upcomingRisks", "recommendations"), you MUST represent every single monetary value/amount in BOTH Preferred Currency (${context.currency}) and native Home Currency (${context.homeCurrencyCode}) equivalent (using the exchange rate of 1 ${context.currency} = ${context.exchangeRate} ${context.homeCurrencyCode}, e.g. "$450 (≈ INR 37,350)").` : ''}

CRITICAL RULE FOR RISKS & CRITICAL STATES:
Only populate "upcomingRisks" when a category's actual spent amount has strictly EXCEEDED its configured budget limit (meaning usagePercent > 100 in Budget Usage). If no category has exceeded its budget limit, "upcomingRisks" MUST be an empty array []. Do not flag hypothetical or potential risks for categories that are currently within budget.

You MUST respond with a JSON object containing these keys:
{
  "healthScore": 1-100 score,
  "incomeSummary": "string summary",
  "expenseSummary": "string summary",
  "budgetPerformance": "string summary",
  "savingsPerformance": "string summary",
  "topMerchants": ["Array", "of", "Merchants"],
  "largestExpenseCategory": "Category Name",
  "mostImprovedCategory": "Category Name",
  "categoriesNeedingAttention": ["Category A", "Category B"],
  "upcomingRisks": ["Risk A", "Risk B"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: 'Generate my monthly review JSON.' },
    ];

    try {
      const result = await cascadeflowService.execute(userId, messages, {
        taskType: 'monthly_review',
        complexity: 'MEDIUM',
        jsonMode: true,
      });
      return JSON.parse(result.content);
    } catch {
      return {
        insufficientData: true,
        healthScore: null,
        incomeSummary: "Continue using UniFinance to receive personalized financial insights.",
        expenseSummary: "Continue using UniFinance to receive personalized financial insights.",
        budgetPerformance: "Continue using UniFinance to receive personalized financial insights.",
        savingsPerformance: "Continue using UniFinance to receive personalized financial insights.",
        topMerchants: [],
        largestExpenseCategory: null,
        mostImprovedCategory: null,
        categoriesNeedingAttention: [],
        upcomingRisks: [],
        recommendations: []
      };
    }
  }

  /**
   * Forecast cashflows and end of month states
   */
  async getForecasts(userId: string): Promise<any> {
    const context = await this.getFinancialContext(userId);

    // If there is insufficient data (e.g. no expenses/income or less than a few records), return insufficientData true.
    if (context.monthlyIncome === 0 && context.totalExpenses === 0) {
      return {
        insufficientData: true,
        predictedEndOfMonthBalance: null,
        riskOfBudgetOverrun: false,
        overrunLikelihood: "LOW",
        savingsAchievement: "",
        futureCashFlow: "",
        forecastGraphData: []
      };
    }

    const systemPrompt = `You are UniFinance AI.
Generate a structured financial forecasting report in JSON format predicting cashflow trends for the next 30 days.
Context:
- Monthly Income: ${context.currency} ${context.monthlyIncome}
- Total Expenses: ${context.currency} ${context.totalExpenses}
- Budgets: ${JSON.stringify(context.budgetUsage)}
- Goals: ${JSON.stringify(context.savingsGoals)}
- Memories: ${JSON.stringify(context.memories)}
${context.exchangeRate && context.homeCurrencyCode ? `- DUAL CURRENCY RULE: Whenever you populate text explanation fields (such as "savingsAchievement", "futureCashFlow"), you MUST represent every single monetary value/amount in BOTH Preferred Currency (${context.currency}) and native Home Currency (${context.homeCurrencyCode}) equivalent (using the exchange rate of 1 ${context.currency} = ${context.exchangeRate} ${context.homeCurrencyCode}, e.g. "$1,200 (≈ INR 99,600)"). Note: Do NOT change the currency of numerical fields like "predictedEndOfMonthBalance" or the numbers in "forecastGraphData" which must remain only in Preferred Currency.` : ''}

You MUST respond with a JSON object containing these keys:
{
  "predictedEndOfMonthBalance": number,
  "riskOfBudgetOverrun": boolean,
  "overrunLikelihood": "LOW" | "MEDIUM" | "HIGH",
  "savingsAchievement": "string prediction",
  "futureCashFlow": "string explanation",
  "forecastGraphData": [{"day": 5, "balance": number}, {"day": 10, "balance": number}, {"day": 15, "balance": number}, {"day": 20, "balance": number}, {"day": 25, "balance": number}, {"day": 30, "balance": number}]
}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: 'Generate my 30-day forecast JSON.' },
    ];

    try {
      const result = await cascadeflowService.execute(userId, messages, {
        taskType: 'forecasting',
        complexity: 'COMPLEX',
        jsonMode: true,
      });
      return JSON.parse(result.content);
    } catch {
      return {
        insufficientData: true,
        predictedEndOfMonthBalance: null,
        riskOfBudgetOverrun: false,
        overrunLikelihood: "LOW",
        savingsAchievement: "",
        futureCashFlow: "",
        forecastGraphData: []
      };
    }
  }
}

export const financialIntelligenceService = new FinancialIntelligenceService();
