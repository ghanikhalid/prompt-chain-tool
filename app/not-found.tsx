import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-wrap">
      <main className="main-content">
        <section className="empty-card">
          <span className="kicker">Missing</span>
          <h1 className="gate-title">
            That page isn&apos;t in the{" "}
            <span className="text-gradient">studio</span>
          </h1>
          <p className="empty-sub">Head back and pick a chain.</p>
          <div className="lockout-actions-box">
            <Link href="/" className="btn-primary">
              Back to studio
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
