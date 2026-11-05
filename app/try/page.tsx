import { loadStudioUser } from "@/lib/auth";
import { loadStudioCatalog } from "@/lib/studioData";
import Playground from "@/app/components/Playground";
import { LockedView, StudioFrame } from "@/app/components/Shell";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function TryPage({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string }>;
}) {
  const ctx = await loadStudioUser();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <LockedView
        status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
        user={ctx.user}
        active="try"
        nextPath="/try"
      />
    );
  }

  const { chain } = await searchParams;
  const data = await loadStudioCatalog();

  return (
    <StudioFrame user={ctx.user} active="try">
      <div className="page-header-row">
        <div>
          <span className="kicker">Try</span>
          <h1 className="page-title">
            Walk a chain on a <span className="text-gradient">real still</span>
          </h1>
        </div>
        <p className="page-sub">
          One prompt per step. You will see each output land before the next one
          starts.
        </p>
      </div>
      <Playground
        chains={data.chains.rows}
        images={data.images.rows}
        defaultChainId={chain}
      />
    </StudioFrame>
  );
}
