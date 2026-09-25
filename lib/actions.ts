"use server";

import { randomUUID } from "crypto";
import { hash, compare } from "bcryptjs";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "./db";
import { families, members, routineSets, routines, sets, workouts } from "./db/schema";
import { getWorkoutMemory, type RoutineExercise } from "./queries";
import { isValidPin, normalizeInviteCode } from "./invite";
import {
  clearFamilyCookie,
  clearSession,
  getFamilyCookie,
  getSession,
  getTimeZone,
  setFamilyCookie,
  setSession,
} from "./session";

export type ActionState = {
  error?: string;
  inviteCode?: string;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/welcome");
  }
  return session;
}

export async function joinFamily(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const inviteCode = normalizeInviteCode(String(formData.get("inviteCode") ?? ""));
  const displayName = normalizeName(String(formData.get("displayName") ?? ""));
  const pin = String(formData.get("pin") ?? "");

  if (inviteCode.length < 6) {
    return { error: "Enter the family invite code." };
  }
  if (!displayName || displayName.length > 24) {
    return { error: "Your name is required (max 24 characters)." };
  }
  if (!isValidPin(pin)) {
    return { error: "PIN must be 4–8 digits." };
  }

  const db = await getDb();
  const [family] = await db
    .select()
    .from(families)
    .where(eq(families.inviteCode, inviteCode))
    .limit(1);

  if (!family) {
    return { error: "No family found for that code." };
  }

  const existing = await db
    .select()
    .from(members)
    .where(eq(members.familyId, family.id));

  if (existing.length >= 6) {
    return { error: "This family already has six members." };
  }

  const pinHash = await hash(pin, 10);
  const [member] = await db
    .insert(members)
    .values({
      id: randomUUID(),
      familyId: family.id,
      displayName,
      pinHash,
    })
    .returning();

  await setFamilyCookie({
    familyId: family.id,
    inviteCode: family.inviteCode,
    familyName: family.name,
  });
  await setSession({
    memberId: member.id,
    familyId: family.id,
    displayName: member.displayName,
  });
  redirect("/today");
}

export async function loginMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const memberId = String(formData.get("memberId") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const family = await getFamilyCookie();

  if (!family) {
    return { error: "Join a family first." };
  }
  if (!memberId) {
    return { error: "Pick who you are." };
  }
  if (!isValidPin(pin)) {
    return { error: "PIN must be 4–8 digits." };
  }

  const db = await getDb();
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.familyId, family.familyId)))
    .limit(1);

  if (!member) {
    return { error: "That member is not in this family." };
  }

  const ok = await compare(pin, member.pinHash);
  if (!ok) {
    return { error: "Wrong PIN." };
  }

  await setSession({
    memberId: member.id,
    familyId: member.familyId,
    displayName: member.displayName,
  });
  redirect("/today");
}

export async function loginByName(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const displayName = normalizeName(String(formData.get("displayName") ?? ""));
  const pin = String(formData.get("pin") ?? "");

  if (!displayName || displayName.length > 24) {
    return { error: "Enter your name." };
  }
  if (!isValidPin(pin)) {
    return { error: "PIN must be 4–8 digits." };
  }

  const db = await getDb();
  const matches = await db
    .select()
    .from(members)
    .where(sql`lower(${members.displayName}) = ${displayName.toLowerCase()}`)
    .orderBy(asc(members.createdAt));

  for (const member of matches) {
    const ok = await compare(pin, member.pinHash);
    if (!ok) continue;
    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.id, member.familyId))
      .limit(1);
    if (!family) continue;
    await setFamilyCookie({
      familyId: family.id,
      inviteCode: family.inviteCode,
      familyName: family.name,
    });
    await setSession({
      memberId: member.id,
      familyId: member.familyId,
      displayName: member.displayName,
    });
    redirect("/today");
  }

  return { error: "Name or PIN doesn’t match a profile." };
}

export async function switchMember() {
  await clearSession();
  await clearFamilyCookie();
  redirect("/login");
}

export async function leaveDevice() {
  await clearSession();
  await clearFamilyCookie();
  redirect("/welcome");
}

