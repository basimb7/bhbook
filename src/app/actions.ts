"use server";

import { revalidatePath } from "next/cache";
import { isValidISODate, nightsBetween, todayISO } from "@/lib/dates";
import { notifyAdminNewEnquiry } from "@/lib/notify";
import { getProperty } from "@/lib/property";
import { createPublicClient } from "@/lib/supabase/public";
import type { ActionState } from "@/lib/types";

const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;

function str(fd: FormData, key: string, max = 200): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function validPhone(p: string) {
  const digits = p.replace(/\D/g, "");
  return PHONE_RE.test(p) && digits.length >= 7 && digits.length <= 15;
}

export async function submitEnquiry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // Honeypot: real users never fill this hidden field.
  if (str(fd, "website")) return { ok: true, message: "Thanks! We'll be in touch." };

  const checkIn = str(fd, "check_in", 10);
  const checkOut = str(fd, "check_out", 10);
  const fullName = str(fd, "full_name", 120);
  const phone1 = str(fd, "phone_1", 20);
  const phone2 = str(fd, "phone_2", 20);
  const message = str(fd, "message", 1000);

  if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) {
    return { ok: false, message: "Please select your check-in and check-out dates on the calendar." };
  }
  if (checkIn < todayISO()) return { ok: false, message: "Check-in date cannot be in the past." };
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return { ok: false, message: "Check-out must be after check-in." };
  if (nights > 30) return { ok: false, message: "Maximum stay is 30 nights." };
  if (fullName.length < 2) return { ok: false, message: "Please enter your full name." };
  if (!validPhone(phone1)) return { ok: false, message: "Please enter a valid contact number." };
  if (phone2 && !validPhone(phone2)) {
    return { ok: false, message: "Contact number 2 doesn't look valid." };
  }

  const property = await getProperty();
  if (!property) return { ok: false, message: "Property is not available right now." };

  const supabase = createPublicClient();
  const { data: reference, error } = await supabase.rpc("create_enquiry", {
    p_property_id: property.id,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_full_name: fullName,
    p_phone_1: phone1,
    p_phone_2: phone2 || null,
    p_message: message || null,
  });

  if (error) {
    if (error.code === "23P01") {
      return { ok: false, message: "Sorry, some of those dates were just booked. Please pick other dates." };
    }
    if (error.code === "22023") return { ok: false, message: error.message };
    console.error("create_enquiry failed", error.code);
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  await notifyAdminNewEnquiry({ reference, check_in: checkIn, check_out: checkOut, full_name: fullName });
  revalidatePath("/admin");

  return {
    ok: true,
    reference,
    message: "Thank you! Your enquiry has been received. We'll contact you shortly to confirm.",
  };
}
