import Link from "next/link";
import { AppHeader } from "@/components/app-header";
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
            Each person can save up to 6 workouts. Only the ones that have been added show up here.
          </p>
        </div>
        <Link
          href="/workouts/new"
          className="rounded-2xl bg-gold-400 px-4 py-3 text-center font-semibold text-navy-950"
        >
          New workout
        </Link>
        {members.map((member) => {
          const theirs = routines.filter((routine) => routine.memberId === member.id);
          return (
            <section key={member.id} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm uppercase tracking-widest text-gold-300/80">
                  {member.displayName}
                </h2>
                <p className="text-xs text-silver-500">{theirs.length} of 6</p>
              </div>
              {theirs.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-navy-800/85 px-4 py-3 text-sm text-silver-500">
                  No saved workout yet.
                </p>
              )}
              {theirs.map((routine) => (
                <Link
                  key={routine.id}
                  href={`/workouts/${routine.id}`}
                  className="rounded-2xl border border-white/10 bg-navy-800/85 px-4 py-3"
                >
                  <p className="font-semibold">{routine.name}</p>
                  <p className="text-sm text-silver-400">
                    {routine.exerciseNames.join(" · ") || "No exercises"}
                    {routine.setCount > 0 ? ` · ${routine.setCount} sets` : ""}
                  </p>
                </Link>
              ))}
            </section>
          );
        })}
      </main>
    </div>
  );
}
