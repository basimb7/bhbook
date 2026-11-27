import { Suspense } from "react";
import { connection } from "next/server";
import { BookingWidget } from "@/components/BookingWidget";
import { addDays, todayISO } from "@/lib/dates";
import { getProperty, getUnavailableRanges } from "@/lib/property";

const BOOKING_WINDOW_DAYS = 365;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <Suspense fallback={<PageSkeleton />}>
        <BookingSection />
      </Suspense>
    </main>
  );
}

async function BookingSection() {
  await connection(); // always fetch fresh availability
  const property = await getProperty();
  if (!property) {
    return (
      <p className="rounded-xl bg-amber-50 p-6 text-amber-900">
        No property is configured yet. Run <code>supabase/seed.sql</code> and check
        <code> NEXT_PUBLIC_PROPERTY_SLUG</code>.
      </p>
    );
  }

  const today = todayISO();
  const maxDate = addDays(today, BOOKING_WINDOW_DAYS);
  const unavailable = await getUnavailableRanges(property.id, today, addDays(maxDate, 1));

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{property.name}</h1>
        {property.description && <p className="mt-2 text-zinc-600">{property.description}</p>}
        {property.address && <p className="mt-1 text-sm text-zinc-500">{property.address}</p>}
      </header>
      <BookingWidget
        today={today}
        maxDate={maxDate}
        unavailable={unavailable}
        checkInTime={property.check_in_time}
        checkOutTime={property.check_out_time}
      />
    </>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-64 rounded bg-zinc-200" />
      <div className="h-96 rounded-2xl bg-zinc-100" />
    </div>
  );
}
