import { loadStudioUser } from "@/lib/auth";
import { loadStudioCatalog } from "@/lib/studioData";
import MixBoard from "@/app/components/MixBoard";
import { LockedView, StudioFrame } from "@/app/components/Shell";

export const dynamic = "force-dynamic";

export default async function MixPage() {
  const ctx = await loadStudioUser();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <LockedView
        status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
        user={ctx.user}
        active="mix"
        nextPath="/mix"
      />
    );
  }

  const data = await loadStudioCatalog();

  return (
    <StudioFrame user={ctx.user} active="mix">
      <MixBoard
        key={`${data.mixes.rows[0]?.updated_at ?? "mix"}-${data.entries.rows
          .map((entry) => `${entry.chain_id}:${entry.weight}`)
          .join("|")}`}
        chains={data.chains.rows}
        mixes={data.mixes.rows}
        entries={data.entries.rows}
        missing={data.mixes.missing || data.entries.missing}
      />
    </StudioFrame>
  );
}
