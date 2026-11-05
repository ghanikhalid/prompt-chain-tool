import { cache } from "react";
import { requireStudioAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import type { CatalogList } from "@/lib/types";

export const CATALOG_TABLES = [
  "llm_providers",
  "llm_models",
  "prompt_chains",
  "prompt_chain_steps",
  "prompt_chain_mix",
  "prompt_chain_mix_entries",
  "images",
  "generation_requests",
  "llm_responses",
] as const;

export type CatalogTable = (typeof CATALOG_TABLES)[number];

function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

export const listCatalog = cache(async function listCatalog<T>(
  table: CatalogTable,
  orderColumn?: string,
  ascending = false
): Promise<CatalogList<T>> {
  const gate = await requireStudioAdmin();
  if (!gate.ok) return { rows: [], missing: false, error: gate.error };

  const supabase = await createClient();
  const query = orderColumn
    ? supabase.from(table).select("*").order(orderColumn, { ascending })
    : supabase.from(table).select("*");
  const { data, error } = await query;

  if (error) {
    if (isMissingRelation(error)) return { rows: [], missing: true };
    return { rows: [], missing: false, error: error.message };
  }

  return { rows: (data ?? []) as T[], missing: false };
});
