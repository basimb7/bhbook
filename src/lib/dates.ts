// All booking dates are plain calendar dates ("YYYY-MM-DD"), handled in UTC
// arithmetic so the browser/server timezone never shifts a day.

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((parseISODate(checkOut).getTime() - parseISODate(checkIn).getTime()) / 86_400_000);
}

/** Today's date in the property's local timezone. */
export function todayISO(timeZone = process.env.NEXT_PUBLIC_TIMEZONE ?? "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function isValidISODate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(parseISODate(s)) === s;
}

/** Expand ranges [check_in, check_out) into a set of occupied nights. */
export function occupiedNights(ranges: { check_in: string; check_out: string }[]): Set<string> {
  const set = new Set<string>();
  for (const r of ranges) {
    for (let d = r.check_in; d < r.check_out; d = addDays(d, 1)) set.add(d);
  }
  return set;
}

export function formatDate(s: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return parseISODate(s).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}
