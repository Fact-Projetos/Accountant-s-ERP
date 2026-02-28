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
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            city_links: {
                Row: {
                    city: string
                    created_at: string
                    id: string
                    url: string
                }
                Insert: {
                    city: string
                    created_at?: string
                    id?: string
                    url: string
                }
                Update: {
                    city?: string
                    created_at?: string
                    id?: string
                    url?: string
                }
                Relationships: []
            }
            companies: {
                Row: {
                    certificate_password: string | null
                    city: string | null
                    city_hall_login: string | null
                    city_hall_password: string | null
                    cnpj: string
                    code: string | null
                    complement: string | null
                    created_at: string
                    email: string | null
                    id: string
                    municipal_registration: string | null
                    name: string
                    neighborhood: string | null
                    nire: string | null
                    number: string | null
                    phone: string | null
                    state: string | null
                    state_registration: string | null
                    status: string | null
                    street: string | null
                    tax_regime: string | null
                    trade_name: string | null
                    zip_code: string | null
                }
                Insert: {
                    certificate_password?: string | null
                    city?: string | null
                    city_hall_login?: string | null
                    city_hall_password?: string | null
                    cnpj: string
                    code?: string | null
                    complement?: string | null
                    created_at?: string
                    email?: string | null
                    id?: string
                    municipal_registration?: string | null
                    name: string
                    neighborhood?: string | null
                    nire?: string | null
                    number?: string | null
                    phone?: string | null
                    state?: string | null
                    state_registration?: string | null
                    status?: string | null
                    street?: string | null
                    tax_regime?: string | null
                    trade_name?: string | null
                    zip_code?: string | null
                }
                Update: {
                    certificate_password?: string | null
                    city?: string | null
                    city_hall_login?: string | null
                    city_hall_password?: string | null
                    cnpj?: string
                    code?: string | null
                    complement?: string | null
                    created_at?: string
                    email?: string | null
                    id?: string
                    municipal_registration?: string | null
                    name?: string
                    neighborhood?: string | null
                    nire?: string | null
                    number?: string | null
                    phone?: string | null
                    state?: string | null
                    state_registration?: string | null
                    status?: string | null
                    street?: string | null
                    tax_regime?: string | null
                    trade_name?: string | null
                    zip_code?: string | null
                }
                Relationships: []
            }
            documents: {
                Row: {
                    category: string
                    company_id: string | null
                    created_at: string
                    file_url: string | null
                    id: string
                    name: string
                    size: string | null
                    status: string | null
                    type: string | null
                }
                Insert: {
                    category: string
                    company_id?: string | null
                    created_at?: string
                    file_url?: string | null
                    id?: string
                    name: string
                    size?: string | null
                    status?: string | null
                    type?: string | null
                }
                Update: {
                    category?: string
                    company_id?: string | null
                    created_at?: string
                    file_url?: string | null
                    id?: string
                    name?: string
                    size?: string | null
                    status?: string | null
                    type?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "documents_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                ]
            }
            financial_entries: {
                Row: {
                    company_id: string
                    created_at: string
                    description: string | null
                    document_number: string | null
                    due_date: string
                    id: string
                    nature: string | null
                    origin: string | null
                    paid_amount: number | null
                    partner_id: string | null
                    status: string | null
                    total_amount: number | null
                    type: string
                }
                Insert: {
                    company_id: string
                    created_at?: string
                    description?: string | null
                    document_number?: string | null
                    due_date: string
                    id?: string
                    nature?: string | null
                    origin?: string | null
                    paid_amount?: number | null
                    partner_id?: string | null
                    status?: string | null
                    total_amount?: number | null
                    type: string
                }
                Update: {
                    company_id?: string
                    created_at?: string
                    description?: string | null
                    document_number?: string | null
                    due_date?: string
                    id?: string
                    nature?: string | null
                    origin?: string | null
                    paid_amount?: number | null
                    partner_id?: string | null
                    status?: string | null
                    total_amount?: number | null
                    type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "financial_entries_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "financial_entries_partner_id_fkey"
                        columns: ["partner_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                ]
            }
            inventory: {
                Row: {
                    code: string | null
                    company_id: string
                    created_at: string
                    current_stock: number | null
                    description: string | null
                    id: string
                    name: string
                    unit: string | null
                    unit_price: number | null
                }
                Insert: {
                    code?: string | null
                    company_id: string
                    created_at?: string
                    current_stock?: number | null
                    description?: string | null
                    id?: string
                    name: string
                    unit?: string | null
                    unit_price?: number | null
                }
                Update: {
                    code?: string | null
                    company_id?: string
                    created_at?: string
                    current_stock?: number | null
                    description?: string | null
                    id?: string
                    name?: string
                    unit?: string | null
                    unit_price?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "inventory_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                ]
            }
            movements: {
                Row: {
                    company_id: string
                    created_at: string
                    id: string
                    month: string
                    status: string | null
                    year: string
                }
                Insert: {
                    company_id: string
                    created_at?: string
                    id?: string
                    month: string
                    status?: string | null
                    year: string
                }
                Update: {
                    company_id?: string
                    created_at?: string
                    id?: string
                    month?: string
                    status?: string | null
                    year?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "movements_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                ]
            }
            partners: {
                Row: {
                    city: string | null
                    company_id: string
                    complement: string | null
                    created_at: string
                    document: string
                    email: string | null
                    id: string
                    name: string
                    neighborhood: string | null
                    number: string | null
                    phone: string | null
                    state: string | null
                    status: string | null
                    street: string | null
                    type: string
                    zip_code: string | null
                }
                Insert: {
                    city?: string | null
                    company_id: string
                    complement?: string | null
                    created_at?: string
                    document: string
                    email?: string | null
                    id?: string
                    name: string
                    neighborhood?: string | null
                    number?: string | null
                    phone?: string | null
                    state?: string | null
                    status?: string | null
                    street?: string | null
                    type: string
                    zip_code?: string | null
                }
                Update: {
                    city?: string | null
                    company_id?: string
                    complement?: string | null
                    created_at?: string
                    document?: string
                    email?: string | null
                    id?: string
                    name?: string
                    neighborhood?: string | null
                    number?: string | null
                    phone?: string | null
                    state?: string | null
                    status?: string | null
                    street?: string | null
                    type?: string
                    zip_code?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "partners_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    company_id: string | null
                    created_at: string
                    id: string
                    name: string | null
                    role: string | null
                }
                Insert: {
                    company_id?: string | null
                    created_at?: string
                    id: string
                    name?: string | null
                    role?: string | null
                }
                Update: {
                    company_id?: string | null
                    created_at?: string
                    id?: string
                    name?: string | null
                    role?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sale_items: {
                Row: {
                    code: string | null
                    created_at: string
                    desc_fiscal: string | null
                    desc_internal: string | null
                    id: string
                    product_id: string | null
                    qty: number | null
                    sale_id: string
                    total: number | null
                    unit_price: number | null
                }
                Insert: {
                    code?: string | null
                    created_at?: string
                    desc_fiscal?: string | null
                    desc_internal?: string | null
                    id?: string
                    product_id?: string | null
                    qty?: number | null
                    sale_id: string
                    total?: number | null
                    unit_price?: number | null
                }
                Update: {
                    code?: string | null
                    created_at?: string
                    desc_fiscal?: string | null
                    desc_internal?: string | null
                    id?: string
                    product_id?: string | null
                    qty?: number | null
                    sale_id?: string
                    total?: number | null
                    unit_price?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sale_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "inventory"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sale_items_sale_id_fkey"
                        columns: ["sale_id"]
                        isOneToOne: false
                        referencedRelation: "sales"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sales: {
                Row: {
                    additional_info: string | null
                    company_id: string
                    created_at: string
                    date: string | null
                    freight_type: string | null
                    freight_value: number | null
                    id: string
                    partner_id: string | null
                    status: string | null
                    total_amount: number | null
                }
                Insert: {
                    additional_info?: string | null
                    company_id: string
                    created_at?: string
                    date?: string | null
                    freight_type?: string | null
                    freight_value?: number | null
                    id?: string
                    partner_id?: string | null
                    status?: string | null
                    total_amount?: number | null
                }
                Update: {
                    additional_info?: string | null
                    company_id?: string
                    created_at?: string
                    date?: string | null
                    freight_type?: string | null
                    freight_value?: number | null
                    id?: string
                    partner_id?: string | null
                    status?: string | null
                    total_amount?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sales_partner_id_fkey"
                        columns: ["partner_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                ]
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