export async function startWorkout() {
  const session = await requireSession();
  const db = await getDb();

  const [open] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.memberId, session.memberId), isNull(workouts.finishedAt)))
    .limit(1);

  if (open) {
    revalidatePath("/today");
    return;
  }

  await db.insert(workouts).values({ id: randomUUID(), memberId: session.memberId });
  revalidatePath("/today");
}

export async function finishWorkout(workoutId: string) {
  const session = await requireSession();
  const db = await getDb();
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.memberId, session.memberId)))
    .limit(1);

  if (!workout) {
    return { error: "Workout not found." };
  }

  await db
    .update(workouts)
    .set({ finishedAt: new Date() })
    .where(eq(workouts.id, workoutId));

  revalidatePath("/today");
  revalidatePath("/family");
}

async function ownOpenWorkout(memberId: string, workoutId: string) {
  const db = await getDb();
  const [workout] = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.memberId, memberId),
        isNull(workouts.finishedAt),
      ),
    )
    .limit(1);
  return workout ?? null;
}

export async function cancelWorkout(workoutId: string) {
  const session = await requireSession();
  const workout = await ownOpenWorkout(session.memberId, workoutId);
  if (!workout) return { error: "Workout not found." };

  const db = await getDb();
  await db.delete(workouts).where(eq(workouts.id, workoutId));
  revalidatePath("/today");
  revalidatePath("/family");
}

export async function updateWorkoutNotes(workoutId: string, notes: string) {
  const session = await requireSession();
  const clean = notes.trim();
  if (clean.length > 500) return { error: "Keep notes under 500 characters." };
  const workout = await ownOpenWorkout(session.memberId, workoutId);
  if (!workout) return { error: "Workout not found." };

  const db = await getDb();
  await db
    .update(workouts)
    .set({ notes: clean || null })
    .where(eq(workouts.id, workoutId));
  revalidatePath("/today");
}

export async function removeExercise(workoutId: string, exerciseName: string) {
  const session = await requireSession();
  const workout = await ownOpenWorkout(session.memberId, workoutId);
  if (!workout) return { error: "Workout not found." };

  const db = await getDb();
  await db
    .delete(sets)
    .where(and(eq(sets.workoutId, workoutId), eq(sets.exerciseName, exerciseName)));
  revalidatePath("/today");
  revalidatePath("/family");
}

export async function deleteMember(memberId: string): Promise<ActionState> {
  const session = await requireSession();
  if (memberId === session.memberId) {
    return { error: "You can't delete yourself while logged in. Switch to another person first." };
  }

  const db = await getDb();
  const familyMembers = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.familyId, session.familyId));
  if (!familyMembers.some((member) => member.id === memberId)) {
    return { error: "That person is not in this family." };
  }
  if (familyMembers.length <= 1) {
    return { error: "A family needs at least one person." };
  }

  await db
    .delete(members)
    .where(and(eq(members.id, memberId), eq(members.familyId, session.familyId)));
  revalidatePath("/people");
  revalidatePath("/family");
  revalidatePath("/workouts");
  return {};
}

export async function addExercise(workoutId: string, exerciseName: string) {
  const session = await requireSession();
  const name = normalizeName(exerciseName);
  if (!name) {
    return { error: "Name the exercise." };
  }

  const db = await getDb();
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.memberId, session.memberId)))
    .limit(1);
  if (!workout || workout.finishedAt) {
    return { error: "Start a workout first." };
  }

  const lastSame = await db
    .select()
    .from(sets)
    .where(and(eq(sets.workoutId, workoutId), eq(sets.exerciseName, name)))
    .orderBy(desc(sets.setIndex))
    .limit(1);

  if (lastSame.length) {
    return { error: "That exercise is already in this workout." };
  }

  const [prev] = await db
    .select()
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.memberId, session.memberId),
        eq(sets.exerciseName, name),
        isNotNull(sets.completedAt),
      ),
    )
    .orderBy(desc(sets.completedAt))
    .limit(1);

  await db.insert(sets).values({
    id: randomUUID(),
    workoutId,
    exerciseName: name,
    setIndex: 1,
    weight: prev?.sets.weight ?? 0,
    reps: prev?.sets.reps ?? 0,
  });

  revalidatePath("/today");
}

