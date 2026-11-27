"use client";

import { useActionState, useMemo, useState } from "react";
import { submitEnquiry } from "@/app/actions";
import { Calendar, type DayTone } from "@/components/Calendar";
import { addDays, formatDate, formatTime, nightsBetween, occupiedNights } from "@/lib/dates";
import type { ActionState, DateRange } from "@/lib/types";

type Props = {
  today: string;
  maxDate: string;
  unavailable: DateRange[];
  checkInTime: string;
  checkOutTime: string;
};

const MAX_NIGHTS = 30;

export function BookingWidget({ today, maxDate, unavailable, checkInTime, checkOutTime }: Props) {
  const busy = useMemo(() => occupiedNights(unavailable), [unavailable]);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitEnquiry, null);

  const toneOf = (d: string): DayTone => {
    if (d < today || d > maxDate) return "past";
    return busy.has(d) ? "busy" : "free";
  };

  /** Is every night in [from, to) free? */
  const rangeFree = (from: string, to: string) => {
    for (let d = from; d < to; d = addDays(d, 1)) if (busy.has(d)) return false;
    return true;
  };

  const choosingCheckout = checkIn !== null && checkOut === null;

  const isSelectable = (d: string) => {
    if (d < today || d > maxDate) return false;
    if (choosingCheckout && d > checkIn!) {
      // Checkout day may itself be booked from 2PM (we leave at 11AM).
      return nightsBetween(checkIn!, d) <= MAX_NIGHTS && rangeFree(checkIn!, d);
    }
    return !busy.has(d);
  };

  const onSelect = (d: string) => {
    if (choosingCheckout && d > checkIn!) {
      setCheckOut(d);
    } else {
      setCheckIn(d);
      setCheckOut(null);
    }
  };

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <h3 className="text-lg font-semibold">Enquiry sent ✓</h3>
        <p className="mt-2">{state.message}</p>
        {state.reference && (
          <p className="mt-3 text-sm">
            Your reference: <span className="font-mono font-semibold">{state.reference}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">1. Choose your dates</h2>
          <p className="text-sm text-zinc-600">
            {checkIn === null
              ? "Tap your check-in date."
              : checkOut === null
                ? "Now tap your check-out date."
                : "Dates selected. Tap a date to start over."}
          </p>
        </div>
        <Calendar
          today={today}
          toneOf={toneOf}
          selectedStart={checkIn}
          selectedEnd={checkOut}
          onSelect={onSelect}
          isSelectable={isSelectable}
          minMonth={today.slice(0, 8) + "01"}
          maxMonth={maxDate.slice(0, 8) + "01"}
        />
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-600">
          <Legend className="bg-white ring-1 ring-zinc-300" label="Available" />
          <Legend className="bg-red-500" label="Booked / not available" />
          <Legend className="bg-emerald-600" label="Your selection" />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Check-in {formatTime(checkInTime)} · Check-out {formatTime(checkOutTime)} (next day).
          Each date on the calendar represents the night starting that day.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">2. Your details</h2>

        <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm">
          {checkIn ? (
            <>
              <div className="flex justify-between">
                <span className="text-zinc-500">Check-in</span>
                <span className="font-medium">
                  {formatDate(checkIn, { weekday: "short" })}, {formatTime(checkInTime)}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-zinc-500">Check-out</span>
                <span className="font-medium">
                  {checkOut ? `${formatDate(checkOut, { weekday: "short" })}, ${formatTime(checkOutTime)}` : "—"}
                </span>
              </div>
              {nights > 0 && (
                <div className="mt-2 border-t border-zinc-200 pt-2 text-right font-semibold">
                  {nights} night{nights > 1 ? "s" : ""}
                </div>
              )}
            </>
          ) : (
            <span className="text-zinc-500">No dates selected yet.</span>
          )}
        </div>

        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="check_in" value={checkIn ?? ""} />
          <input type="hidden" name="check_out" value={checkOut ?? ""} />
          {/* Honeypot (hidden from humans) */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

          <Field label="Full name" name="full_name" autoComplete="name" required maxLength={120} />
          <Field label="Contact no. 1" name="phone_1" type="tel" autoComplete="tel" required maxLength={20} placeholder="+91 98765 43210" />
          <Field label="Contact no. 2 (optional)" name="phone_2" type="tel" maxLength={20} />
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Message (optional)</span>
            <textarea
              name="message"
              rows={2}
              maxLength={1000}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Number of guests, special requests…"
            />
          </label>

          {state && !state.ok && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !checkIn || !checkOut}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {pending ? "Sending…" : "Send enquiry"}
          </button>
          <p className="text-xs text-zinc-500">
            Sending an enquiry doesn&apos;t confirm the booking. We&apos;ll call you to confirm and arrange the advance payment.
            Your details are used only to handle this booking.
          </p>
        </form>
      </section>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3.5 w-3.5 rounded ${className}`} />
      {label}
    </span>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </label>
  );
}
