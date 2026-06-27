import { createClient } from '@/lib/supabase/server';
import { Receipt, CreateReceiptDTO, UpdateReceiptDTO } from '@/models/receipt.model';

interface DBReceipt {
  id: string;
  user_id: string;
  file_url: string;
  merchant: string | null;
  amount: string | number | null;
  date: string | null;
  category: string | null;
  confidence_score: number;
  processing_status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  currency?: string | null;
  created_at: string;
}

export class ReceiptRepository {
  async findAll(
    userId: string,
    filters?: {
      status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    }
  ): Promise<Receipt[]> {
    const supabase = await createClient();
    let query = supabase
      .from('receipts' as any)
      .select('*')
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('processing_status', filters.status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((r: DBReceipt) => this.mapToDomain(r));
  }

  async findById(id: string, userId: string): Promise<Receipt | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('receipts' as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToDomain(data as DBReceipt);
  }

  async create(
    userId: string,
    receipt: CreateReceiptDTO
  ): Promise<Receipt> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('receipts' as any)
      .insert({
        user_id: userId,
        file_url: receipt.fileUrl,
        merchant: receipt.merchant || null,
        amount: receipt.amount !== undefined ? receipt.amount : null,
        date: receipt.date || null,
        category: receipt.category || null,
        confidence_score: receipt.confidenceScore !== undefined ? receipt.confidenceScore : 0,
        processing_status: receipt.processingStatus || 'PENDING_REVIEW',
        currency: receipt.currency || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data as DBReceipt);
  }

  async update(
    id: string,
    userId: string,
    receipt: UpdateReceiptDTO
  ): Promise<Receipt> {
    const supabase = await createClient();
    
    const updateData: any = {};
    if (receipt.fileUrl !== undefined) updateData.file_url = receipt.fileUrl;
    if (receipt.merchant !== undefined) updateData.merchant = receipt.merchant;
    if (receipt.amount !== undefined) updateData.amount = receipt.amount;
    if (receipt.date !== undefined) updateData.date = receipt.date;
    if (receipt.category !== undefined) updateData.category = receipt.category;
    if (receipt.confidenceScore !== undefined) updateData.confidence_score = receipt.confidenceScore;
    if (receipt.processingStatus !== undefined) updateData.processing_status = receipt.processingStatus;
    if (receipt.currency !== undefined) updateData.currency = receipt.currency;

    const { data, error } = await supabase
      .from('receipts' as any)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToDomain(data as DBReceipt);
  }

  async delete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('receipts' as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private mapToDomain(dbRecord: DBReceipt): Receipt {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      fileUrl: dbRecord.file_url,
      merchant: dbRecord.merchant,
      amount: dbRecord.amount !== null && dbRecord.amount !== undefined ? Number(dbRecord.amount) : null,
      date: dbRecord.date,
      category: dbRecord.category,
      confidenceScore: dbRecord.confidence_score,
      processingStatus: dbRecord.processing_status,
      currency: dbRecord.currency || null,
      createdAt: dbRecord.created_at,
    };
  }
}

export const receiptRepository = new ReceiptRepository();
