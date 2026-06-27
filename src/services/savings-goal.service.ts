import { savingsGoalRepository } from '@/repositories/savings-goal.repository';
import { goalAllocationRepository } from '@/repositories/goal-allocation.repository';
import { SavingsGoal, CreateSavingsGoalDTO, UpdateSavingsGoalDTO } from '@/models/savings-goal.model';

export interface SavingsGoalWithPercent extends SavingsGoal {
  completionPercentage: number;
}

export class SavingsGoalService {
  async getSavingsGoals(userId: string): Promise<SavingsGoalWithPercent[]> {
    const goals = await savingsGoalRepository.findAll(userId);
    const goalsWithAllocations = await Promise.all(
      goals.map(async (g) => {
        const allocations = await goalAllocationRepository.findAllByGoalId(g.id);
        const currentAmount = (g.currentAmount || 0) + allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
        const completionPercentage = g.targetAmount > 0 ? Math.round((currentAmount / g.targetAmount) * 100) : 0;
        return {
          ...g,
          currentAmount,
          completionPercentage,
        };
      })
    );
    return goalsWithAllocations;
  }

  async createSavingsGoal(userId: string, dto: CreateSavingsGoalDTO): Promise<SavingsGoal> {
    return savingsGoalRepository.create(userId, dto);
  }

  async updateSavingsGoal(id: string, userId: string, dto: UpdateSavingsGoalDTO): Promise<SavingsGoal> {
    return savingsGoalRepository.update(id, userId, dto);
  }

  async deleteSavingsGoal(id: string, userId: string): Promise<void> {
    await goalAllocationRepository.deleteByGoalId(id);
    return savingsGoalRepository.delete(id, userId);
  }
}

export const savingsGoalService = new SavingsGoalService();
