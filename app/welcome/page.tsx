import { WelcomeForms } from "@/components/welcome-forms";
import { getFamilyCookie, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await getSession();
  if (session) redirect("/today");
  const family = await getFamilyCookie();
  if (family) redirect("/login");

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-gold-300/80">
          UpLifted
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Lift. Log. Compete.</h1>
        <p className="mt-2 text-silver-400">
          Track sets, reps, and weekly volume with the family. Hit 3 workouts a
          week. Ask for the family invite code to get started.
        </p>
      </div>
      <WelcomeForms />
    </main>
  );
}
