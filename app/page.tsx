import Link from "next/link";
import { loadStudioUser } from "@/lib/auth";
import { loadStudioCatalog } from "@/lib/studioData";
import Playground from "@/app/components/Playground";
import { LockedView, StudioFrame } from "@/app/components/Shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ctx = await loadStudioUser();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <LockedView
        status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
        user={ctx.user}
        active="studio"
        nextPath="/"
      />
    );
  }

  const data = await loadStudioCatalog();
  const chains = data.chains.rows;
  const live = chains.filter((chain) => chain.is_active).length;
  const steps = data.steps.rows.length;
  const runs = data.requests.rows.length;
  const missing =
    data.chains.missing || data.steps.missing || data.models.missing;

  return (
    <StudioFrame user={ctx.user} active="studio">
      <section className="admin-hero-banner">
        <div className="admin-hero-left">
          <span className="kicker">Studio</span>
          <h1 className="page-title">
            Write the caption that only works{" "}
            <span className="text-gradient">in this frame</span>
          </h1>
          <p className="page-sub">
            Hello {ctx.profile?.full_name.split(" ")[0] || "there"}. Chains live
            here. Members still upload in the club app.
          </p>
        </div>
        <div className="admin-quick-actions">
          <Link href="/chains" className="btn-primary">
            Open chains
          </Link>
          <Link href="/mix" className="btn-ghost">
            Adjust the mix
          </Link>
        </div>
      </section>

      {missing ? (
        <div className="schema-banner">
          Some catalog tables are missing. This studio reuses the same Supabase
          project as the admin console.
        </div>
      ) : null}

      <section className="kpi-grid-4">
        <article className="kpi-card">
          <span className="kicker">Chains</span>
          <div className="kpi-value">{chains.length}</div>
          <p className="kpi-label">{live} live</p>
        </article>
        <article className="kpi-card">
          <span className="kicker">Steps</span>
          <div className="kpi-value">{steps}</div>
          <p className="kpi-label">Across every chain</p>
        </article>
        <article className="kpi-card">
          <span className="kicker">Models</span>
          <div className="kpi-value">{data.models.rows.length}</div>
          <p className="kpi-label">Ready to speak</p>
        </article>
        <article className="kpi-card">
          <span className="kicker">Studio runs</span>
          <div className="kpi-value">{runs}</div>
          <p className="kpi-label">Tried in this room</p>
        </article>
      </section>

      <Playground chains={chains} images={data.images.rows} />

      {chains.length > 0 ? (
        <section>
          <div className="feed-header">
            <h2 className="section-title">On the floor</h2>
            <Link href="/chains" className="count-pill">
              All chains
            </Link>
          </div>
          <div className="chain-grid" style={{ marginTop: "16px" }}>
            {chains.slice(0, 6).map((chain) => (
              <Link key={chain.id} href={`/chains/${chain.id}`} className="chain-card">
                <span className="kicker">{chain.is_active ? "Live" : "Resting"}</span>
                <h3 className="card-heading">{chain.name}</h3>
                <p className="card-copy">
                  {chain.description || "No note yet."}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </StudioFrame>
  );
}
