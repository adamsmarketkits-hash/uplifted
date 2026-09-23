import { LoginForms } from "@/components/login-forms";
import { getFamilyMembers } from "@/lib/queries";
import { getFamilyCookie, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/today");
  const family = await getFamilyCookie();
  if (!family) redirect("/welcome");

  const members = await getFamilyMembers(family.familyId);

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-lime-300/80">
          UpLifted
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{family.familyName}</h1>
        <p className="mt-1 font-mono text-sm tracking-[0.3em] text-lime-200">
          {family.inviteCode}
        </p>
      </div>
      <LoginForms
        familyName={family.familyName}
        inviteCode={family.inviteCode}
        members={members}
      />
    </main>
  );
}
