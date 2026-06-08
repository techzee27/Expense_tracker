import { savingsGoalRepository } from '@/repositories/savings-goal.repository';
import { SavingsGoal, CreateSavingsGoalDTO, UpdateSavingsGoalDTO } from '@/models/savings-goal.model';

export interface SavingsGoalWithPercent extends SavingsGoal {
  completionPercentage: number;
}

export class SavingsGoalService {
  async getSavingsGoals(userId: string): Promise<SavingsGoalWithPercent[]> {
    const goals = await savingsGoalRepository.findAll(userId);
    return goals.map((g) => {
      const completionPercentage = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
      return {
        ...g,
        completionPercentage,
      };
    });
  }

  async createSavingsGoal(userId: string, dto: CreateSavingsGoalDTO): Promise<SavingsGoal> {
    return savingsGoalRepository.create(userId, dto);
  }

  async updateSavingsGoal(id: string, userId: string, dto: UpdateSavingsGoalDTO): Promise<SavingsGoal> {
    return savingsGoalRepository.update(id, userId, dto);
  }

  async deleteSavingsGoal(id: string, userId: string): Promise<void> {
    return savingsGoalRepository.delete(id, userId);
  }
}

export const savingsGoalService = new SavingsGoalService();
