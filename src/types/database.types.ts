export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          currency: string;
          university: string | null;
          study_country: string | null;
          study_city: string | null;
          home_country: string | null;
          monthly_income: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          university?: string | null;
          study_country?: string | null;
          study_city?: string | null;
          home_country?: string | null;
          monthly_income?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          university?: string | null;
          study_country?: string | null;
          study_city?: string | null;
          home_country?: string | null;
          monthly_income?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'INCOME' | 'EXPENSE';
          category: string;
          description: string | null;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: 'INCOME' | 'EXPENSE';
          category: string;
          description?: string | null;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: 'INCOME' | 'EXPENSE';
          category?: string;
          description?: string | null;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          amount: number;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          amount: number;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          amount?: number;
          start_date?: string;
          end_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "savings_goals_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      exchange_rates: {
        Row: {
          id: string;
          from_currency: string;
          to_currency: string;
          rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          from_currency: string;
          to_currency: string;
          rate: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          from_currency?: string;
          to_currency?: string;
          rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cost_of_living: {
        Row: {
          id: string;
          city: string;
          country: string;
          index_score: number;
          estimated_monthly_cost: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          city: string;
          country: string;
          index_score: number;
          estimated_monthly_cost?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          city?: string;
          country?: string;
          index_score?: number;
          estimated_monthly_cost?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
