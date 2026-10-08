-- ==============================================================================
-- Personal Expense + Borrow/Lending Logger Database Schema
-- Supabase PostgreSQL Migration
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles (User Account / Settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    currency TEXT NOT NULL DEFAULT '₹',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. Expense Categories
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means default system category
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'tag',
    color TEXT DEFAULT '#3B82F6',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT categories_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Unique category per user (or system category)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name 
ON public.categories (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- ------------------------------------------------------------------------------
-- 3. People (for Borrow / Lending)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT people_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT people_user_name_unique UNIQUE(user_id, name)
);

-- ------------------------------------------------------------------------------
-- 4. Transactions (Expense, Borrow, Lending)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('expense', 'borrow', 'lending')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    person_id UUID REFERENCES public.people(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    payment_method TEXT,
    remark TEXT NOT NULL,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Constraints
    CONSTRAINT transactions_remark_not_empty CHECK (length(trim(remark)) > 0),
    CONSTRAINT transactions_person_required_for_borrow_lending CHECK (
        (type = 'expense') OR (type IN ('borrow', 'lending') AND person_id IS NOT NULL)
    )
);

-- ------------------------------------------------------------------------------
-- 5. Settlements (Repayments against Borrow / Lending transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT,
    remark TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Constraints
    CONSTRAINT settlements_remark_not_empty CHECK (length(trim(remark)) > 0)
);

-- ------------------------------------------------------------------------------
-- 6. Indexes for Performance
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_person ON public.transactions(person_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_settlements_transaction ON public.settlements(transaction_id);
CREATE INDEX IF NOT EXISTS idx_settlements_user_date ON public.settlements(user_id, settlement_date DESC);
CREATE INDEX IF NOT EXISTS idx_people_user ON public.people(user_id);

-- ------------------------------------------------------------------------------
-- 7. Settlement Amount Validation Trigger
-- Ensures a repayment cannot exceed the remaining pending balance of the transaction
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_settlement_amount_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_orig_amount NUMERIC(14, 2);
    v_total_settled NUMERIC(14, 2);
    v_trans_type TEXT;
BEGIN
    -- Get original transaction amount & type
    SELECT amount, type INTO v_orig_amount, v_trans_type
    FROM public.transactions
    WHERE id = NEW.transaction_id AND is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target transaction does not exist or has been deleted.';
    END IF;

    IF v_trans_type = 'expense' THEN
        RAISE EXCEPTION 'Cannot record a settlement on an expense transaction.';
    END IF;

    -- Calculate existing settlements excluding the current one if updating
    SELECT COALESCE(SUM(amount), 0) INTO v_total_settled
    FROM public.settlements
    WHERE transaction_id = NEW.transaction_id 
      AND is_deleted = false
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF (v_total_settled + NEW.amount) > v_orig_amount THEN
        RAISE EXCEPTION 'Settlement amount (%) exceeds remaining pending balance (%).', 
            NEW.amount, (v_orig_amount - v_total_settled);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_settlement_limit ON public.settlements;
CREATE TRIGGER trg_check_settlement_limit
    BEFORE INSERT OR UPDATE ON public.settlements
    FOR EACH ROW
    WHEN (NEW.is_deleted = false)
    EXECUTE FUNCTION public.check_settlement_amount_limit();

-- ------------------------------------------------------------------------------
-- 8. Views for Real-Time Financial Calculations & Ageing
-- ------------------------------------------------------------------------------

-- Transaction Summary View (Pending amounts, Days outstanding, Ageing buckets)
CREATE OR REPLACE VIEW public.view_transactions_summary AS
SELECT 
    t.id,
    t.user_id,
    t.type,
    t.amount AS original_amount,
    t.transaction_date,
    t.person_id,
    p.name AS person_name,
    t.category_id,
    c.name AS category_name,
    t.payment_method,
    t.remark,
    t.notes,
    t.is_deleted,
    t.created_at,
    t.updated_at,
    COALESCE(s.total_settled, 0) AS total_settled,
    CASE 
        WHEN t.type = 'expense' THEN 0
        ELSE (t.amount - COALESCE(s.total_settled, 0))
    END AS pending_amount,
    CASE
        WHEN t.type = 'expense' THEN 'completed'
        WHEN (t.amount - COALESCE(s.total_settled, 0)) <= 0 THEN 'settled'
        WHEN COALESCE(s.total_settled, 0) > 0 THEN 'partially_settled'
        ELSE 'pending'
    END AS status,
    (CURRENT_DATE - t.transaction_date) AS days_outstanding,
    CASE
        WHEN (CURRENT_DATE - t.transaction_date) <= 7 THEN '0-7 days'
        WHEN (CURRENT_DATE - t.transaction_date) <= 30 THEN '8-30 days'
        WHEN (CURRENT_DATE - t.transaction_date) <= 60 THEN '31-60 days'
        WHEN (CURRENT_DATE - t.transaction_date) <= 90 THEN '61-90 days'
        ELSE '90+ days'
    END AS ageing_bucket
FROM public.transactions t
LEFT JOIN public.people p ON t.person_id = p.id
LEFT JOIN public.categories c ON t.category_id = c.id
LEFT JOIN (
    SELECT transaction_id, SUM(amount) AS total_settled
    FROM public.settlements
    WHERE is_deleted = false
    GROUP BY transaction_id
) s ON t.id = s.transaction_id
WHERE t.is_deleted = false;

-- Person Summary View (I Owe, They Owe Me, Net Position, Oldest Pending)
CREATE OR REPLACE VIEW public.view_person_summary AS
WITH person_calc AS (
    SELECT 
        p.id AS person_id,
        p.user_id,
        p.name AS person_name,
        p.phone,
        p.email,
        p.notes,
        p.created_at,
        -- Total Borrowed & Settled
        COALESCE(SUM(CASE WHEN t.type = 'borrow' THEN t.amount ELSE 0 END), 0) AS total_borrowed,
        COALESCE(SUM(CASE WHEN t.type = 'borrow' THEN COALESCE(v.total_settled, 0) ELSE 0 END), 0) AS total_borrowed_settled,
        COALESCE(SUM(CASE WHEN t.type = 'borrow' THEN v.pending_amount ELSE 0 END), 0) AS i_owe,
        
        -- Total Lent & Settled
        COALESCE(SUM(CASE WHEN t.type = 'lending' THEN t.amount ELSE 0 END), 0) AS total_lent,
        COALESCE(SUM(CASE WHEN t.type = 'lending' THEN COALESCE(v.total_settled, 0) ELSE 0 END), 0) AS total_lent_settled,
        COALESCE(SUM(CASE WHEN t.type = 'lending' THEN v.pending_amount ELSE 0 END), 0) AS they_owe_me,
        
        -- Oldest pending date among all transactions with pending > 0
        MIN(CASE WHEN v.pending_amount > 0 THEN t.transaction_date ELSE NULL END) AS oldest_pending_date,
        -- Average age of pending transactions
        AVG(CASE WHEN v.pending_amount > 0 THEN (CURRENT_DATE - t.transaction_date) ELSE NULL END) AS avg_outstanding_days,
        -- Count of pending transactions
        COUNT(CASE WHEN v.pending_amount > 0 THEN 1 ELSE NULL END) AS active_transactions_count
    FROM public.people p
    LEFT JOIN public.transactions t ON p.id = t.person_id AND t.is_deleted = false
    LEFT JOIN public.view_transactions_summary v ON t.id = v.id
    GROUP BY p.id, p.user_id, p.name, p.phone, p.email, p.notes, p.created_at
)
SELECT 
    person_id,
    user_id,
    person_name,
    phone,
    email,
    notes,
    created_at,
    total_borrowed,
    total_borrowed_settled,
    i_owe,
    total_lent,
    total_lent_settled,
    they_owe_me,
    (they_owe_me - i_owe) AS net_position,
    CASE 
        WHEN oldest_pending_date IS NOT NULL THEN (CURRENT_DATE - oldest_pending_date)
        ELSE 0
    END AS oldest_pending_days,
    oldest_pending_date,
    ROUND(COALESCE(avg_outstanding_days, 0), 1) AS avg_outstanding_days,
    active_transactions_count,
    CASE
        WHEN (they_owe_me - i_owe) > 0 THEN 'Receivable'
        WHEN (they_owe_me - i_owe) < 0 THEN 'Payable'
        WHEN (they_owe_me = 0 AND i_owe = 0) THEN 'Settled'
        ELSE 'Balanced'
    END AS status
FROM person_calc;

-- ------------------------------------------------------------------------------
-- 9. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can manage own profile"
    ON public.profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Categories: Users can view system categories or their own categories
CREATE POLICY "Users can view categories"
    ON public.categories
    FOR SELECT
    USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage own categories"
    ON public.categories
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- People: Users can view and manage only their own people
CREATE POLICY "Users can manage own people"
    ON public.people
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Transactions: Users can view and manage only their own transactions
CREATE POLICY "Users can manage own transactions"
    ON public.transactions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Settlements: Users can view and manage only their own settlements
CREATE POLICY "Users can manage own settlements"
    ON public.settlements
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 10. Default System Categories Seed
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (name, icon, color, is_system)
VALUES
    ('Food', 'utensils', '#F59E0B', true),
    ('Travel', 'plane', '#3B82F6', true),
    ('Shopping', 'shopping-bag', '#EC4899', true),
    ('Bills', 'receipt', '#8B5CF6', true),
    ('Entertainment', 'film', '#10B981', true),
    ('Health', 'heart-pulse', '#EF4444', true),
    ('Education', 'graduation-cap', '#6366F1', true),
    ('Rent', 'home', '#14B8A6', true),
    ('Utilities', 'zap', '#F97316', true),
    ('Fuel', 'fuel', '#D97706', true),
    ('Subscription', 'credit-card', '#06B6D4', true),
    ('Other', 'folder', '#6B7280', true)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 11. Profile Auto-Creation on Supabase Auth Sign Up
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
