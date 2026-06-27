import { incomeRepository } from '@/repositories/income.repository';
import { Income, CreateIncomeDTO, UpdateIncomeDTO, RecurringIncomeSchedule, CreateRecurringScheduleDTO, UpdateRecurringScheduleDTO, RecurringFrequency } from '@/models/income.model';
import { currencyService } from '@/services/currency.service';
import { profileRepository } from '@/repositories/profile.repository';
import { SupportedCurrency } from '@/models/currency.model';

export interface IncomeAnalyticsSummary {
  totalIncome: number;
  monthlyIncome: number;
  recurringIncome: number;
  oneTimeIncome: number;
  highestIncomeCategory: { category: string; amount: number } | null;
  incomeTrend: { month: string; amount: number }[];
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  sourceBreakdown: { source: string; amount: number; percentage: number }[];
}

export class IncomeService {
  /**
   * Fetch incomes, processing recurring rules first to ensure up-to-date data
   */
  async getIncomes(
    userId: string,
    filters?: {
      search?: string;
      category?: string;
      source?: string;
      month?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ incomes: Income[]; total: number; page: number; limit: number }> {
    // Process recurring schedules first
    await this.processRecurringIncomeSchedules(userId);

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;

    const { data, total } = await incomeRepository.findAll(userId, {
      ...filters,
      page,
      limit,
    });

    const converted = await this.getConvertedIncomes(userId, data);

    return {
      incomes: converted,
      total,
      page,
      limit,
    };
  }

  async getIncomeById(id: string, userId: string): Promise<Income | null> {
    const income = await incomeRepository.findById(id, userId);
    if (!income) return null;
    const converted = await this.getConvertedIncomes(userId, [income]);
    return converted[0];
  }

  async createIncome(userId: string, dto: CreateIncomeDTO): Promise<Income> {
    return incomeRepository.create(userId, dto);
  }

  async updateIncome(id: string, userId: string, dto: UpdateIncomeDTO): Promise<Income> {
    return incomeRepository.update(id, userId, dto);
  }

  async deleteIncome(id: string, userId: string): Promise<void> {
    return incomeRepository.delete(id, userId);
  }

  // Schedules Management
  async getSchedules(userId: string): Promise<RecurringIncomeSchedule[]> {
    return incomeRepository.findAllSchedules(userId);
  }

  async createSchedule(userId: string, dto: CreateRecurringScheduleDTO): Promise<RecurringIncomeSchedule> {
    // Start date acts as initial next execution date
    const nextExecutionDate = dto.startDate;
    const schedule = await incomeRepository.createSchedule(userId, {
      ...dto,
      nextExecutionDate,
    });

    // Auto-process to generate transactions right away if the start date is today or in the past
    await this.processRecurringIncomeSchedules(userId);
    return schedule;
  }

  async updateSchedule(id: string, userId: string, dto: UpdateRecurringScheduleDTO): Promise<RecurringIncomeSchedule> {
    const existing = await incomeRepository.findScheduleById(id, userId);
    if (!existing) throw new Error('Recurring schedule not found');

    const updatePayload: any = { ...dto };
    if (dto.startDate && dto.startDate !== existing.startDate) {
      // Reset next execution if start date changes and it has not executed yet
      updatePayload.nextExecutionDate = dto.startDate;
    }

    const updated = await incomeRepository.updateSchedule(id, userId, updatePayload);
    await this.processRecurringIncomeSchedules(userId);
    return updated;
  }

  async deleteSchedule(id: string, userId: string): Promise<void> {
    return incomeRepository.deleteSchedule(id, userId);
  }

  async setScheduleActive(id: string, userId: string, active: boolean): Promise<RecurringIncomeSchedule> {
    return incomeRepository.updateSchedule(id, userId, { active });
  }

  /**
   * Automatic recurring income transaction generator
   */
  async processRecurringIncomeSchedules(userId: string): Promise<void> {
    try {
      const schedules = await incomeRepository.findAllSchedules(userId);
      const activeSchedules = schedules.filter(s => s.active);
      const todayStr = new Date().toISOString().split('T')[0];

      for (const schedule of activeSchedules) {
        let nextExec = schedule.nextExecutionDate;
        let scheduleActive = schedule.active;

        while (nextExec <= todayStr && scheduleActive) {
          // Check end date bounds
          if (schedule.endDate && nextExec > schedule.endDate) {
            scheduleActive = false;
            break;
          }

          // Create the income transaction
          await incomeRepository.create(userId, {
            amount: schedule.amount,
            currency: schedule.currency,
            category: schedule.category,
            description: `Recurring payment: ${schedule.description || schedule.category}`,
            payer: schedule.payer,
            source: 'MANUAL',
            recurring: true,
            recurringScheduleId: schedule.id,
            transactionDate: nextExec,
          });

          // Calculate next date
          nextExec = this.getNextDateString(nextExec, schedule.frequency);
        }

        // Save new state back to the schedule
        if (nextExec !== schedule.nextExecutionDate || scheduleActive !== schedule.active) {
          await incomeRepository.updateSchedule(schedule.id, userId, {
            active: scheduleActive,
            nextExecutionDate: nextExec
          } as any);
        }
      }
    } catch (err) {
      console.error('Error generating recurring incomes:', err);
    }
  }

  /**
   * Get formatted analytics summary for Incomes
   */
  async getIncomeAnalytics(userId: string): Promise<IncomeAnalyticsSummary> {
    await this.processRecurringIncomeSchedules(userId);
    
    const { data: allIncomes } = await incomeRepository.findAll(userId);
    const profile = await profileRepository.findById(userId);
    const preferredCurrency = (profile?.currency || 'USD') as SupportedCurrency;
    
    // Convert all amounts to target currency for aggregation
    const ratesResult = await currencyService.getLatestRates(preferredCurrency);
    const incomes = allIncomes.map((inc) => {
      let amount = inc.amount;
      if (inc.currency !== preferredCurrency) {
        const rateToTarget = ratesResult.rates[inc.currency as SupportedCurrency];
        if (rateToTarget !== undefined && rateToTarget > 0) {
          amount = Number((inc.amount / rateToTarget).toFixed(2));
        }
      }
      return { ...inc, convertedAmount: amount };
    });

    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM

    let totalIncome = 0;
    let monthlyIncome = 0;
    let recurringIncome = 0;
    let oneTimeIncome = 0;

    const categoryTotals: Record<string, number> = {};
    const sourceTotals: Record<string, number> = {};
    const trendTotals: Record<string, number> = {};

    incomes.forEach((inc) => {
      totalIncome += inc.convertedAmount;

      if (inc.transactionDate.startsWith(currentMonthStr)) {
        monthlyIncome += inc.convertedAmount;
      }

      if (inc.recurring) {
        recurringIncome += inc.convertedAmount;
      } else {
        oneTimeIncome += inc.convertedAmount;
      }

      categoryTotals[inc.category] = (categoryTotals[inc.category] || 0) + inc.convertedAmount;
      sourceTotals[inc.source] = (sourceTotals[inc.source] || 0) + inc.convertedAmount;

      // Group trends by YYYY-MM
      const mKey = inc.transactionDate.slice(0, 7);
      trendTotals[mKey] = (trendTotals[mKey] || 0) + inc.convertedAmount;
    });

    // Highest Income Category
    let highestCat: { category: string; amount: number } | null = null;
    Object.entries(categoryTotals).forEach(([category, amount]) => {
      if (!highestCat || amount > highestCat.amount) {
        highestCat = { category, amount };
      }
    });

    // Sort trends chronologically
    const incomeTrend = Object.entries(trendTotals)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months

    // Category breakdown
    const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // Source breakdown
    const sourceBreakdown = Object.entries(sourceTotals).map(([source, amount]) => ({
      source,
      amount,
      percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      monthlyIncome,
      recurringIncome,
      oneTimeIncome,
      highestIncomeCategory: highestCat,
      incomeTrend,
      categoryBreakdown,
      sourceBreakdown,
    };
  }

  // Date Math Helper
  private getNextDateString(currentDateStr: string, frequency: RecurringFrequency): string {
    const current = new Date(currentDateStr);
    switch (frequency) {
      case 'DAILY':
        current.setDate(current.getDate() + 1);
        break;
      case 'WEEKLY':
        current.setDate(current.getDate() + 7);
        break;
      case 'MONTHLY':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'QUARTERLY':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'YEARLY':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
    return current.toISOString().split('T')[0];
  }

  async getExpectedMonthlyIncome(userId: string): Promise<{ expectedIncome: number; receivedIncome: number; remainingExpected: number }> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const { data: allIncomes } = await incomeRepository.findAll(userId, { month: currentMonth, limit: 1000 });
    
    const profile = await profileRepository.findById(userId);
    const preferredCurrency = (profile?.currency || 'USD') as SupportedCurrency;
    const ratesResult = await currencyService.getLatestRates(preferredCurrency);

    const convertAmount = (amount: number, fromCurrency: string) => {
      if (fromCurrency === preferredCurrency) return amount;
      const rateToTarget = ratesResult.rates[fromCurrency as SupportedCurrency];
      if (rateToTarget !== undefined && rateToTarget > 0) {
        return Number((amount / rateToTarget).toFixed(2));
      }
      return amount;
    };

    const todayStr = new Date().toISOString().split('T')[0];
    let receivedIncome = 0;
    let remainingIncomeFromIncomes = 0;
    allIncomes.forEach((inc) => {
      if (inc.transactionDate <= todayStr) {
        receivedIncome += convertAmount(inc.amount, inc.currency);
      } else {
        remainingIncomeFromIncomes += convertAmount(inc.amount, inc.currency);
      }
    });

    let remainingExpected = 0;
    const schedules = await incomeRepository.findAllSchedules(userId);
    const activeSchedules = schedules.filter((s) => s.active);

    activeSchedules.forEach((schedule) => {
      let nextExec = schedule.nextExecutionDate;
      while (nextExec < todayStr) {
        nextExec = this.getNextDateString(nextExec, schedule.frequency);
      }
      let currentDateStr = nextExec;
      while (currentDateStr.startsWith(currentMonth)) {
        if (schedule.endDate && currentDateStr > schedule.endDate) {
          break;
        }
        remainingExpected += convertAmount(schedule.amount, schedule.currency);
        currentDateStr = this.getNextDateString(currentDateStr, schedule.frequency);
      }
    });

    const totalRemainingExpected = remainingExpected + remainingIncomeFromIncomes;
    const profileMonthlyIncome = profile?.monthlyIncome || 0;
    const expectedFromSchedules = receivedIncome + totalRemainingExpected;
    const expectedIncome = Math.max(profileMonthlyIncome, expectedFromSchedules);
    const finalRemainingExpected = Math.max(totalRemainingExpected, expectedIncome - receivedIncome);

    return {
      expectedIncome,
      receivedIncome,
      remainingExpected: finalRemainingExpected,
    };
  }

  // Display Currencies Converter Helper
  private async getConvertedIncomes(userId: string, incomes: Income[]): Promise<Income[]> {
    if (incomes.length === 0) return [];
    const profile = await profileRepository.findById(userId);
    const preferredCurrency = (profile?.currency || 'USD') as SupportedCurrency;

    try {
      const ratesResult = await currencyService.getLatestRates(preferredCurrency);
      return incomes.map((inc) => {
        if (inc.currency === preferredCurrency) return inc;
        const rateToTarget = ratesResult.rates[inc.currency as SupportedCurrency];
        if (rateToTarget !== undefined && rateToTarget > 0) {
          return {
            ...inc,
            amount: Number((inc.amount / rateToTarget).toFixed(2)),
            currency: preferredCurrency
          };
        }
        return inc;
      });
    } catch (err) {
      console.error('Failed to convert incomes currencies:', err);
      return incomes;
    }
  }
}

export const incomeService = new IncomeService();
