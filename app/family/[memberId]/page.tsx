import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getFamily, getMemberWeekWorkouts } from "@/lib/queries";
import { getSession, getTimeZone } from "@/lib/session";
import { formatVolume, getZonedYmd } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function MemberWeekPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const { memberId } = await params;
  const timeZone = await getTimeZone();
  const family = await getFamily(session.familyId);
  const data = await getMemberWeekWorkouts(
    session.familyId,
    memberId,
    timeZone,
  );
  if (!data) notFound();

  const weekVolume = data.workouts.reduce((sum, w) => sum + w.volume, 0);

  return (
    <div className="min-h-full">
      <AppHeader
        name={session.displayName}
        inviteCode={family?.inviteCode}
      />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        <Link href="/family" className="text-sm text-gold-300">
          ← Family board
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{data.member.displayName}</h1>
          <p className="text-silver-400">
            {data.workouts.length} workout{data.workouts.length === 1 ? "" : "s"} this
            week · {formatVolume(weekVolume)} lb volume
          </p>
        </div>
        {data.workouts.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-navy-800/85 p-4 text-silver-400">
            No completed workouts yet this week.
          </p>
        )}
        {data.workouts.map((workout) => {
          const ymd = getZonedYmd(timeZone, workout.startedAt);
          const grouped = new Map<string, typeof workout.sets>();
          for (const set of workout.sets) {
            const list = grouped.get(set.exerciseName) ?? [];
            list.push(set);
            grouped.set(set.exerciseName, list);
          }
          return (
            <article
              key={workout.id}
              className="rounded-2xl border border-white/10 bg-navy-800/85 p-4"
            >
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-semibold">
                  {`${ymd.year}-${String(ymd.month).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`}
                </h2>
                <p className="text-sm tabular-nums text-silver-400">
                  {formatVolume(workout.volume)} lb
                </p>
              </div>
              {[...grouped.entries()].map(([name, setRows]) => (
                <div key={name} className="mb-3 last:mb-0">
                  <p className="text-sm text-gold-200">{name}</p>
                  <ul className="mt-1 text-sm text-silver-300">
                    {setRows.map((set) => (
                      <li key={set.id} className="flex justify-between tabular-nums">
                        <span>
                          {set.weight} × {set.reps}
                          {!set.completedAt && (
                            <span className="ml-2 text-xs text-silver-500">
                              skipped
                            </span>
                          )}
                        </span>
                        <span className="text-silver-500">
                          {set.completedAt
                            ? formatVolume(set.weight * set.reps)
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          );
        })}
      </main>
    </div>
  );
}
