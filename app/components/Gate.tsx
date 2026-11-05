import type { User } from "@supabase/supabase-js";
import AuthButton from "./AuthButton";
import { IconLock, IconShield, IconSparkle } from "./Icons";

export default function Gate({
  status,
  user,
  nextPath = "/",
}: {
  status: "unauthenticated" | "forbidden";
  user: User | null;
  nextPath?: string;
}) {
  if (status === "unauthenticated") {
    return (
      <section className="hero-stage-3d">
        <div className="hero-copy-col">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>PROMPT CHAIN STUDIO</span>
          </div>

          <h1 className="hero-title">
            The line that only works{" "}
            <span className="text-gradient">on this photo.</span>
          </h1>

          <p className="hero-sub">
            Sign in with Google. Superadmins write the chains the club uses to
            caption a picture.
          </p>

          <div className="hero-cta-row">
            <AuthButton user={null} nextPath={nextPath} />
          </div>
        </div>

        <div className="apple-3d-scene" aria-hidden="true">
          <div className="apple-3d-rig">
            <div className="floating-chip chip-top-left">
              <IconLock size={14} />
              <span>SUPERADMIN</span>
            </div>
            <div className="floating-chip chip-bottom-right">
              <IconSparkle size={14} />
              <span>LOOK AT THE FRAME</span>
            </div>

            <div className="showcase-card-back">
              <div className="showcase-back-label">CHAIN</div>
              <div className="showcase-back-caption">See → write → punch up</div>
            </div>

            <div className="showcase-card-front">
              <div className="showcase-art">
                <div className="showcase-svg-wrap">
                  <IconShield size={84} />
                </div>
                <div className="showcase-meme-bar">
                  CLOSING THE LAPTOP WHILE PROD BURNS
                </div>
              </div>
              <div className="showcase-slip">
                <span className="showcase-slip-kicker">HOW IT FEELS</span>
                <p className="showcase-slip-text">
                  Drop a photo. Walk the chain. Keep the line that only works
                  because of what is in the frame.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="lockout-stack">
      <section className="gate-card">
        <div className="hero-badge" style={{ margin: "0 auto 16px" }}>
          <span className="hero-badge-dot" />
          <span>SIGNED IN</span>
        </div>

        <h1 className="gate-title">
          This account can&apos;t open{" "}
          <span className="text-gradient">the chain studio</span>
        </h1>

        <p className="gate-copy">
          You&apos;re signed in as{" "}
          <strong>{user?.email || "this Google account"}</strong>. Ask an
          existing superadmin to grant access from the admin console.
        </p>

        <div className="lockout-actions-box">
          <AuthButton user={user} nextPath={nextPath} />
        </div>
      </section>
    </div>
  );
}
