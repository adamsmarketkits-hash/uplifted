"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addExercise,
  addSet,
  cancelWorkout,
  completeSet,
  deleteSet,
  finishWorkout,
  removeExercise,
  saveWorkoutAsRoutine,
  startRoutine,
  startWorkout,
  updateSet,
  updateWorkoutNotes,
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

function completedVolume(rows: SetRow[]) {
  return rows
    .filter((row) => row.completedAt)
    .reduce((sum, row) => sum + row.weight * row.reps, 0);
}

function formatWeight(weight: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(weight);
}

function ElapsedTimer({ startedAt }: { startedAt: Date }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const seconds =
    now === null ? 0 : Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return <>{`${pad(h)}:${pad(m)}:${pad(s)}`}</>;
}

const SET_GRID = "grid grid-cols-[2rem_minmax(0,1fr)_4.25rem_3.5rem_2.5rem] items-center gap-2";

export function WorkoutLogger({
  workout,
  sets,
  suggestions,
  routines,
  planOrder,
  routineName,
  sessionTitle,
  previous,
  memory,
}: {
  workout: Workout | null;
  sets: SetRow[];
  suggestions: string[];
  routines: { id: string; name: string; exerciseNames: string[] }[];
  planOrder: string[];
  routineName: string | null;
  sessionTitle: string;
  previous: { dateLabel: string; volumeLabel: string } | null;
  memory: Record<string, ExerciseMemory>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openExerciseMenu, setOpenExerciseMenu] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [saveName, setSaveName] = useState(routineName ?? "");
  const [notes, setNotes] = useState(workout?.notes ?? "");

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
  const liveVolume = completedVolume(sets);

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

  if (!workout) {
    return (
      <section className="flex flex-col gap-3">
        {routines.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-silver-400">
              Your workouts
            </p>
            {routines.map((routine) => (
              <button
                key={routine.id}
                type="button"
                disabled={pending}
                onClick={() => run(() => startRoutine(routine.id))}
                className="rounded-2xl border border-gold-400/25 bg-navy-800/85 px-4 py-3 text-left disabled:opacity-60"
              >
                <p className="font-semibold text-gold-200">{routine.name}</p>
                <p className="text-sm text-silver-400">
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
              ? "rounded-2xl border border-white/15 px-4 py-3 text-sm text-silver-200 disabled:opacity-60"
              : "rounded-2xl bg-gold-400 px-4 py-4 text-lg font-semibold text-navy-950 disabled:opacity-60"
          }
        >
          {routines.length ? "Start an empty workout" : "Start workout"}
        </button>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-2xl font-bold">{routineName ?? sessionTitle}</h2>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="shrink-0 rounded-lg bg-navy-700/70 px-2 py-0.5 text-lg leading-none text-silver-300"
              aria-label="Workout options"
              aria-expanded={menuOpen}
            >
              ···
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => finishWorkout(workout.id))}
            className="shrink-0 rounded-lg bg-gold-400 px-4 py-1.5 text-sm font-semibold text-navy-950 disabled:opacity-60"
          >
            Finish
          </button>
        </div>
        <p className="text-sm tabular-nums text-silver-300">
          <ElapsedTimer startedAt={workout.startedAt} />
          <span className="text-silver-500"> · </span>
          {formatVolume(liveVolume)} lb
        </p>
        {previous ? (
          <p className="text-xs text-silver-400">
            Last time {previous.dateLabel} · {previous.volumeLabel} lb
          </p>
        ) : routineName ? (
          <p className="text-xs text-silver-500">First time through this workout</p>
        ) : null}
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => {
            if (notes.trim() === (workout.notes ?? "")) return;
            run(() => updateWorkoutNotes(workout.id, notes));
          }}
          placeholder="Notes"
          rows={notes ? 2 : 1}
          maxLength={500}
          className="mt-1 w-full resize-none bg-transparent text-sm text-silver-200 placeholder:text-silver-500 focus:outline-none"
        />
        {menuOpen && (
          <form
            className="mt-1 flex gap-2 rounded-xl border border-white/10 bg-navy-800/85 p-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = saveName.trim();
              if (!name) return;
              run(async () => {
                const result = await saveWorkoutAsRoutine(workout.id, name);
                if (!result?.error) setMenuOpen(false);
                return result;
              });
            }}
          >
            <input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Save as a workout plan"
              maxLength={40}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-navy-950/60 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={pending || !saveName.trim()}
              className="rounded-lg border border-gold-400/30 px-3 text-sm font-semibold text-gold-200 disabled:opacity-60"
            >
              {workout.routineId ? "Update" : "Save"}
            </button>
          </form>
        )}
      </header>

      {groups.map((group) => {
        const remembered = memory[group.name];
        const isNewRecord = beatsRecord(group.sets, remembered?.record ?? null);
        const volume = completedVolume(group.sets);
        const menuShown = openExerciseMenu === group.name;
        const lastSet = group.sets[group.sets.length - 1];
        return (
          <article
            key={group.name}
            className="rounded-2xl border border-white/10 bg-navy-800/85 px-3 pb-3 pt-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="min-w-0 truncate font-semibold text-gold-300">{group.name}</h3>
              <div className="flex shrink-0 items-center gap-2">
                {volume > 0 && (
                  <span className="rounded-full bg-gold-400/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-gold-200">
                    {formatVolume(volume)} lb
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpenExerciseMenu(menuShown ? null : group.name)}
                  className="rounded-lg bg-navy-700/70 px-2 py-0.5 text-lg leading-none text-silver-300"
                  aria-label={`${group.name} options`}
                  aria-expanded={menuShown}
                >
                  ···
                </button>
              </div>
            </div>
            {isNewRecord ? (
              <p className="text-xs text-gold-300">
                New record{remembered?.recordLabel ? ` · was ${remembered.recordLabel}` : ""}
              </p>
            ) : remembered?.recordLabel ? (
              <p className="text-xs text-silver-500">Record {remembered.recordLabel}</p>
            ) : null}

            {menuShown && (
              <div className="mt-2 flex gap-2">
                {lastSet && group.sets.length > 1 && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setOpenExerciseMenu(null);
                      run(() => deleteSet(lastSet.id));
                    }}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-silver-200"
                  >
                    Remove last set
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setOpenExerciseMenu(null);
                    run(() => removeExercise(workout.id, group.name));
                  }}
                  className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-300"
                >
                  Remove exercise
                </button>
              </div>
            )}

            <div className={`${SET_GRID} mt-2 px-1 pb-1 text-xs font-semibold text-silver-400`}>
              <span className="text-center">Set</span>
              <span className="text-center">Previous</span>
              <span className="text-center">lbs</span>
              <span className="text-center">Reps</span>
              <span className="text-center">✓</span>
            </div>
            {group.sets.map((row) => (
              <SetRowEditor
                key={row.id}
                row={row}
                previous={remembered?.lastSets[row.setIndex - 1] ?? null}
                disabled={pending}
                onSave={(weight, reps) => run(() => updateSet(row.id, weight, reps))}
                onToggle={(done, weight, reps) =>
                  run(() => completeSet(row.id, done, weight, reps))
                }
              />
            ))}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => addSet(workout.id, group.name))}
              className="mt-2 w-full rounded-lg bg-navy-700/60 py-1.5 text-sm font-semibold text-silver-200 disabled:opacity-60"
            >
              + Add Set
            </button>
          </article>
        );
      })}

      {addingExercise ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = exerciseName.trim();
            if (!name) return;
            run(async () => {
              const result = await addExercise(workout.id, name);
              if (!result?.error) {
                setExerciseName("");
                setAddingExercise(false);
              }
              return result;
            });
          }}
        >
          <input
            autoFocus
            list="exercise-suggestions"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="Exercise name"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2.5 text-white"
          />
          <datalist id="exercise-suggestions">
            {suggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-gold-400 px-4 font-semibold text-navy-950 disabled:opacity-60"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAddingExercise(false)}
            className="px-2 text-sm text-silver-400"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAddingExercise(true)}
          className="w-full rounded-xl bg-gold-400/15 py-2.5 font-semibold text-gold-200"
        >
          Add Exercise
        </button>
      )}

      {confirmCancel ? (
        <div className="flex flex-col gap-2 rounded-xl border border-red-400/40 bg-red-950/40 p-3">
          <p className="text-sm text-red-200">
            Cancel this workout? Every set logged in it will be deleted.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setConfirmCancel(false);
                run(() => cancelWorkout(workout.id));
              }}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Yes, cancel it
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-silver-300"
            >
              Keep going
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirmCancel(true)}
          className="w-full rounded-xl bg-red-500/10 py-2.5 font-semibold text-red-300 disabled:opacity-60"
        >
          Cancel Workout
        </button>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
    </section>
  );
}

