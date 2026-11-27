export type BookingStatus =
  | "enquiry"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected"
  | "blocked";

/** Statuses that lock dates (mirrors the DB exclusion constraint). */
export const LOCKING_STATUSES: BookingStatus[] = ["confirmed", "completed", "blocked"];

export type Property = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  check_in_time: string;
  check_out_time: string;
};

export type Booking = {
  id: string;
  reference: string;
  property_id: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  status: BookingStatus;
  full_name: string;
  phone_1: string;
  phone_2: string | null;
  guest_message: string | null;
  total_amount: number | null;
  admin_notes: string | null;
  confirmed_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentMethod = "cash" | "bank_transfer" | "upi" | "card" | "other";
export type PaymentKind = "advance" | "balance" | "refund" | "other";

export type Payment = {
  id: string;
  booking_id: string;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  reference: string | null;
  paid_on: string;
  notes: string | null;
  created_at: string;
};

export type BookingEvent = {
  id: number;
  booking_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  note: string | null;
  created_at: string;
};

export type DateRange = { check_in: string; check_out: string };

export type ActionState = { ok: boolean; message: string; reference?: string } | null;
