import { createClient } from '@/lib/supabase/server';
import { SavingsGoal, CreateSavingsGoalDTO, UpdateSavingsGoalDTO } from '@/models/savings-goal.model';
import { Database } from '@/types/database.types';

type DBSavingsGoal = Database['public']['Tables']['savings_goals']['Row'];

export class SavingsGoalRepository {
  async findAll(userId: string): Promise<SavingsGoal[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((sg) => this.mapToDomain(sg));
  }

  async create(userId: string, goal: CreateSavingsGoalDTO): Promise<SavingsGoal> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        user_id: userId,
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        target_date: goal.targetDate || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data);
  }

  async update(id: string, userId: string, goal: UpdateSavingsGoalDTO): Promise<SavingsGoal> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('savings_goals')
      .update({
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        target_date: goal.targetDate,
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
      .from('savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private mapToDomain(dbRecord: DBSavingsGoal): SavingsGoal {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      name: dbRecord.name,
      targetAmount: Number(dbRecord.target_amount),
      currentAmount: Number(dbRecord.current_amount),
      targetDate: dbRecord.target_date,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}

export const savingsGoalRepository = new SavingsGoalRepository();
