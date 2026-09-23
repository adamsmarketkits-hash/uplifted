"use client";

import { useActionState } from "react";
import {
  joinFamily,
  leaveDevice,
  loginMember,
  type ActionState,
} from "@/lib/actions";

const initial: ActionState = {};

export function LoginForms({
  familyName,
  inviteCode,
  members,
}: {
  familyName: string;
  inviteCode: string;
  members: { id: string; displayName: string }[];
}) {
  const [loginState, loginAction, loginPending] = useActionState(
    loginMember,
    initial,
  );
  const [joinState, joinAction, joinPending] = useActionState(
    joinFamily,
    initial,
  );

  return (
    <div className="flex flex-col gap-8">
      <form action={loginAction} className="flex flex-col gap-3 rounded-2xl border border-lime-400/20 bg-[#1a2118] p-4">
        <h2 className="text-lg font-semibold text-lime-200">
          Who’s lifting in {familyName}?
        </h2>
        <label className="text-sm text-stone-300">
          Member
          <select
            name="memberId"
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            defaultValue={members[0]?.id}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-stone-300">
          PIN
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            required
            minLength={4}
            maxLength={8}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        {loginState.error && (
          <p className="text-sm text-red-300">{loginState.error}</p>
        )}
        <button
          type="submit"
          disabled={loginPending || members.length === 0}
          className="rounded-xl bg-lime-400 px-4 py-2.5 font-semibold text-black disabled:opacity-60"
        >
          {loginPending ? "Checking…" : "Log in"}
        </button>
      </form>

      {members.length < 6 && (
        <form action={joinAction} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#1a2118] p-4">
          <h2 className="text-lg font-semibold">New family member</h2>
          <input type="hidden" name="inviteCode" value={inviteCode} />
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
            Choose a PIN (4–8 digits)
            <input
              name="pin"
              type="password"
              inputMode="numeric"
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
            {joinPending ? "Adding…" : "Add me"}
          </button>
        </form>
      )}

      <form action={leaveDevice}>
        <button type="submit" className="w-full text-center text-sm text-stone-500">
          Different family
        </button>
      </form>
    </div>
  );
}
