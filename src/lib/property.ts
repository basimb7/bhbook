import "server-only";
import { PROPERTY_SLUG } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { DateRange, Property } from "@/lib/types";

export async function getProperty(slug = PROPERTY_SLUG): Promise<Property | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, slug, name, description, address, check_in_time, check_out_time")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load property: ${error.message}`);
  return data;
}

export async function getUnavailableRanges(
  propertyId: string,
  from: string,
  to: string,
): Promise<DateRange[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_unavailable_ranges", {
    p_property_id: propertyId,
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(`Failed to load availability: ${error.message}`);
  return (data ?? []) as DateRange[];
}
