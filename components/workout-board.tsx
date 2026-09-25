"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copyRoutine, deleteRoutine } from "@/lib/actions";

type Member = { id: string; displayName: string };
type Routine = {
  id: string;
  memberId: string;
  name: string;
  exerciseNames: string[];
  setCount: number;
};

export function WorkoutBoard({
  members,
  routines,
}: {
  members: Member[];
  routines: Routine[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [overMemberId, setOverMemberId] = useState<string | null>(null);

  function copyTo(routineId: string, memberId: string) {
    setError(null);
    setAddingId(null);
    startTransition(async () => {
      const result = await copyRoutine(routineId, memberId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(routineId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteRoutine(routineId);
      if (result?.error) {
        setError(result.error);
        setConfirmDeleteId(null);
        return;
      }
      setConfirmDeleteId(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-red-300">{error}</p>}
      {members.map((member) => {
        const theirs = routines.filter((routine) => routine.memberId === member.id);
        return (
          <section
            key={member.id}
            onDragOver={(event) => {
              event.preventDefault();
              setOverMemberId(member.id);
            }}
            onDragLeave={() => setOverMemberId((current) => (current === member.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              setOverMemberId(null);
              const routineId = event.dataTransfer.getData("text/routine-id");
              if (routineId) copyTo(routineId, member.id);
            }}
            className={`flex flex-col gap-2 rounded-2xl p-2 ${
              overMemberId === member.id ? "bg-gold-400/10 ring-1 ring-gold-400/40" : ""
            }`}
          >
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-sm uppercase tracking-widest text-gold-300/80">
                {member.displayName}
              </h2>
              <p className="text-xs text-silver-500">{theirs.length} of 6</p>
            </div>
            {theirs.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm text-silver-500">
                No saved workout yet. Drop one here to copy it.
              </p>
            )}
            {theirs.map((routine) => (
              <article
                key={routine.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/routine-id", routine.id);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                className="rounded-2xl border border-white/10 bg-navy-800/85 px-4 py-3"
              >
                <Link href={`/workouts/${routine.id}`} className="block">
                  <p className="font-semibold">{routine.name}</p>
                  <p className="text-sm text-silver-400">
                    {routine.exerciseNames.join(" · ") || "No exercises"}
                    {routine.setCount > 0 ? ` · ${routine.setCount} sets` : ""}
                  </p>
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      setAddingId((current) => (current === routine.id ? null : routine.id))
                    }
                    className="rounded-lg border border-gold-400/30 px-3 py-1.5 text-xs font-semibold text-gold-200 disabled:opacity-60"
                  >
                    Add to
                  </button>
                  {confirmDeleteId === routine.id ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(routine.id)}
                      className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-200 disabled:opacity-60"
                    >
                      Delete this workout
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setConfirmDeleteId(routine.id)}
                      className="rounded-lg px-3 py-1.5 text-xs text-silver-400 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {addingId === routine.id && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {members.filter((person) => person.id !== routine.memberId).length === 0 && (
                      <p className="text-xs text-silver-500">No one else is in the family yet.</p>
                    )}
                    {members
                      .filter((person) => person.id !== routine.memberId)
                      .map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          disabled={pending}
                          onClick={() => copyTo(routine.id, person.id)}
                          className="rounded-full border border-white/15 px-3 py-1 text-xs text-silver-200 disabled:opacity-60"
                        >
                          {person.displayName}
                        </button>
                      ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
