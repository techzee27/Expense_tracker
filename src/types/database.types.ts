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
          country_of_study: string | null;
          city_of_study: string | null;
          preferred_currency: string | null;
          sms_tracking_enabled: boolean;
          email_tracking_enabled: boolean;
          last_sms_sync: string | null;
          last_email_sync: string | null;
          sms_imported_count: number;
          email_imported_count: number;
          ocr_imported_count: number;
          manual_transaction_count: number;
          connected_email: string | null;
          gmail_connected: boolean;
          gmail_access_token: string | null;
          gmail_refresh_token: string | null;
          gmail_token_expiry: string | null;
          auth_provider: string;
          google_connected: boolean;
          sms_permission_status: string;
          sms_messages_scanned: number;
          last_sms_scan: string | null;
          intro_screens_completed: boolean;
          profile_completed: boolean;
          onboarding_completed: boolean;
          last_completed_step: number;
          home_city: string | null;
          home_currency: Json | null;
          study_currency: Json | null;
          show_home_currency: boolean;
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
          country_of_study?: string | null;
          city_of_study?: string | null;
          preferred_currency?: string | null;
          sms_tracking_enabled?: boolean;
          email_tracking_enabled?: boolean;
          last_sms_sync?: string | null;
          last_email_sync?: string | null;
          sms_imported_count?: number;
          email_imported_count?: number;
          ocr_imported_count?: number;
          manual_transaction_count?: number;
          connected_email?: string | null;
          gmail_connected?: boolean;
          gmail_access_token?: string | null;
          gmail_refresh_token?: string | null;
          gmail_token_expiry?: string | null;
          auth_provider?: string;
          google_connected?: boolean;
          sms_permission_status?: string;
          sms_messages_scanned?: number;
          last_sms_scan?: string | null;
          intro_screens_completed?: boolean;
          profile_completed?: boolean;
          onboarding_completed?: boolean;
          last_completed_step?: number;
          home_city?: string | null;
          home_currency?: Json | null;
          study_currency?: Json | null;
          show_home_currency?: boolean;
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
          original_amount: number;
          original_currency: string;
          exchange_rate_at_entry: number;
          converted_amount: number;
          source: 'MANUAL' | 'MESSAGE' | 'OCR' | 'EMAIL' | 'SMS' | 'OCR_RECEIPT' | 'RECURRING';
          merchant: string | null;
          receipt_filename: string | null;
          receipt_url: string | null;
          ocr_confidence: number | null;
          approved: boolean;
          duplicate_flag: boolean;
          imported_at: string | null;
          email_confidence: number | null;
          sms_id: string | null;
          sender_id: string | null;
          payment_method: string | null;
          account_reference: string | null;
          transaction_time: string | null;
          recurring: boolean;
          recurring_id: string | null;
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
          original_amount?: number;
          original_currency?: string;
          exchange_rate_at_entry?: number;
          converted_amount?: number;
          source?: 'MANUAL' | 'MESSAGE' | 'OCR' | 'EMAIL' | 'SMS' | 'OCR_RECEIPT' | 'RECURRING';
          merchant?: string | null;
          receipt_filename?: string | null;
          receipt_url?: string | null;
          ocr_confidence?: number | null;
          approved?: boolean;
          duplicate_flag?: boolean;
          imported_at?: string | null;
          email_confidence?: number | null;
          sms_id?: string | null;
          sender_id?: string | null;
          payment_method?: string | null;
          account_reference?: string | null;
          transaction_time?: string | null;
          recurring?: boolean;
          recurring_id?: string | null;
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
          original_amount?: number;
          original_currency?: string;
          exchange_rate_at_entry?: number;
          converted_amount?: number;
          source?: 'MANUAL' | 'MESSAGE' | 'OCR' | 'EMAIL' | 'SMS' | 'OCR_RECEIPT' | 'RECURRING';
          merchant?: string | null;
          receipt_filename?: string | null;
          receipt_url?: string | null;
          ocr_confidence?: number | null;
          approved?: boolean;
          duplicate_flag?: boolean;
          imported_at?: string | null;
          email_confidence?: number | null;
          sms_id?: string | null;
          sender_id?: string | null;
          payment_method?: string | null;
          account_reference?: string | null;
          transaction_time?: string | null;
          recurring?: boolean;
          recurring_id?: string | null;
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
      incomes: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          category: string;
          description: string | null;
          payer: string | null;
          source: 'MANUAL' | 'EMAIL' | 'MESSAGE';
          recurring: boolean;
          recurring_schedule_id: string | null;
          transaction_date: string;
          sms_id: string | null;
          sender_id: string | null;
          payment_method: string | null;
          account_reference: string | null;
          transaction_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          category: string;
          description?: string | null;
          payer?: string | null;
          source?: 'MANUAL' | 'EMAIL' | 'MESSAGE';
          recurring?: boolean;
          recurring_schedule_id?: string | null;
          transaction_date: string;
          sms_id?: string | null;
          sender_id?: string | null;
          payment_method?: string | null;
          account_reference?: string | null;
          transaction_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          category?: string;
          description?: string | null;
          payer?: string | null;
          source?: 'MANUAL' | 'EMAIL' | 'MESSAGE';
          recurring?: boolean;
          recurring_schedule_id?: string | null;
          transaction_date?: string;
          sms_id?: string | null;
          sender_id?: string | null;
          payment_method?: string | null;
          account_reference?: string | null;
          transaction_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incomes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incomes_recurring_schedule_id_fkey";
            columns: ["recurring_schedule_id"];
            referencedRelation: "recurring_income_schedules";
            referencedColumns: ["id"];
          }
        ];
      };
      recurring_income_schedules: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          category: string;
          payer: string | null;
          frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
          start_date: string;
          end_date: string | null;
          next_execution_date: string;
          active: boolean;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          category: string;
          payer?: string | null;
          frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
          start_date: string;
          end_date?: string | null;
          next_execution_date: string;
          active?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          category?: string;
          payer?: string | null;
          frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
          start_date?: string;
          end_date?: string | null;
          next_execution_date?: string;
          active?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_income_schedules_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      hindsight_memories: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          key: string;
          value: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          key: string;
          value: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          key?: string;
          value?: any;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hindsight_memories_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_audit_logs: {
        Row: {
          id: string;
          user_id: string;
          timestamp: string;
          task_type: string;
          selected_model: string;
          reason_for_selection: string;
          latency_ms: number;
          prompt_tokens: number;
          completion_tokens: number;
          estimated_cost: number;
          success: boolean;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          timestamp?: string;
          task_type: string;
          selected_model: string;
          reason_for_selection: string;
          latency_ms: number;
          prompt_tokens: number;
          completion_tokens: number;
          estimated_cost: number;
          success?: boolean;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          timestamp?: string;
          task_type?: string;
          selected_model?: string;
          reason_for_selection?: string;
          latency_ms?: number;
          prompt_tokens?: number;
          completion_tokens?: number;
          estimated_cost?: number;
          success?: boolean;
          error_message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_audit_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
