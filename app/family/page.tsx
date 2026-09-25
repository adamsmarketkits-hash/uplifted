import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { FitnessIcon, fitnessLabel } from "@/components/fitness-icon";
import { getFamily, getFamilyWeekBoard } from "@/lib/queries";
import { getSession, getTimeZone } from "@/lib/session";
import { formatVolume } from "@/lib/week";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const timeZone = await getTimeZone();
  const family = await getFamily(session.familyId);
  const board = await getFamilyWeekBoard(session.familyId, timeZone);

  return (
    <div className="min-h-full">
      <AppHeader name={session.displayName} />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-2xl font-semibold">{family?.name}</h1>
          <p className="text-sm text-silver-400">
            Weekly volume and 3-workout consistency. Tap a name to open their profile.
          </p>
        </div>
        <ol className="flex flex-col gap-3">
          {board.map((row, index) => (
            <li key={row.id}>
              <Link
                href={`/family/${row.id}`}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
                  row.id === session.memberId
                    ? "border-gold-400/40 bg-gold-400/10"
                    : "border-white/10 bg-navy-800/85"
                }`}
              >
                <span className="w-6 text-center text-sm text-silver-500">
                  {index + 1}
                </span>
                <FitnessIcon look={row.look} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{row.displayName}</p>
                  <p className="text-xs text-silver-400">
                    {fitnessLabel(row.look)} · {row.workoutCount}/{row.goal}{" "}
                    workouts
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular-nums font-semibold">
                    {formatVolume(row.volume)}
                  </p>
                  <p className="text-[11px] text-silver-500">lb vol</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
        <Link
          href="/people"
          className="self-center rounded-xl border border-white/15 px-4 py-2 text-sm text-silver-300"
        >
          Manage people
        </Link>
        {family && (
          <p className="text-center text-xs text-silver-500">
            Invite code <span className="font-mono tracking-[0.2em] text-gold-200">{family.inviteCode}</span>
          </p>
        )}
      </main>
    </div>
  );
}
