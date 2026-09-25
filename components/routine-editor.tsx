"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRoutine, saveRoutine, startRoutine } from "@/lib/actions";
import type { RoutineExercise } from "@/lib/queries";

const SET_GRID =
  "grid grid-cols-[2rem_5.75rem_4.25rem_3.5rem_2.25rem] items-center gap-1.5";

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
  previousByExercise = {},
}: {
  routineId?: string;
  memberId: string;
  name: string;
  exercises: RoutineExercise[];
  members: { id: string; displayName: string }[];
  currentMemberId: string;
  suggestions: string[];
  previousByExercise?: Record<string, { weight: number; reps: number }[]>;
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
      <label className="text-sm text-silver-300">
        Who it’s for
        <select
          value={who}
          onChange={(event) => setWho(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2.5 text-white"
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-silver-300">
        Workout name
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={40}
          placeholder="Upper A"
          className="mt-1 w-full rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2.5 text-white"
        />
      </label>
      <p className="text-xs text-silver-500">
        Leave lb or reps blank and Today fills them from the last time that person did the lift.
      </p>

      {draft.map((exercise, exerciseIndex) => (
        <article key={exerciseIndex} className="flex flex-col gap-1">
          <div className="mb-1 flex items-center gap-2">
            <input
              list="routine-exercise-suggestions"
              value={exercise.name}
              onChange={(event) => updateExercise(exerciseIndex, { name: event.target.value })}
              placeholder="Exercise"
              className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-gold-300 placeholder:text-silver-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => move(exerciseIndex, -1)}
              disabled={exerciseIndex === 0}
              aria-label="Move exercise up"
              className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-800 text-silver-200 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(exerciseIndex, 1)}
              disabled={exerciseIndex === draft.length - 1}
              aria-label="Move exercise down"
              className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-800 text-silver-200 disabled:opacity-30"
            >
              ↓
            </button>
          </div>
          <div className="rounded-xl bg-navy-950 px-2 py-2">
          <div className={`${SET_GRID} px-0.5 pb-1 text-xs font-semibold text-silver-200`}>
            <span className="text-center">Set</span>
            <span>Previous</span>
            <span className="text-center">lbs</span>
            <span className="text-center">Reps</span>
            <span />
          </div>
          {exercise.sets.map((set, setIndex) => {
            const previous = previousByExercise[exercise.name.trim()]?.[setIndex];
            return (
              <div key={setIndex} className={`${SET_GRID} mb-1.5`}>
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-navy-800 text-sm font-semibold tabular-nums text-silver-200">
                  {setIndex + 1}
                </span>
                <span className="truncate text-sm font-medium tabular-nums text-silver-400">
                  {previous ? `${previous.weight} x ${previous.reps}` : "—"}
                </span>
                <input
                  inputMode="decimal"
                  value={set.weight}
                  onChange={(event) =>
                    updateSet(exerciseIndex, setIndex, { weight: event.target.value })
                  }
                  placeholder="0"
                  aria-label={`Set ${setIndex + 1} weight in pounds`}
                  className="w-full rounded-md bg-navy-800 px-1 py-2 text-center text-sm font-semibold tabular-nums text-white"
                />
                <input
                  inputMode="numeric"
                  value={set.reps}
                  onChange={(event) =>
                    updateSet(exerciseIndex, setIndex, { reps: event.target.value })
                  }
                  placeholder="0"
                  aria-label={`Set ${setIndex + 1} reps`}
                  className="w-full rounded-md bg-navy-800 px-1 py-2 text-center text-sm font-semibold tabular-nums text-white"
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
                  className="mx-auto text-silver-500"
                  aria-label="Remove set"
                >
                  ×
                </button>
              </div>
            );
          })}
          </div>
          <button
            type="button"
            onClick={() =>
              updateExercise(exerciseIndex, { sets: [...exercise.sets, blankSet()] })
            }
            className="mt-1 w-full rounded-lg bg-navy-800 py-2.5 text-sm font-semibold text-silver-200"
          >
            + Add Set
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
            className="self-end text-sm text-silver-400"
          >
            Remove exercise
          </button>
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
        className="rounded-xl border border-white/15 px-4 py-3 text-sm text-silver-200"
      >
        Add exercise
      </button>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="rounded-2xl bg-gold-400 px-4 py-3 font-semibold text-navy-950 disabled:opacity-60"
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
          className="rounded-xl border border-gold-400/30 px-4 py-3 text-sm font-semibold text-gold-200 disabled:opacity-60"
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
          className="text-sm text-silver-500"
        >
          {confirmDelete ? "Tap again to delete" : "Delete workout"}
        </button>
      )}
    </div>
  );
}
