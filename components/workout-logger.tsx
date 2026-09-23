"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addExercise,
  addSet,
  completeSet,
  deleteSet,
  finishWorkout,
  saveWorkoutAsRoutine,
  startRoutine,
  startWorkout,
  updateSet,
} from "@/lib/actions";
import type { SetRow, Workout } from "@/lib/db/schema";
import type { ExerciseMemory } from "@/lib/queries";
import { formatVolume } from "@/lib/week";

type Group = {
  name: string;
  sets: SetRow[];
};

function beatsRecord(
  completed: SetRow[],
  record: { weight: number; reps: number } | null,
) {
  return completed.some((set) => {
    if (!set.completedAt) return false;
    if (!record) return set.weight > 0 || set.reps > 0;
    if (set.weight !== record.weight) return set.weight > record.weight;
    return set.reps > record.reps;
  });
}

function groupSets(rows: SetRow[]): Group[] {
  const order: string[] = [];
  const map = new Map<string, SetRow[]>();
  for (const row of rows) {
    if (!map.has(row.exerciseName)) {
      map.set(row.exerciseName, []);
      order.push(row.exerciseName);
    }
    map.get(row.exerciseName)!.push(row);
  }
  return order.map((name) => ({
    name,
    sets: map.get(name)!.slice().sort((a, b) => a.setIndex - b.setIndex),
  }));
}

export function WorkoutLogger({
  workout,
  sets,
  suggestions,
  routines,
  planOrder,
  routineName,
  previous,
  memory,
}: {
  workout: Workout | null;
  sets: SetRow[];
  suggestions: string[];
  routines: { id: string; name: string; exerciseNames: string[] }[];
  planOrder: string[];
  routineName: string | null;
  previous: { dateLabel: string; volumeLabel: string } | null;
  memory: Record<string, ExerciseMemory>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState("");
  const [saveName, setSaveName] = useState(routineName ?? "");

  useEffect(() => {
    if (routineName) {
      setSaveName((current) => current || routineName);
    }
  }, [routineName]);

  const groups = useMemo(() => {
    const grouped = groupSets(sets);
    if (!planOrder.length) return grouped;
    return grouped.slice().sort((a, b) => {
      const ai = planOrder.indexOf(a.name);
      const bi = planOrder.indexOf(b.name);
      const av = ai === -1 ? planOrder.length : ai;
      const bv = bi === -1 ? planOrder.length : bi;
      return av - bv;
    });
  }, [sets, planOrder]);
  const liveVolume = sets
    .filter((s) => s.completedAt)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4">
      {!workout && (
        <div className="flex flex-col gap-3">
          {routines.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-stone-400">
                Your workouts
              </p>
              {routines.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => startRoutine(routine.id))}
                  className="rounded-2xl border border-lime-400/25 bg-[#1a2118] px-4 py-3 text-left disabled:opacity-60"
                >
                  <p className="font-semibold">{routine.name}</p>
                  <p className="text-sm text-stone-400">
                    {routine.exerciseNames.join(" · ")}
                  </p>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => startWorkout())}
            className={
              routines.length
                ? "rounded-2xl border border-white/15 px-4 py-3 text-sm text-stone-200 disabled:opacity-60"
                : "rounded-2xl bg-lime-400 px-4 py-4 text-lg font-semibold text-black disabled:opacity-60"
            }
          >
            {routines.length ? "Start an empty workout" : "Start workout"}
          </button>
        </div>
      )}

      {workout && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-lime-400/20 bg-[#1a2118] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-lime-300/80">
                {routineName ?? "This session"}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatVolume(liveVolume)}{" "}
                <span className="text-sm font-normal text-stone-400">lb vol</span>
              </p>
              {previous ? (
                <p className="text-xs text-stone-400">
                  Last time {previous.dateLabel} · {previous.volumeLabel} lb
                </p>
              ) : routineName ? (
                <p className="text-xs text-stone-500">First time through this workout</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => finishWorkout(workout.id))}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-stone-200"
            >
              Finish
            </button>
          </div>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = saveName.trim();
              if (!name || !workout) return;
              run(() => saveWorkoutAsRoutine(workout.id, name));
            }}
          >
            <input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Name this workout"
              maxLength={40}
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white"
            />
            <button
              type="submit"
              disabled={pending || !saveName.trim()}
              className="rounded-xl border border-lime-400/30 px-3 text-sm font-semibold text-lime-200 disabled:opacity-60"
            >
              {workout.routineId ? "Update" : "Save"}
            </button>
          </form>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = exerciseName.trim();
              if (!name) return;
              run(async () => {
                const result = await addExercise(workout.id, name);
                if (!result?.error) setExerciseName("");
                return result;
              });
            }}
          >
            <input
              list="exercise-suggestions"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Add exercise"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white"
            />
            <datalist id="exercise-suggestions">
              {suggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-lime-400 px-4 font-semibold text-black"
            >
              Add
            </button>
          </form>

          {groups.map((group) => {
            const remembered = memory[group.name];
            const isNewRecord = beatsRecord(group.sets, remembered?.record ?? null);
            return (
            <article
              key={group.name}
              className="rounded-2xl border border-white/10 bg-[#1a2118] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{group.name}</h3>
                  {remembered?.lastLabel && (
                    <p className="text-xs text-stone-400">Last {remembered.lastLabel}</p>
                  )}
                  {isNewRecord ? (
                    <p className="text-xs text-lime-300">
                      New record
                      {remembered?.recordLabel ? ` · was ${remembered.recordLabel}` : ""}
                    </p>
                  ) : remembered?.recordLabel ? (
                    <p className="text-xs text-lime-300/80">
                      Record {remembered.recordLabel}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => addSet(workout.id, group.name))}
                  className="text-sm text-lime-300"
                >
                  + Set
                </button>
              </div>
              <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] gap-2 px-1 pb-1 text-[11px] uppercase tracking-wide text-stone-500">
                <span>#</span>
                <span>lbs</span>
                <span>reps</span>
                <span className="text-center">done</span>
                <span />
              </div>
              {group.sets.map((row) => (
                <SetRowEditor
                  key={row.id}
                  row={row}
                  disabled={pending}
                  onSave={(weight, reps) =>
                    run(() => updateSet(row.id, weight, reps))
                  }
                  onToggle={(done, weight, reps) =>
                    run(() => completeSet(row.id, done, weight, reps))
                  }
                  onDelete={() => run(() => deleteSet(row.id))}
                />
              ))}
            </article>
            );
          })}
        </>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
    </section>
  );
}

