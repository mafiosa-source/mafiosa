export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      month_closings: {
        Row: {
          closed_at: string
          closed_with_exceptions: boolean
          created_at: string
          exceptions: Json
          id: string
          month: number
          notes: string | null
          snapshot: Json
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          closed_at?: string
          closed_with_exceptions?: boolean
          created_at?: string
          exceptions?: Json
          id?: string
          month: number
          notes?: string | null
          snapshot?: Json
          status?: string
          updated_at?: string
          user_id?: string
          year: number
        }
        Update: {
          closed_at?: string
          closed_with_exceptions?: boolean
          created_at?: string
          exceptions?: Json
          id?: string
          month?: number
          notes?: string | null
          snapshot?: Json
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      opening_balances: {
        Row: {
          amount: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          wallet: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet?: string
        }
        Relationships: []
      }
      payable_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          notes: string | null
          payable_id: string
          txn_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payable_id: string
          txn_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payable_id?: string
          txn_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payable_payments_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount: number
          candidate: string | null
          card_wallet: string
          company: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          paid: number
          particulars: string | null
          payer_name: string | null
          responsible_party: string
          sponsor: string | null
          status: string
          txn_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          candidate?: string | null
          card_wallet: string
          company?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          paid?: number
          particulars?: string | null
          payer_name?: string | null
          responsible_party: string
          sponsor?: string | null
          status?: string
          txn_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          candidate?: string | null
          card_wallet?: string
          company?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          paid?: number
          particulars?: string | null
          payer_name?: string | null
          responsible_party?: string
          sponsor?: string | null
          status?: string
          txn_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          attachment: string | null
          candidate: string | null
          card_category: string | null
          classification: string | null
          company: string | null
          created_at: string
          created_by: string | null
          current_location: string | null
          date: string
          description: string | null
          driver: string | null
          from_wallet: string
          id: string
          km_after: number | null
          km_before: number | null
          km_reading: number | null
          last_edited_by: string | null
          parent_txn_id: string | null
          passport: string | null
          payable_by: string | null
          payer_name: string | null
          payment_method: string | null
          plate_number: string | null
          purpose: string | null
          purpose_category: string | null
          reference_number: string | null
          sponsor: string | null
          station: string | null
          status: string
          to_wallet: string
          type: string
          updated_at: string
          user_id: string
          vehicle: string | null
          voucher_number: string | null
        }
        Insert: {
          amount?: number
          attachment?: string | null
          candidate?: string | null
          card_category?: string | null
          classification?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          current_location?: string | null
          date: string
          description?: string | null
          driver?: string | null
          from_wallet: string
          id?: string
          km_after?: number | null
          km_before?: number | null
          km_reading?: number | null
          last_edited_by?: string | null
          parent_txn_id?: string | null
          passport?: string | null
          payable_by?: string | null
          payer_name?: string | null
          payment_method?: string | null
          plate_number?: string | null
          purpose?: string | null
          purpose_category?: string | null
          reference_number?: string | null
          sponsor?: string | null
          station?: string | null
          status?: string
          to_wallet: string
          type: string
          updated_at?: string
          user_id?: string
          vehicle?: string | null
          voucher_number?: string | null
        }
        Update: {
          amount?: number
          attachment?: string | null
          candidate?: string | null
          card_category?: string | null
          classification?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          current_location?: string | null
          date?: string
          description?: string | null
          driver?: string | null
          from_wallet?: string
          id?: string
          km_after?: number | null
          km_before?: number | null
          km_reading?: number | null
          last_edited_by?: string | null
          parent_txn_id?: string | null
          passport?: string | null
          payable_by?: string | null
          payer_name?: string | null
          payment_method?: string | null
          plate_number?: string | null
          purpose?: string | null
          purpose_category?: string | null
          reference_number?: string | null
          sponsor?: string | null
          station?: string | null
          status?: string
          to_wallet?: string
          type?: string
          updated_at?: string
          user_id?: string
          vehicle?: string | null
          voucher_number?: string | null
        }
        Relationships: []
      }
      wallet_targets: {
        Row: {
          amount: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          wallet: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
