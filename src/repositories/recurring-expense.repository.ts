import { createClient } from '@/lib/supabase/server';
import { RecurringExpense, CreateRecurringExpenseDTO, UpdateRecurringExpenseDTO } from '@/models/recurring-expense.model';
import { Database } from '@/types/database.types';

type DBRecurringExpense = any; // Avoid strict typings mismatch since DB schema is dynamically extended

export class RecurringExpenseRepository {
  async findAll(
    userId: string,
    filters?: {
      status?: 'ACTIVE' | 'PAUSED';
    }
  ): Promise<RecurringExpense[]> {
    const supabase = await createClient();
    let query = supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((e) => this.mapToDomain(e));
  }

  async findAllActivePending(todayStr: string): Promise<RecurringExpense[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('status', 'ACTIVE')
      .lte('next_due_date', todayStr);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((e) => this.mapToDomain(e));
  }

  async findById(id: string, userId: string): Promise<RecurringExpense | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async create(
    userId: string,
    expense: CreateRecurringExpenseDTO & {
      originalAmount: number;
      originalCurrency: string;
      exchangeRateAtEntry: number;
      convertedAmount: number;
      nextDueDate: string;
    }
  ): Promise<RecurringExpense> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({
        user_id: userId,
        amount: expense.amount,
        original_amount: expense.originalAmount,
        original_currency: expense.originalCurrency,
        exchange_rate_at_entry: expense.exchangeRateAtEntry,
        converted_amount: expense.convertedAmount,
        type: expense.type,
        category: expense.category,
        description: expense.description || null,
        merchant: expense.merchant || null,
        interval: expense.interval,
        start_date: expense.startDate,
        end_date: expense.endDate || null,
        next_due_date: expense.nextDueDate,
        status: expense.status || 'ACTIVE',
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async update(
    id: string,
    userId: string,
    expense: UpdateRecurringExpenseDTO & {
      originalAmount?: number;
      originalCurrency?: string;
      exchangeRateAtEntry?: number;
      convertedAmount?: number;
      nextDueDate?: string;
      lastProcessedDate?: string | null;
    }
  ): Promise<RecurringExpense> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({
        amount: expense.amount,
        original_amount: expense.originalAmount,
        original_currency: expense.originalCurrency,
        exchange_rate_at_entry: expense.exchangeRateAtEntry,
        converted_amount: expense.convertedAmount,
        type: expense.type,
        category: expense.category,
        description: expense.description,
        merchant: expense.merchant,
        interval: expense.interval,
        start_date: expense.startDate,
        end_date: expense.endDate,
        next_due_date: expense.nextDueDate,
        last_processed_date: expense.lastProcessedDate,
        status: expense.status,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async delete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private mapToDomain(dbRecord: any): RecurringExpense {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      amount: Number(dbRecord.amount),
      originalAmount: Number(dbRecord.original_amount !== undefined && dbRecord.original_amount !== null ? dbRecord.original_amount : dbRecord.amount),
      originalCurrency: String(dbRecord.original_currency || 'USD'),
      exchangeRateAtEntry: Number(dbRecord.exchange_rate_at_entry !== undefined && dbRecord.exchange_rate_at_entry !== null ? dbRecord.exchange_rate_at_entry : 1.0),
      convertedAmount: Number(dbRecord.converted_amount !== undefined && dbRecord.converted_amount !== null ? dbRecord.converted_amount : dbRecord.amount),
      type: dbRecord.type,
      category: dbRecord.category,
      description: dbRecord.description,
      merchant: dbRecord.merchant,
      interval: dbRecord.interval,
      startDate: dbRecord.start_date,
      endDate: dbRecord.end_date,
      nextDueDate: dbRecord.next_due_date,
      lastProcessedDate: dbRecord.last_processed_date,
      status: dbRecord.status,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}

export const recurringExpenseRepository = new RecurringExpenseRepository();