export async function addSet(workoutId: string, exerciseName: string) {
  const session = await requireSession();
  const db = await getDb();
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.memberId, session.memberId)))
    .limit(1);
  if (!workout || workout.finishedAt) {
    return { error: "Workout is closed." };
  }

  const existing = await db
    .select()
    .from(sets)
    .where(and(eq(sets.workoutId, workoutId), eq(sets.exerciseName, exerciseName)))
    .orderBy(asc(sets.setIndex));

  if (!existing.length) {
    return { error: "Add the exercise first." };
  }

  const last = existing[existing.length - 1];
  await db.insert(sets).values({
    id: randomUUID(),
    workoutId,
    exerciseName,
    setIndex: last.setIndex + 1,
    weight: last.weight,
    reps: last.reps,
  });

  revalidatePath("/today");
}

export async function updateSet(setId: string, weight: number, reps: number) {
  const session = await requireSession();
  if (!Number.isFinite(weight) || weight < 0 || weight > 2000) {
    return { error: "Weight looks off." };
  }
  if (!Number.isInteger(reps) || reps < 0 || reps > 200) {
    return { error: "Reps look off." };
  }

  const db = await getDb();
  const [row] = await db
    .select({ set: sets, workout: workouts })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(eq(sets.id, setId))
    .limit(1);

  if (!row || row.workout.memberId !== session.memberId) {
    return { error: "Set not found." };
  }

  await db
    .update(sets)
    .set({ weight, reps })
    .where(eq(sets.id, setId));

  revalidatePath("/today");
}

export async function completeSet(
  setId: string,
  completed: boolean,
  weight?: number,
  reps?: number,
) {
  const session = await requireSession();
  const db = await getDb();
  const [row] = await db
    .select({ set: sets, workout: workouts })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(eq(sets.id, setId))
    .limit(1);

  if (!row || row.workout.memberId !== session.memberId) {
    return { error: "Set not found." };
  }

  const patch: {
    completedAt: Date | null;
    weight?: number;
    reps?: number;
  } = { completedAt: completed ? new Date() : null };

  if (weight !== undefined) {
    if (!Number.isFinite(weight) || weight < 0 || weight > 2000) {
      return { error: "Weight looks off." };
    }
    patch.weight = weight;
  }
  if (reps !== undefined) {
    if (!Number.isInteger(reps) || reps < 0 || reps > 200) {
      return { error: "Reps look off." };
    }
    patch.reps = reps;
  }

  await db.update(sets).set(patch).where(eq(sets.id, setId));

  revalidatePath("/today");
  revalidatePath("/family");
}

export async function deleteSet(setId: string) {
  const session = await requireSession();
  const db = await getDb();
  const [row] = await db
    .select({ set: sets, workout: workouts })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(eq(sets.id, setId))
    .limit(1);

  if (!row || row.workout.memberId !== session.memberId) {
    return { error: "Set not found." };
  }

  await db.delete(sets).where(eq(sets.id, setId));

  const remaining = await db
    .select()
    .from(sets)
    .where(
      and(
        eq(sets.workoutId, row.set.workoutId),
        eq(sets.exerciseName, row.set.exerciseName),
      ),
    )
    .orderBy(asc(sets.setIndex));

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].setIndex !== i + 1) {
      await db
        .update(sets)
        .set({ setIndex: i + 1 })
        .where(eq(sets.id, remaining[i].id));
    }
  }

  revalidatePath("/today");
}

type RoutineWrite = {
  name: string;
  sets: { weight: number; reps: number }[];
};

function parseExercises(
  input: RoutineExercise[],
): { exercises: RoutineExercise[] } | { error: string } {
  const exercises: RoutineExercise[] = [];
  const seen = new Set<string>();

  for (const exercise of input) {
    const name = normalizeName(exercise.name ?? "");
    if (!name) continue;
    if (name.length > 40) {
      return { error: "Exercise names max out at 40 characters." };
    }
    const key = name.toLowerCase();
    if (seen.has(key)) return { error: `${name} is listed twice.` };
    seen.add(key);

    const nextSets: RoutineWrite["sets"] = [];
    for (const set of exercise.sets ?? []) {
      const weight = Number(set.weight);
      const reps = Number(set.reps);
      if (!Number.isFinite(weight) || weight < 0 || weight > 2000) {
        return { error: "Weight looks off." };
      }
      if (!Number.isInteger(reps) || reps < 0 || reps > 200) {
        return { error: "Reps look off." };
      }
      nextSets.push({ weight, reps });
    }
    if (!nextSets.length) return { error: `Add a set for ${name}.` };
    if (nextSets.length > 12) return { error: "Keep it to 12 sets per exercise." };
    exercises.push({ name, sets: nextSets });
  }

  if (!exercises.length) return { error: "Add at least one exercise." };
  if (exercises.length > 20) return { error: "Keep a workout to 20 exercises." };
  return { exercises };
}

