import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import AuthButton from "./AuthButton";
import ThemeToggle from "./ThemeToggle";
import { IconCamera, IconSparkle } from "./Icons";

export type StudioTab = "studio" | "try" | "chains" | "mix" | "runs";

export default function Header({
  user,
  active,
  isSuperadmin = false,
}: {
  user: User | null;
  active?: StudioTab;
  isSuperadmin?: boolean;
}) {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-orb" aria-hidden="true" />
        <span>PRISM POP</span>
        <span className="brand-tag">CHAIN STUDIO</span>
      </Link>

      {isSuperadmin && (
        <nav className="site-nav" aria-label="Studio navigation">
          <Link href="/" className={`nav-pill ${active === "studio" ? "active" : ""}`}>
            <span>Studio</span>
          </Link>
          <Link href="/try" className={`nav-pill ${active === "try" ? "active" : ""}`}>
            <IconCamera size={14} />
            <span>Try</span>
          </Link>
          <Link
            href="/chains"
            className={`nav-pill ${active === "chains" ? "active" : ""}`}
          >
            <IconSparkle size={14} />
            <span>Chains</span>
          </Link>
          <Link href="/mix" className={`nav-pill ${active === "mix" ? "active" : ""}`}>
            <span>Mix</span>
          </Link>
          <Link href="/runs" className={`nav-pill ${active === "runs" ? "active" : ""}`}>
            <span>Runs</span>
          </Link>
        </nav>
      )}

      <div className="header-actions">
        <ThemeToggle />
        <AuthButton user={user} />
      </div>
    </header>
  );
}
