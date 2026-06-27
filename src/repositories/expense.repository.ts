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
      source?: string;
      month?: string; // YYYY-MM
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      approved?: boolean;
    }
  ): Promise<{ data: Expense[]; total: number }> {
    const supabase = await createClient();
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (filters?.approved !== undefined) {
      query = query.eq('approved', filters.approved);
    } else {
      query = query.eq('approved', true);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,category.ilike.%${filters.search}%,source.ilike.%${filters.search}%,merchant.ilike.%${filters.search}%`);
    }

    if (filters?.month) {
      const parts = filters.month.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const startDate = `${filters.month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    }

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
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
        source: expense.source || 'MANUAL',
        merchant: expense.merchant || null,
        receipt_filename: expense.receiptFilename || null,
        receipt_url: expense.receiptUrl || null,
        ocr_confidence: expense.ocrConfidence || null,
        email_confidence: expense.emailConfidence || null,
        imported_at: expense.importedAt || null,
        approved: expense.approved !== undefined ? expense.approved : true,
        duplicate_flag: expense.duplicateFlag !== undefined ? expense.duplicateFlag : false,
        sms_id: expense.smsId || null,
        sender_id: expense.senderId || null,
        payment_method: expense.paymentMethod || null,
        account_reference: expense.accountReference || null,
        transaction_time: expense.transactionTime || null,
        recurring: expense.recurring !== undefined ? expense.recurring : false,
        recurring_id: expense.recurringId || null,
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
        source: expense.source,
        merchant: expense.merchant,
        receipt_filename: expense.receiptFilename,
        receipt_url: expense.receiptUrl,
        ocr_confidence: expense.ocrConfidence,
        email_confidence: expense.emailConfidence,
        imported_at: expense.importedAt,
        approved: expense.approved,
        duplicate_flag: expense.duplicateFlag,
        sms_id: expense.smsId,
        sender_id: expense.senderId,
        payment_method: expense.paymentMethod,
        account_reference: expense.accountReference,
        transaction_time: expense.transactionTime,
        recurring: expense.recurring,
        recurring_id: expense.recurringId,
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
      date: dbRecord.date,
      source: dbRecord.source || 'MANUAL',
      merchant: dbRecord.merchant,
      receiptFilename: dbRecord.receipt_filename,
      receiptUrl: dbRecord.receipt_url,
      ocrConfidence: dbRecord.ocr_confidence,
      emailConfidence: dbRecord.email_confidence,
      importedAt: dbRecord.imported_at,
      approved: !!dbRecord.approved,
      duplicateFlag: !!dbRecord.duplicate_flag,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      smsId: dbRecord.sms_id,
      senderId: dbRecord.sender_id,
      paymentMethod: dbRecord.payment_method,
      accountReference: dbRecord.account_reference,
      transactionTime: dbRecord.transaction_time,
      recurring: !!dbRecord.recurring,
      recurringId: dbRecord.recurring_id,
    };
  }

  async checkDuplicate(userId: string, merchant: string, amount: number, date: string, source: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('id')
      .eq('user_id', userId)
      .eq('merchant', merchant)
      .eq('amount', amount)
      .eq('date', date)
      .eq('source', source)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }
    return (data || []).length > 0;
  }
}

export const expenseRepository = new ExpenseRepository();
