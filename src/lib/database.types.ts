export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            stores: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
                Relationships: []
            }
            materials: {
                Row: {
                    id: string
                    store_id: string
                    name: string
                    unit: string
                    current_stock: number
                    average_cost: number
                    bulk_price: number
                    min_stock: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    name: string
                    unit: string
                    current_stock?: number
                    average_cost?: number
                    bulk_price?: number
                    min_stock?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    name?: string
                    unit?: string
                    current_stock?: number
                    average_cost?: number
                    bulk_price?: number
                    min_stock?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "materials_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            material_transactions: {
                Row: {
                    id: string
                    store_id: string
                    material_id: string
                    transaction_type: string
                    quantity: number
                    cost_per_unit: number
                    total_cost: number
                    reference_type: string
                    reference_id: string | null
                    notes: string | null
                    transaction_date: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    material_id: string
                    transaction_type: string
                    quantity: number
                    cost_per_unit: number
                    total_cost: number
                    reference_type: string
                    reference_id?: string | null
                    notes?: string | null
                    transaction_date?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    material_id?: string
                    transaction_type?: string
                    quantity?: number
                    cost_per_unit?: number
                    total_cost?: number
                    reference_type?: string
                    reference_id?: string | null
                    notes?: string | null
                    transaction_date?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "material_transactions_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "material_transactions_material_id_fkey"
                        columns: ["material_id"]
                        isOneToOne: false
                        referencedRelation: "materials"
                        referencedColumns: ["id"]
                    }
                ]
            }
            products: {
                Row: {
                    id: string
                    store_id: string
                    name: string
                    description: string | null
                    selling_price: number
                    standard_hpp: number
                    category: string | null
                    image_url: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    name: string
                    description?: string | null
                    selling_price?: number
                    standard_hpp?: number
                    category?: string | null
                    image_url?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    name?: string
                    description?: string | null
                    selling_price?: number
                    standard_hpp?: number
                    category?: string | null
                    image_url?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "products_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            recipes: {
                Row: {
                    id: string
                    store_id: string
                    product_id: string
                    material_id: string
                    quantity_needed: number
                    yield_portions: number
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    product_id: string
                    material_id: string
                    quantity_needed: number
                    yield_portions?: number
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    product_id?: string
                    material_id?: string
                    quantity_needed?: number
                    yield_portions?: number
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "recipes_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recipes_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recipes_material_id_fkey"
                        columns: ["material_id"]
                        isOneToOne: false
                        referencedRelation: "materials"
                        referencedColumns: ["id"]
                    }
                ]
            }
            sales: {
                Row: {
                    id: string
                    store_id: string
                    sale_number: string
                    sale_date: string
                    total_amount: number
                    total_hpp: number
                    total_margin: number
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    sale_number: string
                    sale_date?: string
                    total_amount?: number
                    total_hpp?: number
                    total_margin?: number
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    sale_number?: string
                    sale_date?: string
                    total_amount?: number
                    total_hpp?: number
                    total_margin?: number
                    notes?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            sale_items: {
                Row: {
                    id: string
                    store_id: string
                    sale_id: string
                    product_id: string
                    quantity: number
                    selling_price: number
                    actual_hpp: number
                    margin: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    sale_id: string
                    product_id: string
                    quantity: number
                    selling_price: number
                    actual_hpp?: number
                    margin?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    sale_id?: string
                    product_id?: string
                    quantity?: number
                    selling_price?: number
                    actual_hpp?: number
                    margin?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "sale_items_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sale_items_sale_id_fkey"
                        columns: ["sale_id"]
                        isOneToOne: false
                        referencedRelation: "sales"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sale_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            production_batches: {
                Row: {
                    id: string
                    store_id: string
                    product_id: string
                    batch_number: string
                    quantity_produced: number
                    production_date: string
                    actual_cost: number
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    product_id: string
                    batch_number: string
                    quantity_produced: number
                    production_date?: string
                    actual_cost?: number
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    product_id?: string
                    batch_number?: string
                    quantity_produced?: number
                    production_date?: string
                    actual_cost?: number
                    notes?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "production_batches_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "production_batches_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            waste_records: {
                Row: {
                    id: string
                    store_id: string
                    material_id: string
                    quantity: number
                    cost: number
                    reason: string | null
                    waste_date: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    material_id: string
                    quantity: number
                    cost?: number
                    reason?: string | null
                    waste_date?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    material_id?: string
                    quantity?: number
                    cost?: number
                    reason?: string | null
                    waste_date?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "waste_records_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "waste_records_material_id_fkey"
                        columns: ["material_id"]
                        isOneToOne: false
                        referencedRelation: "materials"
                        referencedColumns: ["id"]
                    }
                ]
            }
            store_menu_config: {
                Row: {
                    id: string
                    store_id: string
                    menu_id: string
                    is_visible: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    menu_id: string
                    is_visible?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    menu_id?: string
                    is_visible?: boolean
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "store_menu_config_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            store_settings: {
                Row: {
                    id: string
                    store_id: string
                    setting_key: string
                    setting_value: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    setting_key: string
                    setting_value: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    setting_key?: string
                    setting_value?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "store_settings_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            users: {
                Row: {
                    id: string
                    store_id: string
                    email: string
                    password: string | null
                    name: string | null
                    role: string
                    status: string
                    dark_mode: boolean
                    theme_color: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    email: string
                    password?: string | null
                    name?: string | null
                    role?: string
                    status?: string
                    dark_mode?: boolean
                    theme_color?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    email?: string
                    password?: string | null
                    name?: string | null
                    role?: string
                    status?: string
                    dark_mode?: boolean
                    theme_color?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "users_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            orders: {
                Row: {
                    id: string
                    store_id: string
                    customer_id: string | null
                    order_number: string
                    order_type: string
                    status: string
                    customer_name: string
                    customer_phone: string
                    customer_address: string | null
                    customer_landmark: string | null
                    customer_lat: number | null
                    customer_lng: number | null
                    total_amount: number
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    customer_id?: string | null
                    order_number: string
                    order_type: string
                    status?: string
                    customer_name: string
                    customer_phone: string
                    customer_address?: string | null
                    customer_landmark?: string | null
                    customer_lat?: number | null
                    customer_lng?: number | null
                    total_amount?: number
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    customer_id?: string | null
                    order_number?: string
                    order_type?: string
                    status?: string
                    customer_name?: string
                    customer_phone?: string
                    customer_address?: string | null
                    customer_landmark?: string | null
                    customer_lat?: number | null
                    customer_lng?: number | null
                    total_amount?: number
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "orders_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "orders_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            order_items: {
                Row: {
                    id: string
                    order_id: string
                    product_id: string
                    product_name: string
                    quantity: number
                    price: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    order_id: string
                    product_id: string
                    product_name: string
                    quantity: number
                    price: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    order_id?: string
                    product_id?: string
                    product_name?: string
                    quantity?: number
                    price?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "order_items_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            order_messages: {
                Row: {
                    id: string
                    order_id: string
                    sender_id: string
                    sender_name: string
                    sender_role: string
                    message: string
                    attachment_url: string | null
                    attachment_type: string | null
                    attachment_name: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    order_id: string
                    sender_id: string
                    sender_name: string
                    sender_role: string
                    message: string
                    attachment_url?: string | null
                    attachment_type?: string | null
                    attachment_name?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    order_id?: string
                    sender_id?: string
                    sender_name?: string
                    sender_role?: string
                    message?: string
                    attachment_url?: string | null
                    attachment_type?: string | null
                    attachment_name?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "order_messages_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    }
                ]
            }
            order_message_reads: {
                Row: {
                    message_id: string
                    user_id: string
                    read_at: string
                }
                Insert: {
                    message_id: string
                    user_id: string
                    read_at?: string
                }
                Update: {
                    message_id?: string
                    user_id?: string
                    read_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "order_message_reads_message_id_fkey"
                        columns: ["message_id"]
                        isOneToOne: false
                        referencedRelation: "order_messages"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_message_reads_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            promo_banners: {
                Row: {
                    id: string
                    store_id: string
                    title: string
                    image_url: string
                    is_active: boolean
                    sort_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    title: string
                    image_url: string
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    title?: string
                    image_url?: string
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "promo_banners_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            login_user: {
                Args: {
                    input_email: string
                    input_password: string
                }
                Returns: {
                    id: string
                    email: string
                    name: string | null
                    role: string
                    status: string
                    store_id: string
                    store_name: string
                }[]
            }
            register_user: {
                Args: {
                    input_name: string
                    input_email: string
                    input_password: string
                    input_role: string
                    input_store_id?: string
                    input_store_name?: string
                }
                Returns: {
                    success: boolean
                    message: string
                    user_id: string | null
                }[]
            }
            change_user_password: {
                Args: {
                    target_user_id: string
                    new_password: string
                }
                Returns: boolean
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
