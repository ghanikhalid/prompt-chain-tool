import type { User } from "@supabase/supabase-js";
import Gate from "./Gate";
import Header, { type StudioTab } from "./Header";

export function LockedView({
  status,
  user,
  active,
  nextPath,
}: {
  status: "unauthenticated" | "forbidden";
  user: User | null;
  active: StudioTab;
  nextPath: string;
}) {
  return (
    <div className="page-wrap">
      <Header user={user} active={active} isSuperadmin={false} />
      <main className="main-content">
        <Gate status={status} user={user} nextPath={nextPath} />
      </main>
    </div>
  );
}

export function StudioFrame({
  user,
  active,
  children,
}: {
  user: User;
  active: StudioTab;
  children: React.ReactNode;
}) {
  return (
    <div className="page-wrap">
      <Header user={user} active={active} isSuperadmin />
      <main className="main-content">{children}</main>
    </div>
  );
}
