import { loadStudioUser } from "@/lib/auth";
import { loadStudioCatalog } from "@/lib/studioData";
import ChainList from "@/app/components/ChainList";
import { LockedView, StudioFrame } from "@/app/components/Shell";

export const dynamic = "force-dynamic";

export default async function ChainsPage() {
  const ctx = await loadStudioUser();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <LockedView
        status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
        user={ctx.user}
        active="chains"
        nextPath="/chains"
      />
    );
  }

  const data = await loadStudioCatalog();

  return (
    <StudioFrame user={ctx.user} active="chains">
      <ChainList
        chains={data.chains.rows}
        steps={data.steps.rows}
        entries={data.entries.rows}
        missing={data.chains.missing || data.steps.missing}
        error={data.chains.error || data.steps.error}
      />
    </StudioFrame>
  );
}
