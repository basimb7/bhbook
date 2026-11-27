"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isValidISODate, nightsBetween } from "@/lib/dates";
import { getProperty } from "@/lib/property";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionState, BookingStatus, PaymentKind, PaymentMethod } from "@/lib/types";

function str(fd: FormData, key: string, max = 500): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

// ---------------- Auth ----------------

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const identifier = str(fd, "username", 200);
  const password = str(fd, "password", 200);
  const fail = { ok: false, message: "Invalid username or password." };
  if (!identifier || !password) return fail;

  let email = identifier;
  if (!identifier.includes("@")) {
    const { data, error } = await createServiceClient().rpc("email_for_username", {
      p_username: identifier,
    });
    if (error) {
      console.error("username lookup failed", error.code);
      return { ok: false, message: "Login is temporarily unavailable." };
    }
    if (!data) return fail;
    email = data as string;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail;

  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------- Bookings ----------------

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  enquiry: ["confirmed", "rejected"],
  confirmed: ["completed", "cancelled", "enquiry"],
  completed: ["confirmed"],
  cancelled: ["enquiry"],
  rejected: ["enquiry"],
  blocked: ["cancelled"],
};

export async function updateStatus(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id", 36);
  const to = str(fd, "status", 20) as BookingStatus;
  if (!UUID_RE.test(id)) return { ok: false, message: "Invalid booking." };

  const { data: current, error: readErr } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", id)
    .single();
  if (readErr || !current) return { ok: false, message: "Booking not found." };
  if (!TRANSITIONS[current.status as BookingStatus]?.includes(to)) {
    return { ok: false, message: `Cannot change from ${current.status} to ${to}.` };
  }

  const { error } = await supabase.from("bookings").update({ status: to }).eq("id", id);
  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        message: "These dates overlap another confirmed/blocked booking. Resolve that one first.",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/");
  return { ok: true, message: `Status updated to ${to}.` };
}

export async function updateDetails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id", 36);
  if (!UUID_RE.test(id)) return { ok: false, message: "Invalid booking." };

  const totalRaw = str(fd, "total_amount", 20);
  const total = totalRaw === "" ? null : Number(totalRaw);
  if (total !== null && (!Number.isFinite(total) || total < 0)) {
    return { ok: false, message: "Total amount must be a positive number." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ total_amount: total, admin_notes: str(fd, "admin_notes", 4000) || null })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/bookings/${id}`);
  return { ok: true, message: "Saved." };
}

export async function addPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  const bookingId = str(fd, "booking_id", 36);
  if (!UUID_RE.test(bookingId)) return { ok: false, message: "Invalid booking." };

  const amount = Number(str(fd, "amount", 20));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Enter a valid amount." };
  const paidOn = str(fd, "paid_on", 10);
  if (!isValidISODate(paidOn)) return { ok: false, message: "Enter a valid payment date." };

  const method = str(fd, "method", 20) as PaymentMethod;
  const kind = str(fd, "kind", 20) as PaymentKind;
  if (!["cash", "bank_transfer", "upi", "card", "other"].includes(method)) {
    return { ok: false, message: "Invalid payment method." };
  }
  if (!["advance", "balance", "refund", "other"].includes(kind)) {
    return { ok: false, message: "Invalid payment type." };
  }

  const { error } = await supabase.from("payments").insert({
    booking_id: bookingId,
    amount,
    method,
    kind,
    paid_on: paidOn,
    reference: str(fd, "reference", 120) || null,
    notes: str(fd, "notes", 1000) || null,
    recorded_by: user.id,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { ok: true, message: "Payment recorded." };
}

export async function deletePayment(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id", 36);
  const bookingId = str(fd, "booking_id", 36);
  if (!UUID_RE.test(id)) return;
  await supabase.from("payments").delete().eq("id", id);
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function blockDates(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const from = str(fd, "from", 10);
  const to = str(fd, "to", 10);
  const reason = str(fd, "reason", 200) || "Blocked by admin";
  if (!isValidISODate(from) || !isValidISODate(to) || nightsBetween(from, to) < 1) {
    return { ok: false, message: "Pick a valid range (the end date is the first free day)." };
  }

  const property = await getProperty();
  if (!property) return { ok: false, message: "Property not found." };

  const { error } = await supabase.from("bookings").insert({
    property_id: property.id,
    check_in: from,
    check_out: to,
    status: "blocked",
    full_name: "Blocked",
    phone_1: "000000",
    admin_notes: reason,
  });
  if (error) {
    if (error.code === "23P01") {
      return { ok: false, message: "That range overlaps an existing confirmed/blocked booking." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Dates blocked." };
}
