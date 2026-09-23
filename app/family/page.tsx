import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { EagleBackdrop } from "@/components/eagle-backdrop";
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
      <EagleBackdrop />
      <AppHeader
        name={session.displayName}
        inviteCode={family?.inviteCode}
      />
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-2xl font-semibold">{family?.name}</h1>
          <p className="text-sm text-silver-400">
            Weekly volume and 3-workout consistency. Tap a name for this week’s
            sessions.
          </p>
          {family && (
            <p className="mt-2 rounded-xl border border-gold-400/20 bg-navy-800/85 px-3 py-2 font-mono text-sm tracking-[0.2em] text-gold-200">
              Invite {family.inviteCode}
            </p>
          )}
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
                <div className="text-gold-300">
                  <FitnessIcon shape={row.shape} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{row.displayName}</p>
                  <p className="text-xs text-silver-400">
                    {fitnessLabel(row.shape)} · {row.workoutCount}/{row.goal}{" "}
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
      </main>
    </div>
  );
}
