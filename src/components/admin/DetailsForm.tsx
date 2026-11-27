"use client";

import { useActionState } from "react";
import { updateDetails } from "@/app/admin/actions";
import { ActionMessage } from "@/components/admin/ActionMessage";
import type { ActionState } from "@/lib/types";

export function DetailsForm({ id, totalAmount, adminNotes }: { id: string; totalAmount: number | null; adminNotes: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateDetails, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label className="block text-sm">
        <span className="text-zinc-600">Total amount agreed</span>
        <input name="total_amount" type="number" min="0" step="0.01" defaultValue={totalAmount ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">Internal notes</span>
        <textarea name="admin_notes" rows={4} maxLength={4000} defaultValue={adminNotes ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
      </label>
      <ActionMessage state={state} />
      <button disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
