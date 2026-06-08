import { createClient } from '@/lib/supabase/server';
import { Transaction, CreateTransactionDTO } from '@/models/transaction.model';

interface DatabaseTransactionRecord {
  id: string;
  user_id: string;
  amount: number | string;
  type: string;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export class TransactionRepository {
  async findAll(userId: string): Promise<Transaction[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(error.message);
    }

    return (data || []).map((t) => this.mapToDomain(t as unknown as DatabaseTransactionRecord));
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found record code
      console.error('Error fetching transaction by ID:', error);
      throw new Error(error.message);
    }

    return this.mapToDomain(data as unknown as DatabaseTransactionRecord);
  }

  async create(userId: string, transaction: CreateTransactionDTO): Promise<Transaction> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description || null,
        date: transaction.date,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error(error.message);
    }

    return this.mapToDomain(data as unknown as DatabaseTransactionRecord);
  }

  async delete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(error.message);
    }
  }

  private mapToDomain(dbRecord: DatabaseTransactionRecord): Transaction {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      amount: Number(dbRecord.amount),
      type: dbRecord.type as Transaction['type'],
      category: dbRecord.category as Transaction['category'],
      description: dbRecord.description,
      date: dbRecord.date,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }
}
export const transactionRepository = new TransactionRepository();