function routineSetRows(routineId: string, exercises: RoutineExercise[]) {
  const rows: {
    id: string;
    routineId: string;
    exerciseName: string;
    exerciseOrder: number;
    setIndex: number;
    weight: number;
    reps: number;
  }[] = [];
  exercises.forEach((exercise, exerciseOrder) => {
    exercise.sets.forEach((set, index) => {
      rows.push({
        id: randomUUID(),
        routineId,
        exerciseName: exercise.name,
        exerciseOrder,
        setIndex: index + 1,
        weight: set.weight,
        reps: set.reps,
      });
    });
  });
  return rows;
}

async function memberInFamily(familyId: string, memberId: string) {
  const db = await getDb();
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.familyId, familyId)))
    .limit(1);
  return member ?? null;
}

export async function saveRoutine(input: {
  routineId?: string;
  memberId: string;
  name: string;
  exercises: RoutineExercise[];
}): Promise<ActionState> {
  const session = await requireSession();
  const name = normalizeName(input.name);
  if (!name || name.length > 40) {
    return { error: "Name this workout (max 40 characters)." };
  }
  const member = await memberInFamily(session.familyId, input.memberId);
  if (!member) return { error: "That person is not in this family." };

  const parsed = parseExercises(input.exercises);
  if ("error" in parsed) return parsed;

  const db = await getDb();
  const owned = await db
    .select({ id: routines.id })
    .from(routines)
    .where(eq(routines.memberId, input.memberId));
  const alreadyTheirs = owned.some((routine) => routine.id === input.routineId);
  if (!alreadyTheirs && owned.length >= 6) {
    return { error: "Each person can have up to 6 workouts." };
  }

  if (input.routineId) {
    const [existing] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, input.routineId))
      .limit(1);
    if (!existing) return { error: "Workout not found." };
    const owner = await memberInFamily(session.familyId, existing.memberId);
    if (!owner) return { error: "Workout not found." };
  }

  const routineId = input.routineId ?? randomUUID();
  await db.transaction(async (tx) => {
    if (input.routineId) {
      await tx
        .update(routines)
        .set({ name, memberId: input.memberId, updatedAt: new Date() })
        .where(eq(routines.id, routineId));
      await tx.delete(routineSets).where(eq(routineSets.routineId, routineId));
    } else {
      await tx.insert(routines).values({
        id: routineId,
        memberId: input.memberId,
        name,
      });
    }
    await tx.insert(routineSets).values(routineSetRows(routineId, parsed.exercises));
  });

  revalidatePath("/workouts");
  revalidatePath("/today");
  return {};
}

export async function deleteRoutine(routineId: string): Promise<ActionState> {
  const session = await requireSession();
  const db = await getDb();
  const [routine] = await db
    .select()
    .from(routines)
    .where(eq(routines.id, routineId))
    .limit(1);
  if (!routine) return { error: "Workout not found." };
  const member = await memberInFamily(session.familyId, routine.memberId);
  if (!member) return { error: "Workout not found." };

  await db.delete(routines).where(eq(routines.id, routineId));
  revalidatePath("/workouts");
  revalidatePath("/today");
  return {};
}

