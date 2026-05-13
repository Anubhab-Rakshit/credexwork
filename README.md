# SpendLens - AI Spend Audit

SpendLens is a free AI spend audit tool for startup founders and engineering leaders. It analyzes your current AI tool stack, flags plan mismatches or redundant spend, and quantifies realistic monthly + annual savings.

## Demo
- Live URL: (add once deployed)
- Screenshots (add 3+ images or a 30-second recording):
  - /public/screenshots/1.png
  - /public/screenshots/2.png
  - /public/screenshots/3.png

## Quick start
```bash
npm install
npm run dev
```

## Deploy
- Vercel: set env vars, then `npm run build`

## Supabase schema (required)
Run this in Supabase SQL editor:
```sql
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  share_id text not null unique default substring(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now(),
  team_size integer not null,
  use_case text not null,
  tools_input jsonb not null,
  audit_results jsonb not null,
  ai_summary text,
  total_monthly_savings numeric not null,
  total_annual_savings numeric not null,
  savings_category text not null
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  email text not null,
  company_name text,
  role text,
  team_size integer,
  is_high_savings boolean not null default false,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_audits_share_id on public.audits(share_id);
create index if not exists idx_leads_audit_id on public.leads(audit_id);

alter table public.audits enable row level security;
alter table public.leads enable row level security;

create policy "audits_public_read"
on public.audits for select
using (true);
```

## Decisions
1. Used Next.js App Router for server + API routes in one deployable surface.
2. Persisted form state in localStorage to avoid account creation and reduce friction.
3. Kept audit engine deterministic and human-auditable instead of using AI for pricing logic.
4. Chose Supabase + Resend for fast backend setup with production-ready email.
5. Favor a warm, editorial UI over a generic SaaS look to increase trust and shareability.

## Environment variables
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL` (Supabase project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase service role key)
- `GEMINI_API_KEY` (Gemini API key for summaries)
- `GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash`)
- `RESEND_API_KEY` (Resend API key)
- `RESEND_FROM_EMAIL` (Verified Resend sender)

## Documentation
- **[PROMPTS.md](file:///Users/anubhabrakshit/Projects/Intern/credexwork/PROMPTS.md)**: Full LLM prompts, rationale, and failure cases.
- **[GTM.md](file:///Users/anubhabrakshit/Projects/Intern/credexwork/GTM.md)**: Go-To-Market strategy, target personas, and distribution channels.
- **[ECONOMICS.md](file:///Users/anubhabrakshit/Projects/Intern/credexwork/ECONOMICS.md)**: Unit economics, lead valuation, and the path to $1M ARR.
- **[ARCHITECTURE.md](file:///Users/anubhabrakshit/Projects/Intern/credexwork/ARCHITECTURE.md)**: Technical architecture and data flow.
- **[REFLECTION.md](file:///Users/anubhabrakshit/Projects/Intern/credexwork/REFLECTION.md)**: Weekly project reflection and self-ratings.
- **[DEVLOG.md](file:///Users/anubhabrakshit/Projects/Intern/credexwork/DEVLOG.md)**: Daily progress and learning logs.
- **[PRICING_DATA.md](file:///Users/anubhabrakshit/Projects/Intern/credexwork/PRICING_DATA.md)**: Verified 2026 pricing benchmarks for the audit engine.
