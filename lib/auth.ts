import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseServer";
import type { StudioProfile } from "@/lib/types";

const FOUNDING_SUPERADMIN_IDS = new Set([
  "c93ee310-c0d4-41e6-9cd2-711125ab35d9",
  "c3661aaf-67c2-41fa-8bb0-c6c28c32df8b",
  "7bbcb74e-24e8-492e-b32c-f37af8fe35eb",
]);

export type StudioGate = {
  status: "unauthenticated" | "forbidden" | "authorized";
  user: User | null;
  profile: StudioProfile | null;
};

function displayName(
  first: string | null | undefined,
  last: string | null | undefined,
  email: string | null | undefined
) {
  return [first, last].filter(Boolean).join(" ").trim() || email || "Club member";
}

export const loadStudioUser = cache(async function loadStudioUser(): Promise<StudioGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unauthenticated", user: null, profile: null };
  }

  const metaName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    "";
  const [defaultFirst, ...restLast] = metaName.split(" ");
  const defaultLast = restLast.join(" ");

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let row = (existing ?? null) as Record<string, unknown> | null;

  if (!row) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        first_name: defaultFirst || user.email?.split("@")[0] || "Member",
        last_name: defaultLast || "",
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    const { data: created } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    row = (created ?? null) as Record<string, unknown> | null;
  }

  const hasFlag = Boolean(row && "is_superadmin" in row);
  const authorized = hasFlag
    ? row?.is_superadmin === true
    : FOUNDING_SUPERADMIN_IDS.has(user.id);

  const profile: StudioProfile = {
    id: user.id,
    email: user.email ?? null,
    full_name: displayName(
      typeof row?.first_name === "string" ? row.first_name : defaultFirst,
      typeof row?.last_name === "string" ? row.last_name : defaultLast,
      user.email
    ),
    is_superadmin: authorized,
  };

  return {
    status: authorized ? "authorized" : "forbidden",
    user,
    profile,
  };
});

export async function requireStudioAdmin() {
  const ctx = await loadStudioUser();
  if (ctx.status !== "authorized" || !ctx.user) {
    return {
      ok: false as const,
      error: "Only superadmins can use this studio.",
      userId: null,
    };
  }
  return { ok: true as const, error: null, userId: ctx.user.id };
}
