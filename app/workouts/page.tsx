import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { WorkoutBoard } from "@/components/workout-board";
import { getFamilyMembers, getFamilyRoutines } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [members, routines] = await Promise.all([
    getFamilyMembers(session.familyId),
    getFamilyRoutines(session.familyId),
  ]);

  return (
    <div className="min-h-full">
      <AppHeader name={session.displayName} />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-5">
        <div>
          <h1 className="text-2xl font-semibold">Workouts</h1>
          <p className="text-sm text-silver-400">
            Each person can save up to 6 workouts. Add a workout to someone else, or drag it onto their name to copy it.
          </p>
        </div>
        <Link
          href="/workouts/new"
          className="rounded-2xl bg-gold-400 px-4 py-3 text-center font-semibold text-navy-950"
        >
          New workout
        </Link>
        <WorkoutBoard members={members} routines={routines} />
      </main>
    </div>
  );
}
