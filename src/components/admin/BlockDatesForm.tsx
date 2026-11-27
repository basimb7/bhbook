"use client";

import { useActionState } from "react";
import { blockDates } from "@/app/admin/actions";
import { ActionMessage } from "@/components/admin/ActionMessage";
import type { ActionState } from "@/lib/types";

const input = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

export function BlockDatesForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(blockDates, null);
  return (
    <form action={action} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-600">
          From (first night)
          <input type="date" name="from" min={today} required className={input} />
        </label>
        <label className="text-xs text-zinc-600">
          Until (free again)
          <input type="date" name="to" min={today} required className={input} />
        </label>
      </div>
      <input name="reason" placeholder="Reason (optional)" maxLength={200} className={input} />
      <ActionMessage state={state} />
      <button disabled={pending} className="w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
        {pending ? "Blocking…" : "Block dates"}
      </button>
    </form>
  );
}