function SetRowEditor({
  row,
  disabled,
  onSave,
  onToggle,
  onDelete,
}: {
  row: SetRow;
  disabled: boolean;
  onSave: (weight: number, reps: number) => void;
  onToggle: (done: boolean, weight: number, reps: number) => void;
  onDelete: () => void;
}) {
  const [weight, setWeight] = useState(String(row.weight));
  const [reps, setReps] = useState(String(row.reps));
  const done = Boolean(row.completedAt);

  function commit() {
    const w = Number(weight);
    const r = Number(reps);
    if (w === row.weight && r === row.reps) return;
    onSave(w, r);
  }

  return (
    <div
      className={`mb-1 grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] items-center gap-2 rounded-lg px-1 py-1 ${
        done ? "bg-lime-400/10" : ""
      }`}
    >
      <span className="text-sm tabular-nums text-stone-400">{row.setIndex}</span>
      <input
        inputMode="decimal"
        value={weight}
        disabled={disabled}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={commit}
        className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm tabular-nums"
      />
      <input
        inputMode="numeric"
        value={reps}
        disabled={disabled}
        onChange={(e) => setReps(e.target.value)}
        onBlur={commit}
        className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm tabular-nums"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          onToggle(!done, Number(weight), Number(reps));
        }}
        className={`h-8 rounded-md text-sm font-bold ${
          done ? "bg-lime-400 text-black" : "border border-white/20 text-stone-300"
        }`}
        aria-pressed={done}
        aria-label={done ? "Mark set incomplete" : "Complete set"}
      >
        ✓
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="text-stone-500 hover:text-red-300"
        aria-label="Delete set"
      >
        ×
      </button>
    </div>
  );
}
