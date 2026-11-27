import { CURRENCY } from "@/lib/env";
import type { BookingStatus } from "@/lib/types";

export function formatMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: CURRENCY }).format(n);
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  enquiry: "Enquiry",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  blocked: "Blocked",
};

export const STATUS_STYLE: Record<BookingStatus, string> = {
  enquiry: "bg-amber-100 text-amber-800 ring-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  completed: "bg-sky-100 text-sky-800 ring-sky-200",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  rejected: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  blocked: "bg-rose-100 text-rose-800 ring-rose-200",
};
