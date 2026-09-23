"use client";

import { useActionState } from "react";
import {
  createFamily,
  joinFamily,
  type ActionState,
} from "@/lib/actions";

const initial: ActionState = {};

export function WelcomeForms() {
  const [createState, createAction, createPending] = useActionState(
    createFamily,
    initial,
  );
  const [joinState, joinAction, joinPending] = useActionState(
    joinFamily,
    initial,
  );

  return (
    <div className="flex flex-col gap-8">
      <form action={createAction} className="flex flex-col gap-3 rounded-2xl border border-lime-400/20 bg-[#1a2118] p-4">
        <h2 className="text-lg font-semibold text-lime-200">Create a family</h2>
        <label className="text-sm text-stone-300">
          Family name
          <input
            name="familyName"
            required
            maxLength={40}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            placeholder="The Strongs"
          />
        </label>
        <label className="text-sm text-stone-300">
          Your name
          <input
            name="displayName"
            required
            maxLength={24}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            placeholder="Adam"
          />
        </label>
        <label className="text-sm text-stone-300">
          PIN (4–8 digits)
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            required
            minLength={4}
            maxLength={8}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        {createState.error && (
          <p className="text-sm text-red-300">{createState.error}</p>
        )}
        <button
          type="submit"
          disabled={createPending}
          className="rounded-xl bg-lime-400 px-4 py-2.5 font-semibold text-black disabled:opacity-60"
        >
          {createPending ? "Creating…" : "Create family"}
        </button>
      </form>

      <form action={joinAction} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#1a2118] p-4">
        <h2 className="text-lg font-semibold">Join a family</h2>
        <label className="text-sm text-stone-300">
          Invite code
          <input
            name="inviteCode"
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 uppercase tracking-widest text-white"
            placeholder="ABCD2345"
          />
        </label>
        <label className="text-sm text-stone-300">
          Your name
          <input
            name="displayName"
            required
            maxLength={24}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm text-stone-300">
          PIN (4–8 digits)
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            required
            minLength={4}
            maxLength={8}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        {joinState.error && (
          <p className="text-sm text-red-300">{joinState.error}</p>
        )}
        <button
          type="submit"
          disabled={joinPending}
          className="rounded-xl border border-lime-400/40 px-4 py-2.5 font-semibold text-lime-200 disabled:opacity-60"
        >
          {joinPending ? "Joining…" : "Join family"}
        </button>
      </form>
    </div>
  );
}
