import "server-only";
import type { Booking } from "@/lib/types";

/**
 * Notification hook for new enquiries / status changes.
 * v1: logs only. Plug in email (e.g. Resend/SES) and WhatsApp
 * (WhatsApp Cloud API / Twilio) here later — callers won't change.
 */
export async function notifyAdminNewEnquiry(
  booking: Pick<Booking, "reference" | "check_in" | "check_out" | "full_name">,
) {
  // Avoid logging phone numbers (personal data).
  console.info(
    `[notify] New enquiry ${booking.reference}: ${booking.check_in} → ${booking.check_out}`,
  );
}
