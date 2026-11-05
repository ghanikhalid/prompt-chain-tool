import { notFound } from "next/navigation";
import { loadStudioUser } from "@/lib/auth";
import { buildChainMedia } from "@/lib/runMedia";
import { loadStudioCatalog } from "@/lib/studioData";
import ChainEditor from "@/app/components/ChainEditor";
import { LockedView, StudioFrame } from "@/app/components/Shell";

export const dynamic = "force-dynamic";

export default async function ChainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await loadStudioUser();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <LockedView
        status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
        user={ctx.user}
        active="chains"
        nextPath={`/chains/${id}`}
      />
    );
  }

  const data = await loadStudioCatalog();
  const chain = data.chains.rows.find((item) => item.id === id);
  if (!chain) notFound();

  const steps = data.steps.rows.filter((step) => step.chain_id === id);
  const media = buildChainMedia(
    data.requests.rows.filter((request) => request.chain_id === id),
    data.responses.rows
  );

  return (
    <StudioFrame user={ctx.user} active="chains">
      <ChainEditor
        key={chain.updated_at}
        chain={chain}
        steps={steps}
        models={data.models.rows.filter((model) => model.is_enabled)}
        images={data.images.rows}
        media={media}
      />
    </StudioFrame>
  );
}
