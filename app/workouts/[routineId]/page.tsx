import { AppHeader } from "@/components/app-header";
import { RoutineEditor } from "@/components/routine-editor";
import {
  getExerciseNames,
  getFamily,
  getFamilyMembers,
  getRoutineDetail,
} from "@/lib/queries";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ routineId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const { routineId } = await params;
  const [family, members, suggestions, routine] = await Promise.all([
    getFamily(session.familyId),
    getFamilyMembers(session.familyId),
    getExerciseNames(session.familyId),
    getRoutineDetail(session.familyId, routineId),
  ]);
  if (!routine) notFound();

  return (
    <div className="min-h-full">
      <AppHeader name={session.displayName} inviteCode={family?.inviteCode} />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        <h1 className="text-2xl font-semibold">{routine.name}</h1>
        <RoutineEditor
          routineId={routine.id}
          memberId={routine.memberId}
          name={routine.name}
          exercises={routine.exercises}
          members={members}
          currentMemberId={session.memberId}
          suggestions={suggestions}
        />
      </main>
    </div>
  );
}
