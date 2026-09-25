import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getMemberWeekWorkouts, getRecentFinishedWorkouts } from "@/lib/queries";
import { getSession, getTimeZone } from "@/lib/session";
import { formatVolume } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const { memberId } = await params;
  const timeZone = await getTimeZone();
  const week = await getMemberWeekWorkouts(session.familyId, memberId, timeZone);
  if (!week) notFound();
  const recent = await getRecentFinishedWorkouts(memberId, timeZone, 3);

  const weekVolume = week.workouts.reduce((sum, workout) => sum + workout.volume, 0);

  return (
    <div className="min-h-full">
      <AppHeader name={session.displayName} />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        <Link href="/family" className="text-sm text-gold-300">
          ← Family board
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{week.member.displayName}</h1>
          <p className="text-sm text-silver-400">This week</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-navy-800/85 p-4">
            <p className="text-xs uppercase tracking-widest text-silver-400">Workouts</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {week.workouts.length}
              <span className="text-base font-normal text-silver-500"> / 3</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gold-400/25 bg-navy-800/85 p-4">
            <p className="text-xs uppercase tracking-widest text-gold-300/80">Volume</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatVolume(weekVolume)}</p>
            <p className="text-xs text-silver-500">lb</p>
          </div>
        </div>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm uppercase tracking-widest text-gold-300/80">Recent workouts</h2>
          {recent.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-navy-800/85 p-4 text-sm text-silver-500">
              No finished workouts yet.
            </p>
          )}
          {recent.map((workout) => (
            <article
              key={workout.id}
              className="rounded-2xl border border-white/10 bg-navy-800/85 px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{workout.name ?? "Workout"}</p>
                <p className="text-sm tabular-nums text-gold-200">
                  {formatVolume(workout.volume)} lb
                </p>
              </div>
              <p className="text-sm text-silver-400">{workout.dateLabel}</p>
              {workout.exerciseNames.length > 0 && (
                <p className="text-sm text-silver-500">{workout.exerciseNames.join(" · ")}</p>
              )}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
