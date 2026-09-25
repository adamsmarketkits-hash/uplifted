import { AppHeader } from "@/components/app-header";
import { WorkoutLogger } from "@/components/workout-logger";
import {
  getActiveWorkout,
  getExerciseNames,
  getFamily,
  getMemberRoutines,
  getTodayVolume,
  getWeekVolume,
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
  const family = await getFamily(session.familyId);
  const active = await getActiveWorkout(session.memberId);
  const exerciseNames = [...new Set((active?.sets ?? []).map((set) => set.exerciseName))];
  const [todayVolume, weekVolume, suggestions, routines, memory] = await Promise.all([
    getTodayVolume(session.memberId, timeZone),
    getWeekVolume(session.memberId, timeZone),
    getExerciseNames(session.familyId),
    active ? Promise.resolve([]) : getMemberRoutines(session.memberId),
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

  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(
    active?.workout.startedAt ?? new Date(),
  );

  return (
    <div className="min-h-full">
      <AppHeader
        name={session.displayName}
        inviteCode={family?.inviteCode}
      />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-5">
        {!active && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-navy-800/85 p-4">
            <p className="text-xs uppercase tracking-widest text-silver-400">
              Today
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatVolume(todayVolume)}
            </p>
            <p className="text-xs text-silver-500">lb volume</p>
          </div>
          <div className="rounded-2xl border border-gold-400/25 bg-navy-800/85 p-4">
            <p className="text-xs uppercase tracking-widest text-gold-300/80">
              This week
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatVolume(weekVolume)}
            </p>
            <p className="text-xs text-silver-500">lb volume</p>
          </div>
        </div>
        )}
        <WorkoutLogger
          key={active?.workout.id ?? "idle"}
          workout={active?.workout ?? null}
          sets={active?.sets ?? []}
          suggestions={suggestions}
          routines={routines}
          planOrder={active?.planOrder ?? []}
          routineName={active?.routineName ?? null}
          sessionTitle={`${weekday}’s session`}
          previous={memory.previous}
          memory={memory.byExercise}
        />
      </main>
    </div>
  );
}
