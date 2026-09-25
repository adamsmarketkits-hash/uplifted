import Link from "next/link";
import { EagleBackdrop } from "@/components/eagle-backdrop";
import { LoginForms, ProfileLogin } from "@/components/login-forms";
import { getFamilyMembers } from "@/lib/queries";
import { getFamilyCookie, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/today");
  const family = await getFamilyCookie();
  if (!family) {
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col gap-6 px-4 py-10">
        <EagleBackdrop />
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold-300/80">
            UpLifted
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-silver-400">
            Type the name and PIN you used when you joined.
          </p>
        </div>
        <ProfileLogin />
        <Link href="/welcome" className="text-center text-sm text-silver-400">
          New here? <span className="text-gold-300">Join the family</span>
        </Link>
      </main>
    );
  }

  const members = await getFamilyMembers(family.familyId);

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-6 px-4 py-10">
      <EagleBackdrop />
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-gold-300/80">
          UpLifted
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{family.familyName}</h1>
        <p className="mt-1 font-mono text-sm tracking-[0.3em] text-gold-200">
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
