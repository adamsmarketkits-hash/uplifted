"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startRoutine, startWorkout } from "@/lib/actions";

export function StartWorkout({
  routines,
}: {
  routines: { id: string; name: string; exerciseNames: string[] }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [routineId, setRoutineId] = useState(routines[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = routineId
        ? await startRoutine(routineId)
        : await startWorkout();
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm text-silver-300">
        Workout
        <select
          value={routineId}
          onChange={(event) => setRoutineId(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2.5 text-white"
        >
          {routines.map((routine) => (
            <option key={routine.id} value={routine.id}>
              {routine.name}
            </option>
          ))}
          <option value="">Empty workout</option>
        </select>
      </label>
      {routineId && (
        <p className="text-sm text-silver-400">
          {routines.find((routine) => routine.id === routineId)?.exerciseNames.join(" · ")}
        </p>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={start}
        className="rounded-2xl bg-gold-400 px-4 py-3 font-semibold text-navy-950 disabled:opacity-60"
      >
        {pending ? "Starting…" : "Start workout"}
      </button>
    </div>
  );
}
