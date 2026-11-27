"use client";

import { useMemo, useState } from "react";
import { addDays, parseISODate, toISODate } from "@/lib/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type DayTone = "free" | "busy" | "pending" | "past";

type Props = {
  today: string;
  /** Returns the visual state of the NIGHT starting on this date. */
  toneOf: (date: string) => DayTone;
  selectedStart?: string | null;
  selectedEnd?: string | null;
  onSelect?: (date: string) => void;
  isSelectable?: (date: string) => boolean;
  minMonth?: string; // YYYY-MM-01
  maxMonth?: string; // YYYY-MM-01
  renderBadge?: (date: string) => React.ReactNode;
  showInOut?: boolean;
};

function monthStart(s: string) {
  return s.slice(0, 8) + "01";
}
function shiftMonth(s: string, n: number) {
  const d = parseISODate(s);
  d.setUTCMonth(d.getUTCMonth() + n, 1);
  return toISODate(d);
}

export function Calendar({
  today,
  toneOf,
  selectedStart,
  selectedEnd,
  onSelect,
  isSelectable,
  minMonth,
  maxMonth,
  renderBadge,
  showInOut = true,
}: Props) {
  const [month, setMonth] = useState(() => monthStart(selectedStart ?? today));

  const cells = useMemo(() => {
    const first = parseISODate(month);
    const lead = (first.getUTCDay() + 6) % 7; // Monday-first
    const start = addDays(month, -lead);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const label = parseISODate(month).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const canPrev = !minMonth || month > minMonth;
  const canNext = !maxMonth || month < maxMonth;

  return (
    <div className="w-full select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          disabled={!canPrev}
          className="rounded-lg px-3 py-2 text-lg hover:bg-zinc-100 disabled:opacity-30"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="text-base font-semibold text-zinc-900">{label}</h3>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={!canNext}
          className="rounded-lg px-3 py-2 text-lg hover:bg-zinc-100 disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const inMonth = date.slice(0, 7) === month.slice(0, 7);
          const tone = toneOf(date);
          const isStart = date === selectedStart;
          const isEnd = date === selectedEnd;
          const inRange =
            selectedStart && selectedEnd && date > selectedStart && date < selectedEnd;
          const selectable = onSelect && (isSelectable ? isSelectable(date) : tone === "free");

          let cls = "bg-white text-zinc-800 ring-1 ring-zinc-200";
          if (tone === "busy") cls = "bg-red-500 text-white ring-1 ring-red-600";
          else if (tone === "pending") cls = "bg-amber-100 text-amber-900 ring-1 ring-amber-300";
          else if (tone === "past") cls = "bg-zinc-50 text-zinc-300 ring-1 ring-zinc-100";
          else cls += selectable ? " hover:bg-emerald-50 hover:ring-emerald-400" : "";

          if (inRange) cls = "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300";
          if (isStart || isEnd) cls = "bg-emerald-600 text-white ring-2 ring-emerald-700";

          return (
            <button
              key={date}
              type="button"
              disabled={!selectable}
              onClick={() => selectable && onSelect?.(date)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${cls} ${
                inMonth ? "" : "opacity-40"
              } ${selectable ? "cursor-pointer" : "cursor-default"}`}
              aria-label={`${date}${tone === "busy" ? " (not available)" : ""}`}
              aria-pressed={isStart || isEnd || undefined}
            >
              <span className={date === today ? "font-bold underline underline-offset-2" : ""}>
                {Number(date.slice(8))}
              </span>
              {showInOut && isStart && <span className="text-[9px] leading-none">IN</span>}
              {showInOut && isEnd && <span className="text-[9px] leading-none">OUT</span>}
              {renderBadge?.(date)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
