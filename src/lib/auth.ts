import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = { id: string; username: string; fullName: string | null };

/**
 * Data-access-layer guard. Call in EVERY admin page and server action —
 * the proxy redirect is only an optimistic check.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || !["admin", "staff"].includes(profile.role)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_admin");
  }

  const user: AdminUser = { id: profile.id, username: profile.username, fullName: profile.full_name };
  return { supabase, user };
}
