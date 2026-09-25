import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, ne } from "drizzle-orm";
import { getDb } from "./db";
import { families, members, routineSets, routines, sets, workouts } from "./db/schema";
import { formatVolume, getDayRange, getWeekRange } from "./week";

export const WEEKLY_WORKOUT_GOAL = 3;

export function setVolume(weight: number, reps: number) {
  return weight * reps;
}

export async function getFamilyMembers(familyId: string) {
  const db = await getDb();
  return db
    .select({
      id: members.id,
      displayName: members.displayName,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(eq(members.familyId, familyId))
    .orderBy(asc(members.createdAt));
}

export async function getFamilyPeople(familyId: string) {
  const familyMembers = await getFamilyMembers(familyId);
  const memberIds = familyMembers.map((member) => member.id);
  if (!memberIds.length) return [];

  const db = await getDb();
  const [workoutRows, routineRows] = await Promise.all([
    db
      .select({ memberId: workouts.memberId })
      .from(workouts)
      .where(and(inArray(workouts.memberId, memberIds), isNotNull(workouts.finishedAt))),
    db
      .select({ memberId: routines.memberId })
      .from(routines)
      .where(inArray(routines.memberId, memberIds)),
  ]);

  return familyMembers.map((member) => ({
    ...member,
    workoutCount: workoutRows.filter((row) => row.memberId === member.id).length,
    routineCount: routineRows.filter((row) => row.memberId === member.id).length,
  }));
}

export async function getFamily(familyId: string) {
  const db = await getDb();
  const [family] = await db
    .select()
    .from(families)
    .where(eq(families.id, familyId))
    .limit(1);
  return family ?? null;
}

export async function getExerciseNames(familyId: string) {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ exerciseName: sets.exerciseName })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .innerJoin(members, eq(workouts.memberId, members.id))
    .where(eq(members.familyId, familyId))
    .orderBy(asc(sets.exerciseName));
  return rows.map((row) => row.exerciseName);
}

export async function getActiveWorkout(memberId: string) {
  const db = await getDb();
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.memberId, memberId), isNull(workouts.finishedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(1);

  if (!workout) return null;

  let routineName: string | null = null;
  const planOrder: string[] = [];
  if (workout.routineId) {
    const [routine] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, workout.routineId))
      .limit(1);
    routineName = routine?.name ?? null;
    if (routine) {
      const planned = await db
        .select()
        .from(routineSets)
        .where(eq(routineSets.routineId, routine.id))
        .orderBy(asc(routineSets.exerciseOrder), asc(routineSets.setIndex));
      for (const row of planned) {
        if (!planOrder.includes(row.exerciseName)) planOrder.push(row.exerciseName);
      }
    }
  }

  return { workout, sets: await getWorkoutSets(workout.id), routineName, planOrder };
}

export async function getWorkoutSets(workoutId: string) {
  const db = await getDb();
  return db
    .select()
    .from(sets)
    .where(eq(sets.workoutId, workoutId))
    .orderBy(asc(sets.exerciseName), asc(sets.setIndex));
}

export async function getMemberVolume(
  memberId: string,
  start: Date,
  end: Date,
) {
  const db = await getDb();
  const rows = await db
    .select({
      weight: sets.weight,
      reps: sets.reps,
    })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.memberId, memberId),
        isNotNull(sets.completedAt),
        gte(sets.completedAt, start),
        lt(sets.completedAt, end),
      ),
    );

  return rows.reduce((sum, row) => sum + row.weight * row.reps, 0);
}

export async function getTodayVolume(memberId: string, timeZone: string) {
  const { start, end } = getDayRange(timeZone);
  return getMemberVolume(memberId, start, end);
}

export async function getWeekVolume(memberId: string, timeZone: string) {
  const { start, end } = getWeekRange(timeZone);
  return getMemberVolume(memberId, start, end);
}

function countsAsWorkout(setCount: number) {
  return setCount > 0;
}

