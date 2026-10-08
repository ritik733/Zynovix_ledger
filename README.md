# Zynovix Ledger - Personal Expense + Borrow/Lending Logger

A modern, responsive, production-ready web application built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase PostgreSQL**. Designed for effortless day-to-day expense tracking and comprehensive borrow/lending balance accounting with ageing analysis.

---

## 🚀 Key Highlights & Architectural Features

1. **Two Core Transaction Pillars**:
   - **Expenses**: Categorized daily spending (Food, Travel, Rent, Bills, Shopping, etc.) with configurable categories.
   - **Borrow & Lending**: Full dual-direction credit ledger.
     - *Borrow*: I receive money from someone → I owe them.
     - *Lending*: I give money to someone → They owe me.

2. **Simultaneous Borrow + Lending with the Same Person**:
   - A single person (e.g., *Rahul*) can have both Borrow (₹10,000) and Lending (₹3,000) records active simultaneously.
   - **Never auto-merged or collapsed into a single balance**: Original transactions remain individually visible and traceable.
   - Net position is clearly calculated: I owe ₹10,000, He owes me ₹3,000 → Net: -₹7,000 (Payable).

3. **Partial & Full Repayments / Settlements**:
   - Original borrow/lending transactions are preserved intact.
   - Repayments are tracked as child records in a dedicated `settlements` relation.
   - Automatic database & frontend constraints prevent settlement amounts from exceeding the remaining pending balance.
   - Supports multiple incremental repayments against a single original transaction.

4. **Mandatory Remark Rule**:
   - **Remark is strictly mandatory** across all forms (Expense, Borrow, Lending, Repayment/Settlement).
   - Form submission is blocked with descriptive validation if the remark is empty or whitespace.
   - Enforced by both UI validation and PostgreSQL table constraints (`length(trim(remark)) > 0`).

5. **Ageing Analysis**:
   - Real-time ageing breakdown computed from the original transaction date:
     - `0–7 days`
     - `8–30 days`
     - `31–60 days`
     - `61–90 days`
     - `90+ days`
   - Separate tables for Lending Ageing and Borrowing Ageing, tracking count of transactions and pending amounts.

6. **Expense Dashboard & Visual Analytics**:
   - Date period selectors: *This Week*, *Last Week*, *This Month*, *Last Month*, *This Quarter*, *Last Quarter*, *This Year*, *Custom Date Range*.
   - Key financial KPI cards: Total Expense, Average Daily Expense, Highest Expense, Number of Transactions, Top Expense Category, and Period-over-Period comparison (e.g. +18.9% increase).
   - Dynamic charts powered by Recharts: Category Breakdown (Donut chart), Expense Trend Over Time (Area chart), and Category Comparison (Bar chart).
   - **Automatic Dynamic Insights**: Generated automatically from real database values (e.g. *"Food is your highest spending category this month at ₹4,200"*).

7. **Central Transactions View & CSV Export**:
   - Searchable by remark, person, category, payment method, or amount.
   - Filters for Transaction Type, Status (Pending, Partially Settled, Settled, Completed), Category, Person, and Date Range.
   - 1-click **Export to CSV** matching the currently active filters.

8. **Mobile-First UX**:
   - Floating quick `+` entry button.
   - Responsive layouts optimized for single-hand mobile operation.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS)
- **Visualizations**: Recharts
- **Icons**: Lucide React
- **Date Utilities**: Date-fns
- **Deployment**: Vercel ready

---

## 📦 Project Structure

```text
├── app/
│   ├── globals.css              # Tailwind CSS base styles
│   ├── layout.tsx               # Root layout with AppShell and metadata
│   ├── page.tsx                 # Account Balance Dashboard (Home)
│   ├── expenses/page.tsx        # Expense Dashboard & Visual Analytics
│   ├── transactions/page.tsx    # Central Transaction Ledger & CSV Export
│   ├── people/page.tsx          # People & Contacts Management
│   └── settings/page.tsx        # Settings, Categories, & Scenarios Loader
├── components/
│   ├── layout/                  # Navbar, MobileNav, AppShell
│   ├── dashboard/               # AccountBalanceDashboard
│   ├── expenses/                # ExpenseDashboard
│   ├── transactions/            # TransactionsView
│   ├── people/                  # PeopleView
│   ├── settings/                # SettingsView
│   └── modals/                  # AddTransactionModal, SettleModal, PersonDetailModal,
│                                # EditTransactionModal, DeleteConfirmModal
├── lib/
│   ├── financial-logic.ts       # Core ledger business rules, ageing buckets, net positions
│   ├── store-context.tsx        # Global store with Supabase sync & offline demo fallback
│   ├── constants.ts             # Default categories, payment methods, currency formatters
│   ├── export-csv.ts            # Filter-aware CSV exporter
│   ├── seed-data.ts             # Built-in verification seed data for Scenarios 1 to 6
│   └── supabase/                # Supabase browser client factory & config helpers
├── supabase/
│   └── migrations/
│       └── 20261008000000_init_ledger.sql  # Complete schema, RLS, triggers & views
└── scripts/
    └── verify-scenarios.ts      # Automated scenario verification test suite
```

---

## 🗄️ Supabase Database Setup

1. In your [Supabase Dashboard](https://supabase.com/dashboard), navigate to **SQL Editor**.
2. Copy and paste the entire script from `supabase/migrations/20261008000000_init_ledger.sql`.
3. Click **Run**.
4. The migration will:
   - Create tables: `profiles`, `categories`, `people`, `transactions`, `settlements`.
   - Create constraints: `amount > 0`, non-empty `remark`, mandatory `person_id` for borrow/lending.
   - Create the `check_settlement_amount_limit` trigger to prevent over-settlement.
   - Create calculation views: `view_transactions_summary` and `view_person_summary`.
   - Enable Row Level Security (RLS) on all tables with user isolation policies.
   - Pre-seed standard expense categories (Food, Travel, Rent, Bills, Shopping, etc.).

---

## ⚙️ Environment Variables

Create `.env.local` in the project root (or set in your Vercel Project Settings):

```env
RITIK_SUPABASE_URL=https://your-project.supabase.co
RITIK_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

*Note: If no Supabase credentials are provided, the application automatically runs in an interactive **Local Demo Mode** with persistent storage and seed data, displaying a friendly badge in the header.*

---

## 🧪 Verification of Scenarios (Section 28)

An automated verification test is included:

```bash
npx tsx scripts/verify-scenarios.ts
```

Output:
```text
--- RUNNING SCENARIO VERIFICATION SUITE ---
Rahul: I Owe = ₹6000, They Owe Me = ₹3000, Net = ₹-3000
✓ Scenario 1, 3, and 4 Verified: Independent borrow & lending with partial repayment!
✓ Scenario 2 and 5 Verified: Lending with partial repayment!
✓ Scenario 6 Verified: 95+ days unpaid loan appears in 90+ days ageing bucket!
✓ Mandatory Remark validation verified across all records!
--- ALL SCENARIOS 1 TO 6 VERIFIED SUCCESSFULLY ---
```

In the app UI, navigate to **Settings** and click **"Load Test Scenarios"** to instantly verify Rahul, Amit, Neha, and Vikram in the visual dashboards!

---

## 🚢 Deploying to Vercel

1. Push this repository to GitHub or GitLab.
2. In [Vercel](https://vercel.com), click **Add New Project** and import the repository.
3. Add the two environment variables:
   - `RITIK_SUPABASE_URL`
   - `RITIK_SUPABASE_PUBLISHABLE_KEY`
4. Deploy! Next.js 16 compiles and deploys seamlessly.
