import { relations } from "drizzle-orm";
import { integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

export const families = pgTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const members = pgTable("members", {
  id: text("id").primaryKey(),
  familyId: text("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  pinHash: text("pin_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const routines = pgTable("routines", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const routineSets = pgTable("routine_sets", {
  id: text("id").primaryKey(),
  routineId: text("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  exerciseOrder: integer("exercise_order").notNull().default(0),
  setIndex: integer("set_index").notNull(),
  weight: real("weight").notNull().default(0),
  reps: integer("reps").notNull().default(0),
});

export const workouts = pgTable("workouts", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  routineId: text("routine_id").references(() => routines.id, {
    onDelete: "set null",
  }),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  notes: text("notes"),
});

export const sets = pgTable("sets", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  setIndex: integer("set_index").notNull(),
  weight: real("weight").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(members),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  family: one(families, {
    fields: [members.familyId],
    references: [families.id],
  }),
  workouts: many(workouts),
  routines: many(routines),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  member: one(members, {
    fields: [routines.memberId],
    references: [members.id],
  }),
  sets: many(routineSets),
  workouts: many(workouts),
}));

export const routineSetsRelations = relations(routineSets, ({ one }) => ({
  routine: one(routines, {
    fields: [routineSets.routineId],
    references: [routines.id],
  }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  member: one(members, {
    fields: [workouts.memberId],
    references: [members.id],
  }),
  routine: one(routines, {
    fields: [workouts.routineId],
    references: [routines.id],
  }),
  sets: many(sets),
}));

export const setsRelations = relations(sets, ({ one }) => ({
  workout: one(workouts, {
    fields: [sets.workoutId],
    references: [workouts.id],
  }),
}));

export type Family = typeof families.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type RoutineSet = typeof routineSets.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type SetRow = typeof sets.$inferSelect;
