import { createClient } from '@/lib/supabase/server';

export interface HindsightMemory {
  id: string;
  userId: string;
  category: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export class HindsightService {
  /**
   * Get a specific memory for a user
   */
  async getMemory(userId: string, category: string, key: string): Promise<HindsightMemory | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hindsight_memories')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Error fetching memory:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      key: data.key,
      value: data.value,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get all memories in a specific category for a user
   */
  async getMemoriesByCategory(userId: string, category: string): Promise<HindsightMemory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hindsight_memories')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category);

    if (error) {
      console.error(`Error fetching memories for category ${category}:`, error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      key: row.key,
      value: row.value,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get all memories for a user
   */
  async getAllMemories(userId: string): Promise<HindsightMemory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hindsight_memories')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching all memories:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      key: row.key,
      value: row.value,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Set or update a specific memory
   */
  async updateMemory(userId: string, category: string, key: string, value: any): Promise<boolean> {
    try {
      const supabase = await createClient();
      const existing = await this.getMemory(userId, category, key);
      
      const now = new Date().toISOString();

      if (existing) {
        const { error } = await supabase
          .from('hindsight_memories')
          .update({
            value: { ...existing.value, ...value },
            updated_at: now,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hindsight_memories')
          .insert({
            user_id: userId,
            category,
            key,
            value,
            created_at: now,
            updated_at: now,
          });

        if (error) throw error;
      }

      return true;
    } catch (err) {
      console.error('Error saving hindsight memory:', err);
      return false;
    }
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(userId: string, category: string, key: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('hindsight_memories')
      .delete()
      .eq('user_id', userId)
      .eq('category', category)
      .eq('key', key);

    if (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
    return true;
  }

  /**
   * Learn from user corrections to OCR receipts / categories
   */
  async learnFromOcrCorrection(
    userId: string,
    merchant: string,
    originalCategory: string | null,
    updatedCategory: string
  ): Promise<boolean> {
    if (!merchant) return false;
    const cleanMerchant = merchant.trim();
    
    // Key will be the merchant name, value stores preferred category and original mapping
    return this.updateMemory(userId, 'ocr_learning', cleanMerchant, {
      preferredCategory: updatedCategory,
      originalOcrCategory: originalCategory,
      correctionCount: 1, // Merge logic will accumulate if exists
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Learn user recommendations preference (Accepted / Ignored)
   */
  async learnUserPreference(userId: string, adviceKey: string, accepted: boolean): Promise<boolean> {
    return this.updateMemory(userId, 'ai_preference', adviceKey, {
      accepted,
      feedbackTime: new Date().toISOString(),
    });
  }
}

export const hindsightService = new HindsightService();
