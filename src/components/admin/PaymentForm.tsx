"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPayment } from "@/app/admin/actions";
import { ActionMessage } from "@/components/admin/ActionMessage";
import type { ActionState } from "@/lib/types";

const input = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

export function PaymentForm({ bookingId, today }: { bookingId: string; today: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addPayment, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3 rounded-xl bg-zinc-50 p-4">
      <h3 className="text-sm font-semibold">Record a payment</h3>
      <input type="hidden" name="booking_id" value={bookingId} />
      <div className="grid gap-3 sm:grid-cols-5">
        <label className="text-xs text-zinc-600">
          Amount
          <input name="amount" type="number" min="0.01" step="0.01" required className={input} />
        </label>
        <label className="text-xs text-zinc-600">
          Type
          <select name="kind" defaultValue="advance" className={input}>
            <option value="advance">Advance</option>
            <option value="balance">Balance</option>
            <option value="refund">Refund</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Method
          <select name="method" defaultValue="upi" className={input}>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Paid on
          <input name="paid_on" type="date" defaultValue={today} required className={input} />
        </label>
        <label className="text-xs text-zinc-600">
          Txn reference
          <input name="reference" maxLength={120} className={input} />
        </label>
      </div>
      <input name="notes" placeholder="Notes (optional)" maxLength={1000} className={input} />
      <ActionMessage state={state} />
      <button disabled={pending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
        {pending ? "Saving…" : "Add payment"}
      </button>
    </form>
  );
}
