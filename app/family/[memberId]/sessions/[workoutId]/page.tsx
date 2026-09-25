import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getFinishedWorkoutDetail } from "@/lib/queries";
import { getSession, getTimeZone } from "@/lib/session";
import { formatVolume } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function FinishedWorkoutPage({
  params,
}: {
  params: Promise<{ memberId: string; workoutId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const { memberId, workoutId } = await params;
  const timeZone = await getTimeZone();
  const workout = await getFinishedWorkoutDetail(
    session.familyId,
    memberId,
    workoutId,
    timeZone,
  );
  if (!workout) notFound();

  return (
    <div className="min-h-full">
      <AppHeader name={session.displayName} />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        <Link href={`/family/${memberId}`} className="text-sm text-gold-300">
          ← {workout.memberName}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{workout.name}</h1>
          <p className="text-sm text-silver-400">{workout.dateLabel}</p>
          <p className="mt-1 text-sm tabular-nums text-gold-200">
            {formatVolume(workout.volume)} lb
          </p>
        </div>
        {workout.notes && <p className="text-sm text-silver-300">{workout.notes}</p>}
        {workout.exercises.map((exercise) => (
          <article
            key={exercise.name}
            className="rounded-2xl border border-white/10 bg-navy-900 px-4 py-3"
          >
            <h2 className="font-semibold text-gold-300">{exercise.name}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {exercise.sets.map((set, index) => (
                <li key={index} className="flex justify-between text-sm tabular-nums">
                  <span className="text-silver-400">Set {index + 1}</span>
                  <span>
                    {set.weight} lb × {set.reps}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </main>
    </div>
  );
}
