"use client";

import { useActionState } from "react";
import { updateStatus } from "@/app/admin/actions";
import { ActionMessage } from "@/components/admin/ActionMessage";
import type { ActionState, BookingStatus } from "@/lib/types";

type Btn = { to: BookingStatus; label: string; cls: string; confirm?: string };

const PRIMARY = "bg-emerald-600 text-white hover:bg-emerald-700";
const NEUTRAL = "border border-zinc-300 bg-white hover:bg-zinc-50";
const DANGER = "border border-red-200 bg-white text-red-700 hover:bg-red-50";

const ACTIONS: Record<BookingStatus, Btn[]> = {
  enquiry: [
    { to: "confirmed", label: "Confirm booking", cls: PRIMARY, confirm: "Confirm this booking and lock the dates?" },
    { to: "rejected", label: "Reject", cls: DANGER, confirm: "Reject this enquiry?" },
  ],
  confirmed: [
    { to: "completed", label: "Close booking (completed)", cls: PRIMARY },
    { to: "enquiry", label: "Back to enquiry", cls: NEUTRAL, confirm: "Unlock dates and move back to enquiry?" },
    { to: "cancelled", label: "Cancel", cls: DANGER, confirm: "Cancel this booking? The dates will be released." },
  ],
  completed: [{ to: "confirmed", label: "Reopen", cls: NEUTRAL }],
  cancelled: [{ to: "enquiry", label: "Reopen as enquiry", cls: NEUTRAL }],
  rejected: [{ to: "enquiry", label: "Reopen as enquiry", cls: NEUTRAL }],
  blocked: [{ to: "cancelled", label: "Unblock dates", cls: DANGER, confirm: "Release these blocked dates?" }],
};

export function StatusActions({ id, status }: { id: string; status: BookingStatus }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStatus, null);
  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action} className="flex flex-wrap justify-end gap-2">
        <input type="hidden" name="id" value={id} />
        {ACTIONS[status].map((b) => (
          <button
            key={b.to}
            name="status"
            value={b.to}
            disabled={pending}
            onClick={(e) => {
              if (b.confirm && !window.confirm(b.confirm)) e.preventDefault();
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${b.cls}`}
          >
            {b.label}
          </button>
        ))}
      </form>
      <ActionMessage state={state} />
    </div>
  );
}
