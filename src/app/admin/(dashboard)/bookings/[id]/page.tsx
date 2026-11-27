import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deletePayment } from "@/app/admin/actions";
import { DetailsForm } from "@/components/admin/DetailsForm";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { StatusActions } from "@/components/admin/StatusActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatTime, nightsBetween, todayISO } from "@/lib/dates";
import { STATUS_LABEL, formatMoney } from "@/lib/format";
import type { Booking, BookingEvent, Payment } from "@/lib/types";

export const metadata = { title: "Booking" };

export default function BookingPage({ params }: PageProps<"/admin/bookings/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-100" />}>
      <BookingDetail params={params} />
    </Suspense>
  );
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  upi: "UPI",
  card: "Card",
  other: "Other",
};

async function BookingDetail({ params }: Pick<PageProps<"/admin/bookings/[id]">, "params">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const { data: booking } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle<Booking>();
  if (!booking) notFound();

  const [{ data: payments }, { data: events }, { data: overlaps }, { data: property }] = await Promise.all([
    supabase.from("payments").select("*").eq("booking_id", id).order("paid_on"),
    supabase.from("booking_events").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, reference, full_name, status, check_in, check_out")
      .eq("property_id", booking.property_id)
      .neq("id", id)
      .in("status", ["enquiry", "confirmed", "completed", "blocked"])
      .lt("check_in", booking.check_out)
      .gt("check_out", booking.check_in),
    supabase.from("properties").select("name, check_in_time, check_out_time").eq("id", booking.property_id).single(),
  ]);

  const pays = (payments ?? []) as Payment[];
  const paid = pays.reduce((s, p) => s + (p.kind === "refund" ? -1 : 1) * Number(p.amount), 0);
  const balance = booking.total_amount != null ? Number(booking.total_amount) - paid : null;
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const isBlock = booking.status === "blocked";

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-900">← All bookings</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{booking.full_name}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Ref <span className="font-mono">{booking.reference}</span> · received {new Date(booking.created_at).toLocaleString("en-GB")}
          </p>
        </div>
        <StatusActions id={booking.id} status={booking.status} />
      </div>

      {overlaps && overlaps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Overlapping bookings for these dates:</p>
          <ul className="mt-1 list-inside list-disc">
            {overlaps.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/bookings/${o.id}`} className="underline">
                  {o.full_name} ({o.reference})
                </Link>{" "}
                — {STATUS_LABEL[o.status as Booking["status"]]}, {formatDate(o.check_in)} → {formatDate(o.check_out)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Stay</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-zinc-500">Property</dt>
            <dd>{property?.name}</dd>
            <dt className="text-zinc-500">Check-in</dt>
            <dd>{formatDate(booking.check_in, { weekday: "short" })}{property && `, ${formatTime(property.check_in_time)}`}</dd>
            <dt className="text-zinc-500">Check-out</dt>
            <dd>{formatDate(booking.check_out, { weekday: "short" })}{property && `, ${formatTime(property.check_out_time)}`}</dd>
            <dt className="text-zinc-500">Nights</dt>
            <dd>{nights}</dd>
            {!isBlock && (
              <>
                <dt className="text-zinc-500">Contact 1</dt>
                <dd><a className="text-emerald-700 underline" href={`tel:${booking.phone_1}`}>{booking.phone_1}</a></dd>
                <dt className="text-zinc-500">Contact 2</dt>
                <dd>{booking.phone_2 ? <a className="text-emerald-700 underline" href={`tel:${booking.phone_2}`}>{booking.phone_2}</a> : "—"}</dd>
                <dt className="text-zinc-500">Message</dt>
                <dd className="whitespace-pre-wrap">{booking.guest_message || "—"}</dd>
              </>
            )}
          </dl>
          {!isBlock && (
            <a
              href={`https://wa.me/${booking.phone_1.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Open WhatsApp chat
            </a>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Amount &amp; notes</h2>
          <DetailsForm id={booking.id} totalAmount={booking.total_amount} adminNotes={booking.admin_notes} />
        </section>
      </div>

      {!isBlock && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Payments (received outside the platform)</h2>
            <div className="flex gap-4 text-sm">
              <span>Total: <b>{formatMoney(booking.total_amount)}</b></span>
              <span>Paid: <b className="text-emerald-700">{formatMoney(paid)}</b></span>
              <span>Balance: <b className={balance && balance > 0 ? "text-red-600" : ""}>{formatMoney(balance)}</b></span>
            </div>
          </div>

          {pays.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="pr-3">Type</th>
                    <th className="pr-3">Method</th>
                    <th className="pr-3">Reference</th>
                    <th className="pr-3 text-right">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pays.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 pr-3">{formatDate(p.paid_on)}</td>
                      <td className="pr-3 capitalize">{p.kind}</td>
                      <td className="pr-3">{METHOD_LABEL[p.method]}</td>
                      <td className="pr-3 text-zinc-600">{p.reference || "—"}{p.notes && <div className="text-xs text-zinc-400">{p.notes}</div>}</td>
                      <td className={`pr-3 text-right font-medium ${p.kind === "refund" ? "text-red-600" : ""}`}>
                        {p.kind === "refund" ? "−" : ""}{formatMoney(Number(p.amount))}
                      </td>
                      <td className="text-right">
                        <form action={deletePayment}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="booking_id" value={booking.id} />
                          <button className="text-xs text-zinc-400 hover:text-red-600">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaymentForm bookingId={booking.id} today={todayISO()} />
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">History</h2>
        <ul className="space-y-1 text-sm">
          {((events ?? []) as BookingEvent[]).map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="w-40 shrink-0 text-zinc-500">{new Date(e.created_at).toLocaleString("en-GB")}</span>
              <span>
                {e.from_status ? `${STATUS_LABEL[e.from_status]} → ` : "Created as "}
                <b>{STATUS_LABEL[e.to_status]}</b>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