function SetRowEditor({
  row,
  previous,
  disabled,
  onSave,
  onToggle,
}: {
  row: SetRow;
  previous: { weight: number; reps: number } | null;
  disabled: boolean;
  onSave: (weight: number, reps: number) => void;
  onToggle: (done: boolean, weight: number, reps: number) => void;
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

  const inputClass = `w-full rounded-md px-1 py-1.5 text-center text-sm font-semibold tabular-nums ${
    done ? "bg-transparent text-silver-200" : "bg-navy-950/60 text-white"
  }`;

  return (
    <div className={`${SET_GRID} mb-1 rounded-lg px-1 py-1 ${done ? "bg-gold-400/15" : ""}`}>
      <span className="text-center text-sm font-bold tabular-nums text-silver-200">
        {row.setIndex}
      </span>
      <span className="truncate text-center text-sm tabular-nums text-silver-500">
        {previous ? `${formatWeight(previous.weight)} × ${previous.reps}` : "—"}
      </span>
      <input
        inputMode="decimal"
        value={weight}
        disabled={disabled}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={commit}
        aria-label={`Set ${row.setIndex} weight in pounds`}
        className={inputClass}
      />
      <input
        inputMode="numeric"
        value={reps}
        disabled={disabled}
        onChange={(e) => setReps(e.target.value)}
        onBlur={commit}
        aria-label={`Set ${row.setIndex} reps`}
        className={inputClass}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(!done, Number(weight), Number(reps))}
        className={`mx-auto flex h-7 w-8 items-center justify-center rounded-md text-sm font-bold ${
          done ? "bg-gold-400 text-navy-950" : "bg-navy-700/70 text-silver-400"
        }`}
        aria-pressed={done}
        aria-label={done ? "Mark set incomplete" : "Complete set"}
      >
        ✓
      </button>
    </div>
  );
}
