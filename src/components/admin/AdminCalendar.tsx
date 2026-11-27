"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calendar, type DayTone } from "@/components/Calendar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate } from "@/lib/dates";
import type { Booking } from "@/lib/types";

type Row = Pick<Booking, "id" | "reference" | "check_in" | "check_out" | "status" | "full_name">;

export function AdminCalendar({ today, bookings }: { today: string; bookings: Row[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const byNight = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const b of bookings) {
      for (let d = b.check_in; d < b.check_out; ) {
        map.set(d, [...(map.get(d) ?? []), b]);
        const dt = new Date(d + "T00:00:00Z");
        dt.setUTCDate(dt.getUTCDate() + 1);
        d = dt.toISOString().slice(0, 10);
      }
    }
    return map;
  }, [bookings]);

  const toneOf = (d: string): DayTone => {
    const rows = byNight.get(d) ?? [];
    if (rows.some((r) => r.status !== "enquiry")) return "busy";
    if (rows.length) return "pending";
    return "free";
  };

  const onDay = selected ? (byNight.get(selected) ?? []) : [];

  return (
    <div>
      <Calendar
        today={today}
        toneOf={toneOf}
        selectedStart={selected}
        onSelect={setSelected}
        isSelectable={() => true}
        showInOut={false}
      />
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" />Booked/blocked</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" />Enquiry only</span>
      </div>
      {selected && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <div className="mb-2 text-sm font-medium">Night of {formatDate(selected)}</div>
          {onDay.length === 0 ? (
            <p className="text-sm text-zinc-500">Free.</p>
          ) : (
            <ul className="space-y-1">
              {onDay.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm hover:bg-zinc-50">
                    <span className="truncate">{b.full_name}</span>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