export async function getFamilyWeekBoard(familyId: string, timeZone: string) {
  const { start, end } = getWeekRange(timeZone);
  const familyMembers = await getFamilyMembers(familyId);
  const memberIds = familyMembers.map((m) => m.id);

  if (!memberIds.length) {
    return [];
  }

  const db = await getDb();
  const weekSets = await db
    .select({
      memberId: workouts.memberId,
      workoutId: workouts.id,
      weight: sets.weight,
      reps: sets.reps,
      completedAt: sets.completedAt,
    })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(
      and(
        inArray(workouts.memberId, memberIds),
        isNotNull(sets.completedAt),
        gte(sets.completedAt, start),
        lt(sets.completedAt, end),
      ),
    );

  return familyMembers
    .map((member) => {
      const theirs = weekSets.filter((row) => row.memberId === member.id);
      const volume = theirs.reduce((sum, row) => sum + row.weight * row.reps, 0);
      const workoutIds = new Set(theirs.map((row) => row.workoutId));
      const workoutCount = [...workoutIds].length;
      return {
        id: member.id,
        displayName: member.displayName,
        volume,
        workoutCount,
        goal: WEEKLY_WORKOUT_GOAL,
        shape:
          workoutCount <= 0
            ? ("fatter" as const)
            : workoutCount >= WEEKLY_WORKOUT_GOAL
              ? ("fitter" as const)
              : ("mid" as const),
      };
    })
    .sort((a, b) => b.volume - a.volume || a.displayName.localeCompare(b.displayName));
}

export async function getMemberWeekWorkouts(
  familyId: string,
  memberId: string,
  timeZone: string,
) {
  const db = await getDb();
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.familyId, familyId)))
    .limit(1);
  if (!member) return null;

  const { start, end } = getWeekRange(timeZone);

  const weekSets = await db
    .select({
      set: sets,
      workout: workouts,
    })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.memberId, memberId),
        isNotNull(sets.completedAt),
        gte(sets.completedAt, start),
        lt(sets.completedAt, end),
      ),
    );

  const workoutIds = [...new Set(weekSets.map((row) => row.workout.id))];
  const weekWorkouts = workoutIds.length
    ? await db
        .select()
        .from(workouts)
        .where(inArray(workouts.id, workoutIds))
        .orderBy(desc(workouts.startedAt))
    : [];

  const allSets = workoutIds.length
    ? await db
        .select()
        .from(sets)
        .where(inArray(sets.workoutId, workoutIds))
        .orderBy(asc(sets.setIndex))
    : [];

  return {
    member,
    workouts: weekWorkouts
      .filter((workout) =>
        countsAsWorkout(
          allSets.filter((s) => s.workoutId === workout.id && s.completedAt).length,
        ),
      )
      .map((workout) => ({
        ...workout,
        sets: allSets.filter((s) => s.workoutId === workout.id),
        volume: allSets
          .filter((s) => s.workoutId === workout.id && s.completedAt)
          .reduce((sum, s) => sum + s.weight * s.reps, 0),
      })),
  };
}

export type FinishedWorkoutSummary = {
  id: string;
  name: string | null;
  dateLabel: string;
  volume: number;
  exerciseNames: string[];
};

export async function getRecentFinishedWorkouts(
  memberId: string,
  timeZone: string,
  limit: number,
): Promise<FinishedWorkoutSummary[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.memberId, memberId), isNotNull(workouts.finishedAt)))
    .orderBy(desc(workouts.finishedAt))
    .limit(limit);
  if (!rows.length) return [];

  const workoutIds = rows.map((row) => row.id);
  const setRows = await db
    .select()
    .from(sets)
    .where(inArray(sets.workoutId, workoutIds));
  const routineIds = rows
    .map((row) => row.routineId)
    .filter((id): id is string => Boolean(id));
  const routineRows = routineIds.length
    ? await db.select().from(routines).where(inArray(routines.id, routineIds))
    : [];

  return rows
    .map((row) => {
      const completed = setRows.filter(
        (set) => set.workoutId === row.id && set.completedAt,
      );
      if (!completed.length) return null;
      const exerciseNames: string[] = [];
      for (const set of completed) {
        if (!exerciseNames.includes(set.exerciseName)) exerciseNames.push(set.exerciseName);
      }
      return {
        id: row.id,
        name: routineRows.find((routine) => routine.id === row.routineId)?.name ?? null,
        dateLabel: formatShortDate(timeZone, row.startedAt),
        volume: completed.reduce((sum, set) => sum + set.weight * set.reps, 0),
        exerciseNames,
      };
    })
    .filter((row): row is FinishedWorkoutSummary => row !== null);
}