export async function startRoutine(routineId: string) {
  const session = await requireSession();
  const db = await getDb();
  const [open] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.memberId, session.memberId), isNull(workouts.finishedAt)))
    .limit(1);
  if (open) return { error: "Finish the workout you're in first." };

  const [routine] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.memberId, session.memberId)))
    .limit(1);
  if (!routine) return { error: "That workout isn't yours." };

  const planned = await db
    .select()
    .from(routineSets)
    .where(eq(routineSets.routineId, routine.id))
    .orderBy(asc(routineSets.exerciseOrder), asc(routineSets.setIndex));
  if (!planned.length) return { error: "Add an exercise to this workout first." };

  const names = [...new Set(planned.map((set) => set.exerciseName))];
  const memory = await getWorkoutMemory(
    session.memberId,
    names,
    routine.id,
    null,
    await getTimeZone(),
  );

  const workoutId = randomUUID();
  await db.insert(workouts).values({
    id: workoutId,
    memberId: session.memberId,
    routineId: routine.id,
  });
  await db.insert(sets).values(
    planned.map((set) => {
      const last = memory.byExercise[set.exerciseName]?.lastSets[set.setIndex - 1];
      return {
        id: randomUUID(),
        workoutId,
        exerciseName: set.exerciseName,
        setIndex: set.setIndex,
        weight: set.weight > 0 ? set.weight : (last?.weight ?? 0),
        reps: set.reps > 0 ? set.reps : (last?.reps ?? 0),
      };
    }),
  );

  revalidatePath("/today");
}

export async function saveWorkoutAsRoutine(workoutId: string, name: string) {
  const session = await requireSession();
  const clean = normalizeName(name);
  if (!clean || clean.length > 40) {
    return { error: "Name this workout (max 40 characters)." };
  }

  const db = await getDb();
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.memberId, session.memberId)))
    .limit(1);
  if (!workout) return { error: "Workout not found." };

  const workoutSetRows = await db
    .select()
    .from(sets)
    .where(eq(sets.workoutId, workoutId));
  if (!workoutSetRows.length) return { error: "Add an exercise before saving." };

  const planOrder: string[] = [];
  let routineId = workout.routineId;
  if (routineId) {
    const [existing] = await db
      .select()
      .from(routines)
      .where(eq(routines.id, routineId))
      .limit(1);
    if (!existing || existing.memberId !== session.memberId) {
      routineId = null;
    } else {
      const existingSets = await db
        .select()
        .from(routineSets)
        .where(eq(routineSets.routineId, routineId))
        .orderBy(asc(routineSets.exerciseOrder), asc(routineSets.setIndex));
      for (const row of existingSets) {
        if (!planOrder.includes(row.exerciseName)) planOrder.push(row.exerciseName);
      }
    }
  }

  const byName = new Map<string, typeof workoutSetRows>();
  for (const row of workoutSetRows) {
    const list = byName.get(row.exerciseName) ?? [];
    list.push(row);
    byName.set(row.exerciseName, list);
  }
  const names = [
    ...planOrder.filter((exerciseName) => byName.has(exerciseName)),
    ...[...byName.keys()]
      .filter((exerciseName) => !planOrder.includes(exerciseName))
      .sort((a, b) => a.localeCompare(b)),
  ];
  const parsed = parseExercises(
    names.map((exerciseName) => ({
      name: exerciseName,
      sets: (byName.get(exerciseName) ?? [])
        .slice()
        .sort((a, b) => a.setIndex - b.setIndex)
        .map((set) => ({ weight: set.weight, reps: set.reps })),
    })),
  );
  if ("error" in parsed) return parsed;

  if (!routineId) {
    const owned = await db
      .select({ id: routines.id })
      .from(routines)
      .where(eq(routines.memberId, session.memberId));
    if (owned.length >= 6) {
      return { error: "Each person can have up to 6 workouts." };
    }
  }

  await db.transaction(async (tx) => {
    let id = routineId;
    if (!id) {
      id = randomUUID();
      await tx.insert(routines).values({
        id,
        memberId: session.memberId,
        name: clean,
      });
    } else {
      await tx
        .update(routines)
        .set({ name: clean, updatedAt: new Date() })
        .where(eq(routines.id, id));
      await tx.delete(routineSets).where(eq(routineSets.routineId, id));
    }
    await tx.insert(routineSets).values(routineSetRows(id, parsed.exercises));
    await tx.update(workouts).set({ routineId: id }).where(eq(workouts.id, workoutId));
  });

  revalidatePath("/today");
  revalidatePath("/workouts");
}
