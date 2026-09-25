import { AppHeader } from "@/components/app-header";
import { StartWorkout } from "@/components/start-workout";
import { WorkoutLogger } from "@/components/workout-logger";
import {
  getActiveWorkout,
  getExerciseNames,
  getMemberRoutines,
  getRecentFinishedWorkouts,
  getWorkoutMemory,
} from "@/lib/queries";
import { getSession, getTimeZone } from "@/lib/session";
import { formatVolume } from "@/lib/week";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const timeZone = await getTimeZone();
  const active = await getActiveWorkout(session.memberId);
  const exerciseNames = [...new Set((active?.sets ?? []).map((set) => set.exerciseName))];
  const [routines, recent, suggestions, memory] = await Promise.all([
    active ? Promise.resolve([]) : getMemberRoutines(session.memberId),
    active ? Promise.resolve([]) : getRecentFinishedWorkouts(session.memberId, timeZone, 1),
    getExerciseNames(session.familyId),
    active
      ? getWorkoutMemory(
          session.memberId,
          exerciseNames,
          active.workout.routineId,
          active.workout.id,
          timeZone,
        )
      : Promise.resolve({ previous: null, byExercise: {} }),
  ]);

  const now = new Date();
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  const last = recent[0] ?? null;

  return (
    <div className="min-h-full">
      <AppHeader name={session.displayName} />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-300/80">Today</p>
          <h1 className="mt-1 text-3xl font-semibold">{day}</h1>
          <p className="text-silver-400">{date}</p>
        </div>

        {!active && (
          <>
            <section className="rounded-2xl border border-white/10 bg-navy-800/85 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-silver-400">Last workout</p>
              {last ? (
                <>
                  <p className="mt-1 font-semibold">{last.name ?? "Workout"}</p>
                  <p className="text-sm text-silver-400">
                    {last.dateLabel} · {formatVolume(last.volume)} lb
                  </p>
                  {last.exerciseNames.length > 0 && (
                    <p className="text-sm text-silver-500">{last.exerciseNames.join(" · ")}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-silver-500">No finished workout yet.</p>
              )}
            </section>
            <StartWorkout routines={routines} />
          </>
        )}

        {active && (
          <WorkoutLogger
            key={active.workout.id}
            workout={active.workout}
            sets={active.sets}
            suggestions={suggestions}
            routines={[]}
            planOrder={active.planOrder}
            routineName={active.routineName}
            sessionTitle={`${day}’s session`}
            previous={memory.previous}
            memory={memory.byExercise}
          />
        )}
      </main>
    </div>
  );
}