export async function getFinishedWorkoutDetail(
  familyId: string,
  memberId: string,
  workoutId: string,
  timeZone: string,
) {
  const db = await getDb();
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.familyId, familyId)))
    .limit(1);
  if (!member) return null;

  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.memberId, memberId)))
    .limit(1);
  if (!workout?.finishedAt) return null;

  const setRows = await db
    .select()
    .from(sets)
    .where(eq(sets.workoutId, workoutId))
    .orderBy(asc(sets.setIndex));
  const completed = setRows.filter((set) => set.completedAt);
  if (!completed.length) return null;

  const routine = workout.routineId
    ? (
        await db
          .select()
          .from(routines)
          .where(eq(routines.id, workout.routineId))
          .limit(1)
      )[0]
    : null;

  const exerciseNames: string[] = [];
  for (const set of completed) {
    if (!exerciseNames.includes(set.exerciseName)) exerciseNames.push(set.exerciseName);
  }

  return {
    id: workout.id,
    memberName: member.displayName,
    name: routine?.name ?? "Workout",
    dateLabel: new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(workout.startedAt),
    notes: workout.notes,
    volume: completed.reduce((sum, set) => sum + set.weight * set.reps, 0),
    exercises: exerciseNames.map((name) => ({
      name,
      sets: completed
        .filter((set) => set.exerciseName === name)
        .map((set) => ({ weight: set.weight, reps: set.reps })),
    })),
  };
}

export type RoutineExercise = {
  name: string;
  sets: { weight: number; reps: number }[];
};

export type RoutineDetail = {
  id: string;
  memberId: string;
  name: string;
  exercises: RoutineExercise[];
};

export type RoutineSummary = {
  id: string;
  memberId: string;
  name: string;
  exerciseNames: string[];
  setCount: number;
};

export type ExerciseMemory = {
  lastLabel: string | null;
  lastSets: { weight: number; reps: number }[];
  recordLabel: string | null;
  record: { weight: number; reps: number } | null;
};

export type WorkoutMemory = {
  previous: { dateLabel: string; volumeLabel: string } | null;
  byExercise: Record<string, ExerciseMemory>;
};

function formatLoad(weight: number, reps: number) {
  const w = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    weight,
  );
  return `${w}×${reps}`;
}

function formatShortDate(timeZone: string, date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(date);
}

function betterSet(
  current: { weight: number; reps: number } | null,
  next: { weight: number; reps: number },
) {
  if (!current) return next;
  if (next.weight !== current.weight) {
    return next.weight > current.weight ? next : current;
  }
  return next.reps > current.reps ? next : current;
}

function groupRoutineExercises(
  rows: { exerciseName: string; exerciseOrder: number; setIndex: number; weight: number; reps: number }[],
): RoutineExercise[] {
  const ordered = rows.slice().sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.setIndex - b.setIndex);
  const exercises: RoutineExercise[] = [];
  for (const row of ordered) {
    let exercise = exercises.find((item) => item.name === row.exerciseName);
    if (!exercise) {
      exercise = { name: row.exerciseName, sets: [] };
      exercises.push(exercise);
    }
    exercise.sets.push({ weight: row.weight, reps: row.reps });
  }
  return exercises;
}

export async function getFamilyRoutines(familyId: string): Promise<RoutineSummary[]> {
  const familyMembers = await getFamilyMembers(familyId);
  const memberIds = familyMembers.map((member) => member.id);
  if (!memberIds.length) return [];

  const db = await getDb();
  const routineRows = await db
    .select()
    .from(routines)
    .where(inArray(routines.memberId, memberIds))
    .orderBy(asc(routines.name));

  const routineIds = routineRows.map((routine) => routine.id);
  const setRows = routineIds.length
    ? await db
        .select()
        .from(routineSets)
        .where(inArray(routineSets.routineId, routineIds))
        .orderBy(asc(routineSets.exerciseOrder), asc(routineSets.setIndex))
    : [];

  return routineRows.map((routine) => {
    const mine = setRows.filter((row) => row.routineId === routine.id);
    const exerciseNames: string[] = [];
    for (const row of mine) {
      if (!exerciseNames.includes(row.exerciseName)) exerciseNames.push(row.exerciseName);
    }
    return {
      id: routine.id,
      memberId: routine.memberId,
      name: routine.name,
      exerciseNames,
      setCount: mine.length,
    };
  });
}

