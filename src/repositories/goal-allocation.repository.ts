import { createClient, createAdminClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export interface GoalAllocation {
  id: string;
  goalId: string;
  amount: number;
  allocationDate: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

// Fallback file setup
const FALLBACK_FILE_DIR = path.join(process.cwd(), 'data');
const FALLBACK_FILE_PATH = path.join(FALLBACK_FILE_DIR, 'goal_allocations.json');

function ensureFallbackFile() {
  if (!fs.existsSync(FALLBACK_FILE_DIR)) {
    fs.mkdirSync(FALLBACK_FILE_DIR, { recursive: true });
  }
  if (!fs.existsSync(FALLBACK_FILE_PATH)) {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify([]));
  }
}

function readFallbackAllocations(): GoalAllocation[] {
  ensureFallbackFile();
  try {
    const data = fs.readFileSync(FALLBACK_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read fallback allocations:', err);
    return [];
  }
}

function writeFallbackAllocations(allocations: GoalAllocation[]) {
  ensureFallbackFile();
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(allocations, null, 2));
  } catch (err) {
    console.error('Failed to write fallback allocations:', err);
  }
}

export class GoalAllocationRepository {
  async findAllByGoalId(goalId: string): Promise<GoalAllocation[]> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('goal_allocations')
        .select('*')
        .eq('goal_id', goalId)
        .order('allocation_date', { ascending: false });

      if (error) {
        // Fall back to local file if table does not exist
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('goal_allocations table not found, using JSON fallback');
          return readFallbackAllocations().filter((a) => a.goalId === goalId);
        }
        throw new Error(error.message);
      }
      return (data || []).map((d) => ({
        id: d.id,
        goalId: d.goal_id,
        amount: Number(d.amount),
        allocationDate: d.allocation_date,
        source: d.source,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch (err) {
      console.warn('Supabase query failed, using JSON fallback:', err);
      return readFallbackAllocations().filter((a) => a.goalId === goalId);
    }
  }

  async create(goalId: string, amount: number, date: string, source = 'MONTHLY_SAVINGS'): Promise<GoalAllocation> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('goal_allocations')
        .insert({
          goal_id: goalId,
          amount,
          allocation_date: date,
          source,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('goal_allocations table not found, writing to JSON fallback');
          return this.createFallback(goalId, amount, date, source);
        }
        throw new Error(error.message);
      }

      return {
        id: data.id,
        goalId: data.goal_id,
        amount: Number(data.amount),
        allocationDate: data.allocation_date,
        source: data.source,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.warn('Supabase insert failed, writing to JSON fallback:', err);
      return this.createFallback(goalId, amount, date, source);
    }
  }

  private createFallback(goalId: string, amount: number, date: string, source: string): GoalAllocation {
    const list = readFallbackAllocations();
    const newAlloc: GoalAllocation = {
      id: crypto.randomUUID(),
      goalId,
      amount,
      allocationDate: date,
      source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newAlloc);
    writeFallbackAllocations(list);
    return newAlloc;
  }

  async delete(id: string): Promise<void> {
    try {
      const supabase = createAdminClient();
      await supabase.from('goal_allocations').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase allocation delete failed, using JSON fallback:', err);
    }
    // JSON local cleanup
    const list = readFallbackAllocations();
    const filtered = list.filter((a) => a.id !== id);
    if (list.length !== filtered.length) {
      writeFallbackAllocations(filtered);
    }
  }

  async deleteByGoalId(goalId: string): Promise<void> {
    try {
      const supabase = createAdminClient();
      await supabase.from('goal_allocations').delete().eq('goal_id', goalId);
    } catch (err) {
      console.warn('Supabase cascade delete failed, using JSON fallback:', err);
    }
    // JSON local cleanup
    const list = readFallbackAllocations();
    const filtered = list.filter((a) => a.goalId !== goalId);
    if (list.length !== filtered.length) {
      writeFallbackAllocations(filtered);
    }
  }
}

export const goalAllocationRepository = new GoalAllocationRepository();
