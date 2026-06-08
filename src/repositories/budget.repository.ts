import { createClient } from '@/lib/supabase/server';
import { Budget, CreateBudgetDTO, UpdateBudgetDTO } from '@/models/budget.model';
import { Database } from '@/types/database.types';

type DBBudget = Database['public']['Tables']['budgets']['Row'];

export class BudgetRepository {
  async findAll(userId: string): Promise<Budget[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((b) => this.mapToDomain(b));
  }

  async create(userId: string, budget: CreateBudgetDTO): Promise<Budget> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        category: budget.category,
        amount: budget.amount,
        start_date: budget.startDate,
        end_date: budget.endDate,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async update(id: string, userId: string, budget: UpdateBudgetDTO): Promise<Budget> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('budgets')
      .update({
        category: budget.category,
        amount: budget.amount,
        start_date: budget.startDate,
        end_date: budget.endDate,
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
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private mapToDomain(dbRecord: DBBudget): Budget {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      category: dbRecord.category,
      amount: Number(dbRecord.amount),
      startDate: dbRecord.start_date,
      endDate: dbRecord.end_date,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}

export const budgetRepository = new BudgetRepository();