export async function getMemberRoutines(memberId: string) {
  const db = await getDb();
  const [member] = await db
    .select({ familyId: members.familyId })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  if (!member) return [];
  const all = await getFamilyRoutines(member.familyId);
  return all.filter((routine) => routine.memberId === memberId);
}

export async function getRoutineDetail(
  familyId: string,
  routineId: string,
): Promise<RoutineDetail | null> {
  const db = await getDb();
  const [routine] = await db
    .select()
    .from(routines)
    .where(eq(routines.id, routineId))
    .limit(1);
  if (!routine) return null;

  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, routine.memberId), eq(members.familyId, familyId)))
    .limit(1);
  if (!member) return null;

  const setRows = await db
    .select()
    .from(routineSets)
    .where(eq(routineSets.routineId, routineId))
    .orderBy(asc(routineSets.exerciseOrder), asc(routineSets.setIndex));

  return {
    id: routine.id,
    memberId: routine.memberId,
    name: routine.name,
    exercises: groupRoutineExercises(setRows),
  };
}

export async function getWorkoutMemory(
  memberId: string,
  exerciseNames: string[],
  routineId: string | null,
  excludeWorkoutId: string | null,
  timeZone: string,
): Promise<WorkoutMemory> {
  const db = await getDb();
  const filters = [
    eq(workouts.memberId, memberId),
    isNotNull(sets.completedAt),
  ];
  if (excludeWorkoutId) filters.push(ne(workouts.id, excludeWorkoutId));

  const rows = await db
    .select({
      exerciseName: sets.exerciseName,
      setIndex: sets.setIndex,
      weight: sets.weight,
      reps: sets.reps,
      workoutId: workouts.id,
      routineId: workouts.routineId,
      startedAt: workouts.startedAt,
      finishedAt: workouts.finishedAt,
    })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(and(...filters))
    .orderBy(desc(workouts.startedAt), asc(sets.setIndex));

  let previous: WorkoutMemory["previous"] = null;
  if (routineId) {
    const prevRow = rows.find((row) => row.routineId === routineId && row.finishedAt);
    if (prevRow) {
      const prevSets = rows.filter((row) => row.workoutId === prevRow.workoutId);
      const volume = prevSets.reduce((sum, row) => sum + row.weight * row.reps, 0);
      previous = {
        dateLabel: formatShortDate(timeZone, prevRow.startedAt),
        volumeLabel: formatVolume(volume),
      };
    }
  }

  const byExercise: Record<string, ExerciseMemory> = {};
  for (const name of exerciseNames) {
    const forName = rows.filter((row) => row.exerciseName === name);
    let record: { weight: number; reps: number } | null = null;
    for (const row of forName) {
      record = betterSet(record, { weight: row.weight, reps: row.reps });
    }

    let lastRows = routineId
      ? (() => {
          const match = forName.find((row) => row.routineId === routineId && row.finishedAt);
          return match ? forName.filter((row) => row.workoutId === match.workoutId) : [];
        })()
      : [];
    if (!lastRows.length) {
      const anyFinished = forName.find((row) => row.finishedAt);
      if (anyFinished) {
        lastRows = forName.filter((row) => row.workoutId === anyFinished.workoutId);
      }
    }
    lastRows.sort((a, b) => a.setIndex - b.setIndex);

    const lastSets = lastRows.map((row) => ({ weight: row.weight, reps: row.reps }));
    const lastWhen = lastRows[0]?.startedAt;
    byExercise[name] = {
      lastSets,
      lastLabel: lastSets.length
        ? `${lastWhen ? `${formatShortDate(timeZone, lastWhen)} · ` : ""}${lastSets.map((set) => formatLoad(set.weight, set.reps)).join(" · ")}`
        : null,
      record,
      recordLabel: record ? formatLoad(record.weight, record.reps) : null,
    };
  }

  return { previous, byExercise };
}
