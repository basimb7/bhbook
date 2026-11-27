import Link from "next/link";
import { Suspense } from "react";
import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { BlockDatesForm } from "@/components/admin/BlockDatesForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { addDays, formatDate, nightsBetween, todayISO } from "@/lib/dates";
import { STATUS_LABEL, formatMoney } from "@/lib/format";
import type { Booking, BookingStatus } from "@/lib/types";

export const metadata = { title: "Bookings admin" };

const TABS: (BookingStatus | "all" | "upcoming")[] = [
  "enquiry",
  "upcoming",
  "confirmed",
  "completed",
  "blocked",
  "cancelled",
  "rejected",
  "all",
];

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-100" />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const tab = (typeof sp.status === "string" && TABS.includes(sp.status as never) ? sp.status : "enquiry") as (typeof TABS)[number];
  const today = todayISO();

  let query = supabase
    .from("bookings")
    .select("*")
    .order(tab === "upcoming" ? "check_in" : "created_at", { ascending: tab === "upcoming" })
    .limit(200);
  if (tab === "upcoming") query = query.eq("status", "confirmed").gte("check_out", today);
  else if (tab !== "all") query = query.eq("status", tab);

  const [{ data: list, error }, { data: calendarRows }, { count: enquiryCount }] = await Promise.all([
    query,
    supabase
      .from("bookings")
      .select("id, reference, check_in, check_out, status, full_name")
      .in("status", ["enquiry", "confirmed", "completed", "blocked"])
      .gte("check_out", addDays(today, -60))
      .lte("check_in", addDays(today, 400)),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "enquiry"),
  ]);
  if (error) throw new Error(error.message);

  const bookings = (list ?? []) as Booking[];
  const cal = (calendarRows ?? []) as Pick<Booking, "id" | "reference" | "check_in" | "check_out" | "status" | "full_name">[];
  const checkInsToday = cal.filter((b) => b.status === "confirmed" && b.check_in === today).length;
  const upcoming = cal.filter((b) => b.status === "confirmed" && b.check_out >= today).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="New enquiries" value={enquiryCount ?? 0} href="/admin?status=enquiry" tone="amber" />
        <Stat label="Upcoming confirmed" value={upcoming} href="/admin?status=upcoming" tone="emerald" />
        <Stat label="Check-ins today" value={checkInsToday} tone="sky" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 p-2">
            {TABS.map((t) => (
              <Link
                key={t}
                href={`/admin?status=${t}`}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                  t === tab ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {t === "all" ? "All" : t === "upcoming" ? "Upcoming" : STATUS_LABEL[t]}
              </Link>
            ))}
          </div>
          {bookings.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">Nothing here.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-zinc-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{b.full_name}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="text-xs text-zinc-500">
                        <span className="font-mono">{b.reference}</span>
                        {b.status !== "blocked" && <> · {b.phone_1}</>}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div>
                        {formatDate(b.check_in, { year: undefined })} → {formatDate(b.check_out)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {nightsBetween(b.check_in, b.check_out)} nights
                        {b.total_amount != null && <> · {formatMoney(b.total_amount)}</>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Calendar</h2>
            <AdminCalendar today={today} bookings={cal} />
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 font-semibold">Block dates</h2>
            <p className="mb-3 text-xs text-zinc-500">Mark dates unavailable (maintenance, personal use).</p>
            <BlockDatesForm today={today} />
          </section>
        </aside>
      </div>
    </div>
  );
}

const TONES = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  sky: "border-sky-200 bg-sky-50 text-sky-900",
};

function Stat({ label, value, href, tone }: { label: string; value: number; href?: string; tone: keyof typeof TONES }) {
  const body = (
    <div className={`rounded-2xl border p-4 ${TONES[tone]}`}>
      <div className="text-sm opacity-80">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
