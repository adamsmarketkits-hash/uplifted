"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { deleteRoutine, saveRoutine, startRoutine } from "@/lib/actions";
import type { RoutineExercise } from "@/lib/queries";

const WEIGHT_UNIT = "lb";

const SET_GRID =
  "grid grid-cols-[1.5rem_minmax(4.5rem,1fr)_minmax(4.75rem,1.35fr)_minmax(3.25rem,0.9fr)_2.75rem] items-center gap-x-2 sm:grid-cols-[2rem_minmax(6.5rem,1.1fr)_minmax(7rem,1.4fr)_minmax(5.5rem,1fr)_2.75rem] sm:gap-x-3";

type DraftSet = { weight: string; reps: string };
type DraftExercise = { name: string; sets: DraftSet[] };

function blankSet(): DraftSet {
  return { weight: "", reps: "" };
}

function formatHistory(weight: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(weight);
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

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-navy-950 text-silver-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M12 6v12M7 11l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M12 6v12M7 13l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TargetInput({
  value,
  onChange,
  label,
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  inputMode: "decimal" | "numeric";
}) {
  const selectOnMouseUp = useRef(false);

  return (
    <input
      inputMode={inputMode}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => {
        selectOnMouseUp.current = true;
        event.currentTarget.select();
      }}
      onMouseUp={(event) => {
        if (!selectOnMouseUp.current) return;
        event.preventDefault();
        selectOnMouseUp.current = false;
        event.currentTarget.select();
      }}
      className="w-full min-w-0 rounded-lg border border-white/15 bg-navy-950 px-2 py-2 text-center text-sm font-semibold tabular-nums text-white focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
    />
  );
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
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [nameFocus, setNameFocus] = useState<number | null>(null);

  useEffect(() => {
    if (menuIndex === null) return;
    function close() {
      setMenuIndex(null);
    }
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuIndex]);

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

  function addSet(exerciseIndex: number) {
    setDraft((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise;
        if (!exercise.sets.length) return { ...exercise, sets: [blankSet()] };
        const previous = exercise.sets[exercise.sets.length - 1];
        return {
          ...exercise,
          sets: [...exercise.sets, { weight: previous.weight, reps: previous.reps }],
        };
      }),
    );
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setDraft((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise;
        return { ...exercise, sets: exercise.sets.filter((_, j) => j !== setIndex) };
      }),
    );
  }

  function removeExercise(index: number) {
    setMenuIndex(null);
    setDraft((current) =>
      current.length === 1
        ? [{ name: "", sets: [blankSet()] }]
        : current.filter((_, i) => i !== index),
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

      {draft.map((exercise, exerciseIndex) => {
        const setCount = exercise.sets.length;
        const history = previousByExercise[exercise.name.trim()] ?? [];
        return (
          <article
            key={exerciseIndex}
            className="overflow-hidden rounded-2xl border border-white/10 bg-navy-900"
          >
            <header className="flex items-start gap-3 px-4 pb-3 pt-4">
              <div className="min-w-0 flex-1">
                <textarea
                  rows={1}
                  value={exercise.name}
                  aria-label={`Exercise ${exerciseIndex + 1} name`}
                  onFocus={() => setNameFocus(exerciseIndex)}
                  onBlur={() => setNameFocus((current) => (current === exerciseIndex ? null : current))}
                  ref={(node) => {
                    if (!node) return;
                    node.style.height = "auto";
                    node.style.height = `${node.scrollHeight}px`;
                  }}
                  onChange={(event) => {
                    updateExercise(exerciseIndex, { name: event.target.value });
                    const field = event.currentTarget;
                    field.style.height = "auto";
                    field.style.height = `${field.scrollHeight}px`;
                  }}
                  placeholder="Exercise"
                  className="w-full resize-none overflow-hidden break-words bg-transparent text-xl font-semibold leading-snug text-gold-300 placeholder:text-silver-500 focus:outline-none"
                />
                {nameFocus === exerciseIndex &&
                  suggestions
                    .filter((suggestion) => {
                      const query = exercise.name.trim().toLowerCase();
                      return (
                        query.length > 0 &&
                        suggestion.toLowerCase().includes(query) &&
                        suggestion.toLowerCase() !== query
                      );
                    })
                    .slice(0, 5)
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          updateExercise(exerciseIndex, { name: suggestion });
                          setNameFocus(null);
                        }}
                        className="mt-1 block w-full rounded-lg bg-navy-950 px-2 py-1 text-left text-sm text-silver-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                <p className="text-sm text-silver-400">
                  {setCount === 1 ? "1 set" : `${setCount} sets`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <IconButton
                  label={`Move ${exercise.name || "exercise"} up`}
                  disabled={exerciseIndex === 0}
                  onClick={() => move(exerciseIndex, -1)}
                >
                  <ArrowUpIcon />
                </IconButton>
                <IconButton
                  label={`Move ${exercise.name || "exercise"} down`}
                  disabled={exerciseIndex === draft.length - 1}
                  onClick={() => move(exerciseIndex, 1)}
                >
                  <ArrowDownIcon />
                </IconButton>
                <div
                  className="relative"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <IconButton
                    label={`${exercise.name || "Exercise"} options`}
                    onClick={() =>
                      setMenuIndex((current) => (current === exerciseIndex ? null : exerciseIndex))
                    }
                  >
                    <MoreIcon />
                  </IconButton>
                  {menuIndex === exerciseIndex && (
                    <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-white/10 bg-navy-950 p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => removeExercise(exerciseIndex)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
                      >
                        Remove exercise
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="px-3 pb-3 sm:px-4">
              <div className={`${SET_GRID} border-b border-white/10 px-1 pb-2 text-[11px] font-medium text-silver-400 sm:text-xs`}>
                <span>Set</span>
                <span>Last workout</span>
                <span>
                  <span className="sm:hidden">Weight ({WEIGHT_UNIT})</span>
                  <span className="hidden sm:inline">Target weight ({WEIGHT_UNIT})</span>
                </span>
                <span>
                  <span className="sm:hidden">Reps</span>
                  <span className="hidden sm:inline">Target reps</span>
                </span>
                <span />
              </div>
              {exercise.sets.map((set, setIndex) => {
                const previous = history[setIndex];
                const exerciseLabel = exercise.name.trim() || `Exercise ${exerciseIndex + 1}`;
                return (
                  <div
                    key={setIndex}
                    className={`${SET_GRID} border-b border-white/10 px-1 py-2.5`}
                  >
                    <span className="text-sm font-semibold tabular-nums text-silver-200">
                      {setIndex + 1}
                    </span>
                    <span className="truncate text-sm tabular-nums text-silver-300">
                      {previous
                        ? `${formatHistory(previous.weight)} ${WEIGHT_UNIT} × ${previous.reps}`
                        : "—"}
                    </span>
                    <TargetInput
                      value={set.weight}
                      inputMode="decimal"
                      label={`${exerciseLabel}, set ${setIndex + 1}, target weight in ${WEIGHT_UNIT}`}
                      onChange={(weight) => updateSet(exerciseIndex, setIndex, { weight })}
                    />
                    <TargetInput
                      value={set.reps}
                      inputMode="numeric"
                      label={`${exerciseLabel}, set ${setIndex + 1}, target reps`}
                      onChange={(reps) => updateSet(exerciseIndex, setIndex, { reps })}
                    />
                    <button
                      type="button"
                      aria-label={`Delete set ${setIndex + 1} of ${exerciseLabel}`}
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg text-silver-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => addSet(exerciseIndex)}
                className="mt-3 w-full rounded-xl bg-navy-950 py-3 text-sm font-semibold text-silver-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
              >
                + Add set
              </button>
              <p className="mt-2 text-center text-xs text-silver-500">
                New sets copy the previous targets
              </p>
            </div>
          </article>
        );
      })}
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
