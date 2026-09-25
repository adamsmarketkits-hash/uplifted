"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMember } from "@/lib/actions";

type Person = {
  id: string;
  displayName: string;
  createdAt: Date;
  workoutCount: number;
  routineCount: number;
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function PeopleList({
  people,
  currentMemberId,
}: {
  people: Person[];
  currentMemberId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteMember(id);
      setConfirmId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {people.map((person) => {
        const isYou = person.id === currentMemberId;
        const confirming = confirmId === person.id;
        return (
          <article
            key={person.id}
            className={`rounded-2xl border px-4 py-3 ${
              confirming ? "border-red-400/50 bg-red-950/40" : "border-white/10 bg-navy-800/85"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {person.displayName}
                  {isYou && <span className="ml-2 text-xs font-normal text-gold-300">You</span>}
                </p>
                <p className="text-xs text-silver-400">
                  {plural(person.workoutCount, "workout")} ·{" "}
                  {plural(person.routineCount, "saved plan")} · joined{" "}
                  {new Date(person.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              {!isYou && !confirming && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmId(person.id)}
                  className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-silver-300 disabled:opacity-60"
                >
                  Delete
                </button>
              )}
            </div>
            {confirming && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-sm text-red-200">
                  Delete {person.displayName}?{" "}
                  {person.workoutCount || person.routineCount
                    ? `Their ${plural(person.workoutCount, "workout")} and ${plural(person.routineCount, "saved plan")} will be deleted too.`
                    : "They have no workouts yet."}{" "}
                  This can’t be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(person.id)}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {pending ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-silver-300"
                  >
                    Keep
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
