import { createClient } from '@/lib/supabase/server';
import { Expense, CreateExpenseDTO, UpdateExpenseDTO } from '@/models/expense.model';
import { Database } from '@/types/database.types';

type DBExpense = Database['public']['Tables']['expenses']['Row'];

export class ExpenseRepository {
  async findAll(
    userId: string,
    filters?: {
      search?: string;
      category?: string;
      type?: 'INCOME' | 'EXPENSE';
      month?: string; // YYYY-MM
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: Expense[]; total: number }> {
    const supabase = await createClient();
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
    }

    if (filters?.month) {
      const parts = filters.month.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const startDate = `${filters.month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    }

    query = query.order('date', { ascending: false }).order('created_at', { ascending: false });

    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      data: (data || []).map((e) => this.mapToDomain(e)),
      total: count || 0,
    };
  }

  async findById(id: string, userId: string): Promise<Expense | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('expenses')
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
    expense: CreateExpenseDTO & {
      originalAmount: number;
      originalCurrency: string;
      exchangeRateAtEntry: number;
      convertedAmount: number;
    }
  ): Promise<Expense> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        amount: expense.amount,
        type: expense.type,
        category: expense.category,
        description: expense.description || null,
        date: expense.date,
        original_amount: expense.originalAmount,
        original_currency: expense.originalCurrency,
        exchange_rate_at_entry: expense.exchangeRateAtEntry,
        converted_amount: expense.convertedAmount,
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
    expense: UpdateExpenseDTO & {
      originalAmount?: number;
      originalCurrency?: string;
      exchangeRateAtEntry?: number;
      convertedAmount?: number;
    }
  ): Promise<Expense> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('expenses')
      .update({
        amount: expense.amount,
        type: expense.type,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        original_amount: expense.originalAmount,
        original_currency: expense.originalCurrency,
        exchange_rate_at_entry: expense.exchangeRateAtEntry,
        converted_amount: expense.convertedAmount,
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
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private mapToDomain(dbRecord: DBExpense): Expense {
    const record = dbRecord as any;
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      amount: Number(dbRecord.amount),
      originalAmount: Number(record.original_amount !== undefined && record.original_amount !== null ? record.original_amount : dbRecord.amount),
      originalCurrency: String(record.original_currency || 'USD'),
      exchangeRateAtEntry: Number(record.exchange_rate_at_entry !== undefined && record.exchange_rate_at_entry !== null ? record.exchange_rate_at_entry : 1.0),
      convertedAmount: Number(record.converted_amount !== undefined && record.converted_amount !== null ? record.converted_amount : dbRecord.amount),
      type: dbRecord.type,
      category: dbRecord.category,
      description: dbRecord.description,
      date: dbRecord.date,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}

export const expenseRepository = new ExpenseRepository();
