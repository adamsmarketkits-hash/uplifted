import Link from "next/link";
import { switchMember } from "@/lib/actions";

export function AppHeader({
  name,
  inviteCode,
}: {
  name: string;
  inviteCode?: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-gold-400/15 bg-navy-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-300/80">
            UpLifted
          </p>
          <p className="text-sm text-silver-300">{name}</p>
        </div>
        <div className="flex items-center gap-2">
          {inviteCode && (
            <span className="hidden rounded-full border border-gold-400/30 px-2 py-1 font-mono text-[11px] text-gold-200 sm:inline">
              {inviteCode}
            </span>
          )}
          <form action={switchMember}>
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-xs text-silver-300 hover:bg-white/5"
            >
              Switch
            </button>
          </form>
        </div>
      </div>
      <nav className="mx-auto grid max-w-lg grid-cols-3 px-4 pb-2 text-sm">
        <Link
          href="/today"
          className="rounded-lg px-2 py-2 text-center text-silver-200 hover:bg-gold-400/10"
        >
          Today
        </Link>
        <Link
          href="/workouts"
          className="rounded-lg px-2 py-2 text-center text-silver-200 hover:bg-gold-400/10"
        >
          Workouts
        </Link>
        <Link
          href="/family"
          className="rounded-lg px-2 py-2 text-center text-silver-200 hover:bg-gold-400/10"
        >
          Family
        </Link>
      </nav>
    </header>
  );
}
