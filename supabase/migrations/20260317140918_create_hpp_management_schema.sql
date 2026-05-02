/*
  # HPP Management System - Complete Database Schema

  ## Overview
  This migration creates a comprehensive database schema for an HPP (Cost of Goods Sold) 
  management system for F&B and small-medium production businesses.

  ## Tables Created

  ### 1. materials
  Stores raw materials/ingredients inventory
  - `id` (uuid, primary key)
  - `name` (text) - material name
  - `unit` (text) - unit of measurement (gram, kg, liter, pcs, etc.)
  - `current_stock` (decimal) - current stock quantity
  - `average_cost` (decimal) - average cost per unit (for average costing method)
  - `min_stock` (decimal) - minimum stock alert level
  - `created_at`, `updated_at` (timestamp)

  ### 2. material_transactions
  Tracks all material stock movements (IN/OUT)
  - `id` (uuid, primary key)
  - `material_id` (uuid, foreign key) - reference to materials
  - `transaction_type` (text) - IN (purchase) or OUT (usage)
  - `quantity` (decimal) - quantity moved
  - `cost_per_unit` (decimal) - cost per unit at transaction time
  - `total_cost` (decimal) - total transaction cost
  - `reference_type` (text) - type of reference (PURCHASE, SALE, PRODUCTION, WASTE, ADJUSTMENT)
  - `reference_id` (uuid) - ID of the referencing record
  - `notes` (text) - transaction notes
  - `transaction_date` (timestamp)
  - `created_at` (timestamp)

  ### 3. products
  Stores finished products/menu items
  - `id` (uuid, primary key)
  - `name` (text) - product name
  - `description` (text) - product description
  - `selling_price` (decimal) - selling price per unit
  - `standard_hpp` (decimal) - calculated standard HPP from recipe
  - `category` (text) - product category
  - `is_active` (boolean) - active status
  - `created_at`, `updated_at` (timestamp)

  ### 4. recipes
  Bill of Materials - defines material requirements for each product
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key) - reference to products
  - `material_id` (uuid, foreign key) - reference to materials
  - `quantity_needed` (decimal) - quantity of material needed
  - `yield_portions` (decimal) - how many portions this recipe yields
  - `notes` (text)
  - `created_at`, `updated_at` (timestamp)

  ### 5. sales
  Sales transaction headers
  - `id` (uuid, primary key)
  - `sale_number` (text) - unique sale number
  - `sale_date` (timestamp)
  - `total_amount` (decimal) - total sale amount
  - `total_hpp` (decimal) - total HPP for this sale
  - `total_margin` (decimal) - total margin
  - `notes` (text)
  - `created_at` (timestamp)

  ### 6. sale_items
  Sales transaction details
  - `id` (uuid, primary key)
  - `sale_id` (uuid, foreign key) - reference to sales
  - `product_id` (uuid, foreign key) - reference to products
  - `quantity` (decimal) - quantity sold
  - `selling_price` (decimal) - selling price at sale time
  - `actual_hpp` (decimal) - actual HPP calculated from current material costs
  - `margin` (decimal) - margin for this item
  - `created_at` (timestamp)

  ### 7. production_batches
  Production batch records
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key) - reference to products
  - `batch_number` (text) - unique batch number
  - `quantity_produced` (decimal) - quantity produced in this batch
  - `production_date` (timestamp)
  - `actual_cost` (decimal) - actual production cost
  - `notes` (text)
  - `created_at` (timestamp)

  ### 8. waste_records
  Waste and shrinkage tracking
  - `id` (uuid, primary key)
  - `material_id` (uuid, foreign key) - reference to materials
  - `quantity` (decimal) - quantity wasted
  - `cost` (decimal) - cost of waste
  - `reason` (text) - reason for waste
  - `waste_date` (timestamp)
  - `created_at` (timestamp)

  ## Security
  - RLS enabled on all tables
  - Policies allow authenticated users to perform all operations
  - Can be customized for role-based access control later

  ## Indexes
  - Foreign key indexes for better query performance
  - Date indexes for reporting queries
*/

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL,
  current_stock decimal(15,3) DEFAULT 0,
  average_cost decimal(15,2) DEFAULT 0,
  min_stock decimal(15,3) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create material_transactions table
CREATE TABLE IF NOT EXISTS material_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
  quantity decimal(15,3) NOT NULL,
  cost_per_unit decimal(15,2) NOT NULL,
  total_cost decimal(15,2) NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid,
  notes text,
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  selling_price decimal(15,2) DEFAULT 0,
  standard_hpp decimal(15,2) DEFAULT 0,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recipes (BOM) table
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity_needed decimal(15,3) NOT NULL,
  yield_portions decimal(10,2) DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, material_id)
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text UNIQUE NOT NULL,
  sale_date timestamptz DEFAULT now(),
  total_amount decimal(15,2) DEFAULT 0,
  total_hpp decimal(15,2) DEFAULT 0,
  total_margin decimal(15,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity decimal(10,2) NOT NULL,
  selling_price decimal(15,2) NOT NULL,
  actual_hpp decimal(15,2) DEFAULT 0,
  margin decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create production_batches table
CREATE TABLE IF NOT EXISTS production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number text UNIQUE NOT NULL,
  quantity_produced decimal(10,2) NOT NULL,
  production_date timestamptz DEFAULT now(),
  actual_cost decimal(15,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create waste_records table
CREATE TABLE IF NOT EXISTS waste_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity decimal(15,3) NOT NULL,
  cost decimal(15,2) DEFAULT 0,
  reason text,
  waste_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_material_transactions_material_id ON material_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_transactions_date ON material_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_material_id ON recipes(material_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_product_id ON production_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_waste_records_material_id ON waste_records(material_id);

-- Enable Row Level Security
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_records ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (allowing all operations for authenticated users)
-- Materials policies
CREATE POLICY "Authenticated users can view materials"
  ON materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update materials"
  ON materials FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete materials"
  ON materials FOR DELETE
  TO authenticated
  USING (true);

-- Material transactions policies
CREATE POLICY "Authenticated users can view material_transactions"
  ON material_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert material_transactions"
  ON material_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update material_transactions"
  ON material_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete material_transactions"
  ON material_transactions FOR DELETE
  TO authenticated
  USING (true);

-- Products policies
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Recipes policies
CREATE POLICY "Authenticated users can view recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (true);

-- Sales policies
CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (true);

-- Sale items policies
CREATE POLICY "Authenticated users can view sale_items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sale_items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sale_items"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sale_items"
  ON sale_items FOR DELETE
  TO authenticated
  USING (true);

-- Production batches policies
CREATE POLICY "Authenticated users can view production_batches"
  ON production_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert production_batches"
  ON production_batches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update production_batches"
  ON production_batches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete production_batches"
  ON production_batches FOR DELETE
  TO authenticated
  USING (true);

-- Waste records policies
CREATE POLICY "Authenticated users can view waste_records"
  ON waste_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert waste_records"
  ON waste_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update waste_records"
  ON waste_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete waste_records"
  ON waste_records FOR DELETE
  TO authenticated
  USING (true);