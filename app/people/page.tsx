import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { EagleBackdrop } from "@/components/eagle-backdrop";
import { PeopleList } from "@/components/people-list";
import { getFamily, getFamilyPeople } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [family, people] = await Promise.all([
    getFamily(session.familyId),
    getFamilyPeople(session.familyId),
  ]);

  return (
    <div className="min-h-full">
      <EagleBackdrop />
      <AppHeader name={session.displayName} inviteCode={family?.inviteCode} />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        <Link href="/family" className="text-sm text-gold-300">
          ← Family board
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Manage people</h1>
          <p className="text-sm text-silver-400">
            Remove a duplicate or mistaken profile. To remove yourself, switch to
            another person first.
          </p>
        </div>
        <PeopleList people={people} currentMemberId={session.memberId} />
      </main>
    </div>
  );
}
