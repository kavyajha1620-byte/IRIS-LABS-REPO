# IrisLabs CRM — Cold Calling & Lead Management

A complete cold-calling CRM for a solo salesperson. Track leads, log calls, schedule follow-ups, move deals through a drag-and-drop pipeline, manage tasks and measure results.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript, Tailwind CSS 4)
- **Supabase** (Postgres, Auth, Row Level Security)
- **Recharts** (charts), **date-fns**, **PapaParse** (CSV import)

## Getting started

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open **SQL Editor** and run `supabase/migrations/0001_schema.sql` (tables, triggers, RLS).
3. Optional demo data: run `supabase/migrations/0002_seed.sql` to create the demo user **mario@irislabs.com / Mario123!** and 20 sample leads.
4. Under **Authentication → Providers** enable **Email** (and disable "Confirm email" if you prefer instant signups).

### 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in your project URL and key (Project Settings → API; new projects use the publishable key, older ones the anon key), then install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 — sign in with the demo user or create an account.

### 3. Production build

```bash
npm run build
npm start
```

## Features

- **Auth** — sign up, sign in, forgot/reset password (Supabase email auth)
- **Dashboard** — KPIs, calls per day, status donut, leads over time, pipeline funnel, today's & overdue follow-ups
- **Leads** — add, edit, delete, search, filter, sort, paginate; import via CSV (with column mapping + duplicate detection) and export to CSV
- **Lead detail** — full contact/company/history info, activity timeline, notes, follow-ups, call log
- **Calls** — log calls per lead (outcome → auto status change), full call history page
- **Follow-ups** — scheduled callbacks with Due Today / Overdue / Upcoming views
- **Pipeline** — drag & drop Kanban across 9 stages (New → Won/Lost)
- **Tasks** — personal task list with priorities and due dates
- **Analytics** — date-range KPIs, calls per day, lead creation, status breakdown, funnel
- **Notifications** — badge + popover for due/overdue follow-ups and task reminders

## Data model

`profiles`, `leads`, `calls`, `activities`, `notes`, `follow_ups`, `tasks`, `notifications` — all protected by row-level security scoped to the signed-in user.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |