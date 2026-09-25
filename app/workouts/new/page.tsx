import { AppHeader } from "@/components/app-header";
import { RoutineEditor } from "@/components/routine-editor";
import { getExerciseNames, getFamilyMembers } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [members, suggestions] = await Promise.all([
    getFamilyMembers(session.familyId),
    getExerciseNames(session.familyId),
  ]);

  return (
    <div className="min-h-full">
      <AppHeader name={session.displayName} />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        <h1 className="text-2xl font-semibold">New workout</h1>
        <RoutineEditor
          memberId={session.memberId}
          name=""
          exercises={[]}
          members={members}
          currentMemberId={session.memberId}
          suggestions={suggestions}
        />
      </main>
    </div>
  );
}
