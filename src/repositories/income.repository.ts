import { createClient } from '@/lib/supabase/server';
import { Income, CreateIncomeDTO, UpdateIncomeDTO, RecurringIncomeSchedule, CreateRecurringScheduleDTO, UpdateRecurringScheduleDTO } from '@/models/income.model';
import { Database } from '@/types/database.types';

type DBIncome = Database['public']['Tables']['incomes']['Row'];
type DBSchedule = Database['public']['Tables']['recurring_income_schedules']['Row'];

export class IncomeRepository {
  // Incomes Operations
  async findAll(
    userId: string,
    filters?: {
      search?: string;
      category?: string;
      source?: string;
      month?: string; // YYYY-MM
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: Income[]; total: number }> {
    const supabase = await createClient();
    let query = supabase
      .from('incomes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,category.ilike.%${filters.search}%,source.ilike.%${filters.search}%,payer.ilike.%${filters.search}%`);
    }

    if (filters?.month) {
      const parts = filters.month.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const startDate = `${filters.month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
    }

    if (filters?.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }

    query = query.order('transaction_date', { ascending: false }).order('created_at', { ascending: false });

    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      data: (data || []).map((e) => this.mapIncomeToDomain(e)),
      total: count || 0,
    };
  }

  async findById(id: string, userId: string): Promise<Income | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return this.mapIncomeToDomain(data);
  }

  async create(userId: string, income: CreateIncomeDTO): Promise<Income> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('incomes')
      .insert({
        user_id: userId,
        amount: income.amount,
        currency: income.currency,
        category: income.category,
        description: income.description || null,
        payer: income.payer || null,
        source: income.source || 'MANUAL',
        recurring: income.recurring || false,
        recurring_schedule_id: income.recurringScheduleId || null,
        transaction_date: income.transactionDate,
        sms_id: income.smsId || null,
        sender_id: income.senderId || null,
        payment_method: income.paymentMethod || null,
        account_reference: income.accountReference || null,
        transaction_time: income.transactionTime || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapIncomeToDomain(data);
  }

  async update(id: string, userId: string, income: UpdateIncomeDTO): Promise<Income> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('incomes')
      .update({
        amount: income.amount,
        currency: income.currency,
        category: income.category,
        description: income.description,
        payer: income.payer,
        source: income.source,
        recurring: income.recurring,
        recurring_schedule_id: income.recurringScheduleId,
        transaction_date: income.transactionDate,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapIncomeToDomain(data);
  }

  async delete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  async checkDuplicate(userId: string, payer: string, amount: number, date: string, source: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('incomes')
      .select('id')
      .eq('user_id', userId)
      .eq('payer', payer)
      .eq('amount', amount)
      .eq('transaction_date', date)
      .eq('source', source)
      .limit(1);

    if (error) throw new Error(error.message);
    return (data || []).length > 0;
  }

  // Schedules Operations
  async findAllSchedules(userId: string): Promise<RecurringIncomeSchedule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_income_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((s) => this.mapScheduleToDomain(s));
  }

  async findActiveSchedules(): Promise<RecurringIncomeSchedule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_income_schedules')
      .select('*')
      .eq('active', true);

    if (error) throw new Error(error.message);
    return (data || []).map((s) => this.mapScheduleToDomain(s));
  }

  async findScheduleById(id: string, userId: string): Promise<RecurringIncomeSchedule | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_income_schedules')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return this.mapScheduleToDomain(data);
  }

  async createSchedule(userId: string, schedule: CreateRecurringScheduleDTO & { nextExecutionDate: string }): Promise<RecurringIncomeSchedule> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_income_schedules')
      .insert({
        user_id: userId,
        amount: schedule.amount,
        currency: schedule.currency,
        category: schedule.category,
        payer: schedule.payer || null,
        frequency: schedule.frequency,
        start_date: schedule.startDate,
        end_date: schedule.endDate || null,
        next_execution_date: schedule.nextExecutionDate,
        active: true,
        description: schedule.description || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapScheduleToDomain(data);
  }

  async updateSchedule(id: string, userId: string, schedule: UpdateRecurringScheduleDTO & { nextExecutionDate?: string }): Promise<RecurringIncomeSchedule> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recurring_income_schedules')
      .update({
        amount: schedule.amount,
        currency: schedule.currency,
        category: schedule.category,
        payer: schedule.payer,
        frequency: schedule.frequency,
        start_date: schedule.startDate,
        end_date: schedule.endDate,
        next_execution_date: schedule.nextExecutionDate,
        active: schedule.active,
        description: schedule.description,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapScheduleToDomain(data);
  }

  async deleteSchedule(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('recurring_income_schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  // Mapping Helpers
  private mapIncomeToDomain(dbRecord: DBIncome): Income {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      amount: Number(dbRecord.amount),
      currency: dbRecord.currency,
      category: dbRecord.category,
      description: dbRecord.description,
      payer: dbRecord.payer,
      source: dbRecord.source as Income['source'],
      recurring: !!dbRecord.recurring,
      recurringScheduleId: dbRecord.recurring_schedule_id,
      transactionDate: dbRecord.transaction_date,
      smsId: dbRecord.sms_id,
      senderId: dbRecord.sender_id,
      paymentMethod: dbRecord.payment_method,
      accountReference: dbRecord.account_reference,
      transactionTime: dbRecord.transaction_time,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }

  private mapScheduleToDomain(dbRecord: DBSchedule): RecurringIncomeSchedule {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      amount: Number(dbRecord.amount),
      currency: dbRecord.currency,
      category: dbRecord.category,
      payer: dbRecord.payer,
      frequency: dbRecord.frequency as RecurringIncomeSchedule['frequency'],
      startDate: dbRecord.start_date,
      endDate: dbRecord.end_date,
      nextExecutionDate: dbRecord.next_execution_date,
      active: !!dbRecord.active,
      description: dbRecord.description,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}

export const incomeRepository = new IncomeRepository();
