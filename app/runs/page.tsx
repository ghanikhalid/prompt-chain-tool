import { loadStudioUser } from "@/lib/auth";
import { loadStudioCatalog } from "@/lib/studioData";
import RunsBoard from "@/app/components/RunsBoard";
import { LockedView, StudioFrame } from "@/app/components/Shell";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const ctx = await loadStudioUser();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <LockedView
        status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
        user={ctx.user}
        active="runs"
        nextPath="/runs"
      />
    );
  }

  const data = await loadStudioCatalog();

  return (
    <StudioFrame user={ctx.user} active="runs">
      <RunsBoard
        requests={data.requests.rows}
        responses={data.responses.rows}
        chains={data.chains.rows}
        missing={data.requests.missing}
        error={data.requests.error || data.responses.error}
      />
    </StudioFrame>
  );
}
