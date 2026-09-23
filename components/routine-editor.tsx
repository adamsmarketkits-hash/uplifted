"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRoutine, saveRoutine, startRoutine } from "@/lib/actions";
import type { RoutineExercise } from "@/lib/queries";

type DraftSet = { weight: string; reps: string };
type DraftExercise = { name: string; sets: DraftSet[] };

function blankSet(): DraftSet {
  return { weight: "", reps: "" };
}

function toDraft(exercises: RoutineExercise[]): DraftExercise[] {
  if (!exercises.length) return [{ name: "", sets: [blankSet()] }];
  return exercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.sets.map((set) => ({
      weight: set.weight > 0 ? String(set.weight) : "",
      reps: set.reps > 0 ? String(set.reps) : "",
    })),
  }));
}

export function RoutineEditor({
  routineId,
  memberId,
  name,
  exercises,
  members,
  currentMemberId,
  suggestions,
}: {
  routineId?: string;
  memberId: string;
  name: string;
  exercises: RoutineExercise[];
  members: { id: string; displayName: string }[];
  currentMemberId: string;
  suggestions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [who, setWho] = useState(memberId);
  const [title, setTitle] = useState(name);
  const [draft, setDraft] = useState<DraftExercise[]>(() => toDraft(exercises));

  function updateExercise(index: number, patch: Partial<DraftExercise>) {
    setDraft((current) =>
      current.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise)),
    );
  }

  function updateSet(exerciseIndex: number, setIndex: number, patch: Partial<DraftSet>) {
    setDraft((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set, j) => (j === setIndex ? { ...set, ...patch } : set)),
        };
      }),
    );
  }

  function move(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const next = current.slice();
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveRoutine({
        routineId,
        memberId: who,
        name: title,
        exercises: draft.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets.map((set) => ({
            weight: set.weight.trim() === "" ? 0 : Number(set.weight),
            reps: set.reps.trim() === "" ? 0 : Number(set.reps),
          })),
        })),
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/workouts");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm text-stone-300">
        Who it’s for
        <select
          value={who}
          onChange={(event) => setWho(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white"
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-stone-300">
        Workout name
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={40}
          placeholder="Upper A"
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white"
        />
      </label>
      <p className="text-xs text-stone-500">
        Leave lb or reps blank and Today fills them from the last time that person did the lift.
      </p>

      {draft.map((exercise, exerciseIndex) => (
        <article
          key={exerciseIndex}
          className="rounded-2xl border border-white/10 bg-[#1a2118] p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <input
              list="routine-exercise-suggestions"
              value={exercise.name}
              onChange={(event) => updateExercise(exerciseIndex, { name: event.target.value })}
              placeholder="Exercise"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            />
            <button
              type="button"
              onClick={() => move(exerciseIndex, -1)}
              disabled={exerciseIndex === 0}
              className="px-2 text-sm text-stone-400 disabled:opacity-30"
            >
              Up
            </button>
            <button
              type="button"
              onClick={() => move(exerciseIndex, 1)}
              disabled={exerciseIndex === draft.length - 1}
              className="px-2 text-sm text-stone-400 disabled:opacity-30"
            >
              Down
            </button>
          </div>
          <div className="grid grid-cols-[1.5rem_1fr_1fr_2rem] gap-2 px-1 pb-1 text-[11px] uppercase tracking-wide text-stone-500">
            <span>#</span>
            <span>lbs</span>
            <span>reps</span>
            <span />
          </div>
          {exercise.sets.map((set, setIndex) => (
            <div
              key={setIndex}
              className="mb-1 grid grid-cols-[1.5rem_1fr_1fr_2rem] items-center gap-2"
            >
              <span className="text-sm tabular-nums text-stone-400">{setIndex + 1}</span>
              <input
                inputMode="decimal"
                value={set.weight}
                onChange={(event) => updateSet(exerciseIndex, setIndex, { weight: event.target.value })}
                placeholder="last"
                className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm tabular-nums"
              />
              <input
                inputMode="numeric"
                value={set.reps}
                onChange={(event) => updateSet(exerciseIndex, setIndex, { reps: event.target.value })}
                placeholder="last"
                className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm tabular-nums"
              />
              <button
                type="button"
                onClick={() =>
                  updateExercise(exerciseIndex, {
                    sets:
                      exercise.sets.length === 1
                        ? [blankSet()]
                        : exercise.sets.filter((_, i) => i !== setIndex),
                  })
                }
                className="text-stone-500"
                aria-label="Remove set"
              >
                ×
              </button>
            </div>
          ))}
          <div className="mt-2 flex justify-between">
            <button
              type="button"
              onClick={() =>
                updateExercise(exerciseIndex, { sets: [...exercise.sets, blankSet()] })
              }
              className="text-sm text-lime-300"
            >
              + Set
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft((current) =>
                  current.length === 1
                    ? [{ name: "", sets: [blankSet()] }]
                    : current.filter((_, i) => i !== exerciseIndex),
                )
              }
              className="text-sm text-stone-500"
            >
              Remove
            </button>
          </div>
        </article>
      ))}
      <datalist id="routine-exercise-suggestions">
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={() => setDraft((current) => [...current, { name: "", sets: [blankSet()] }])}
        className="rounded-xl border border-white/15 px-4 py-3 text-sm text-stone-200"
      >
        Add exercise
      </button>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="rounded-2xl bg-lime-400 px-4 py-3 font-semibold text-black disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save workout"}
      </button>

      {routineId && who === currentMemberId && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await startRoutine(routineId);
              if (result?.error) {
                setError(result.error);
                return;
              }
              router.push("/today");
              router.refresh();
            });
          }}
          className="rounded-xl border border-lime-400/30 px-4 py-3 text-sm font-semibold text-lime-200 disabled:opacity-60"
        >
          Start this workout
        </button>
      )}

      {routineId && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            setError(null);
            startTransition(async () => {
              const result = await deleteRoutine(routineId);
              if (result?.error) {
                setError(result.error);
                setConfirmDelete(false);
                return;
              }
              router.push("/workouts");
              router.refresh();
            });
          }}
          className="text-sm text-stone-500"
        >
          {confirmDelete ? "Tap again to delete" : "Delete workout"}
        </button>
      )}
    </div>
  );
}
