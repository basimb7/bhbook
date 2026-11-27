# BH Booking — v1

Simple property booking app: customers pick dates on a calendar and send an enquiry; the owner confirms bookings, records payments received outside the platform, and closes them.

**Stack:** Next.js 16 (App Router, Server Actions) · Tailwind CSS 4 · Supabase (Postgres + Auth)

## Features

**Public (`/`)**
- Month calendar; booked / blocked nights shown **red**, past dates greyed out.
- Pick check-in then check-out (check-in 2 PM, check-out 11 AM next day — a guest can check in on another guest's check-out day).
- Enquiry form: Full name, Contact no. 1, Contact no. 2 (optional), message. Returns a booking reference.

**Admin (`/admin`)** — username + password login
- Dashboard: new enquiries, upcoming confirmed, today's check-ins; tabs by status; calendar overview (red = booked, amber = enquiry only).
- Booking detail: Confirm / Reject / Close (completed) / Cancel / Reopen, overlap warnings, tap-to-call and WhatsApp chat link.
- Record payments (advance / balance / refund; UPI, bank, cash, card) with running balance.
- Block dates (maintenance / personal use).
- Status history (audit trail).

## How double-booking is prevented

Enforced **in Postgres**, not just the UI — see [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql):

```sql
constraint bookings_no_overlap exclude using gist (property_id with =, stay with &&)
  where (status in ('confirmed', 'completed', 'blocked'))
```

`stay` is `[check_in, check_out)`, so back-to-back stays are allowed. Enquiries may overlap (several people can ask for the same dates); confirming a second overlapping one fails with a clear message.

## Booking lifecycle

```
enquiry ──confirm──▶ confirmed ──close──▶ completed
   │                    │
   └─reject─▶ rejected  └─cancel─▶ cancelled      (cancelled/rejected can be reopened)
blocked ──unblock──▶ cancelled
```

## Setup

1. **Create a Supabase project** → SQL Editor → run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql` (edit the property name first).
2. **Create the admin user:** Dashboard → Authentication → Users → *Add user* (auto-confirm). Then in SQL Editor:
   ```sql
   insert into public.profiles (id, username, full_name, role)
   select id, 'admin', 'Property Owner', 'admin' from auth.users where email = 'owner@example.com';
   ```
3. **Env:** `cp .env.example .env.local` and fill in values from Project Settings → API.
4. **Run:**
   ```bash
   npm install
   npm run dev
   ```
   Public page: http://localhost:3000 · Admin: http://localhost:3000/admin

Recommended: in Supabase → Authentication → Providers → Email, **disable "Allow new users to sign up"** so only you can create admin accounts.

## Security notes

- Guests never read the `bookings` table: RLS allows admins only. Public availability comes from `get_unavailable_ranges()` which returns dates only (no names/phones). Enquiries go through `create_enquiry()` which validates input.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and used solely to resolve username → email at login. Never prefix it with `NEXT_PUBLIC_` or commit it.
- Every admin page and server action re-checks the session and admin role (`requireAdmin()`); the proxy redirect is only a convenience.
- Honeypot field on the enquiry form. **TODO before going live:** add rate limiting / CAPTCHA (e.g. Cloudflare Turnstile) on enquiries.
- **Personal data:** names and phone numbers are stored. Add a privacy notice, and decide a retention period (e.g. purge guest contact details N months after checkout) — check local data-protection rules (GDPR / India DPDP Act as applicable).

## Project layout

```
src/
  app/
    page.tsx                     public calendar + enquiry
    actions.ts                   submitEnquiry server action
    admin/login/                 login page
    admin/(dashboard)/           dashboard + bookings/[id]
    admin/actions.ts             login, status, payments, block dates
  components/                    Calendar, BookingWidget, admin/*
  lib/
    supabase/                    server / public / service clients + proxy session refresh
    auth.ts                      requireAdmin() data-access guard
    notify.ts                    notification hook (email/WhatsApp later)
  proxy.ts                       refreshes session, gates /admin
supabase/migrations, seed.sql
```

## Roadmap ideas (v2+)

- Email + WhatsApp notifications — implement in `src/lib/notify.ts` (Resend / WhatsApp Cloud API).
- Multiple properties — schema already supports it (`properties` table, `property_id` on bookings); add a property picker / `/[slug]` route.
- Nightly pricing & seasonal rates, auto-calculated totals.
- Guest-facing enquiry status lookup by reference.
- Automated tests (Playwright for the booking flow; SQL tests for the overlap constraint).
