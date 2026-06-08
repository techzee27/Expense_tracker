import { transactionRepository } from '@/repositories/transaction.repository';
import { CreateTransactionDTO, Transaction } from '@/models/transaction.model';

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  recentTransactions: Transaction[];
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export class TransactionService {
  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const transactions = await transactionRepository.findAll(userId);

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }));

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      recentTransactions: transactions.slice(0, 5),
      categoryBreakdown: categoryBreakdown.sort((a, b) => b.amount - a.amount),
    };
  }

  async addTransaction(userId: string, dto: CreateTransactionDTO): Promise<Transaction> {
    // Here we can put business rules: e.g., budgeting warnings, block negative values, etc.
    return transactionRepository.create(userId, dto);
  }

  async deleteTransaction(id: string, userId: string): Promise<void> {
    return transactionRepository.delete(id, userId);
  }
}

export const transactionService = new TransactionService();
