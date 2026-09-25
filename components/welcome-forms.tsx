"use client";

import { useActionState, useState } from "react";
import {
  joinFamily,
  rememberFamilyByCode,
  type ActionState,
} from "@/lib/actions";

const initial: ActionState = {};

export function WelcomeForms() {
  const [mode, setMode] = useState<"join" | "login">("join");
  const [joinState, joinAction, joinPending] = useActionState(
    joinFamily,
    initial,
  );
  const [loginState, loginAction, loginPending] = useActionState(
    rememberFamilyByCode,
    initial,
  );

  if (mode === "login") {
    return (
      <div className="flex flex-col gap-4">
        <form action={loginAction} className="flex flex-col gap-3 rounded-2xl border border-gold-400/20 bg-navy-800/85 p-4">
          <h2 className="text-lg font-semibold text-gold-200">Log in</h2>
          <p className="text-sm text-silver-400">
            Enter the family invite code, then pick your name and PIN.
          </p>
          <label className="text-sm text-silver-300">
            Invite code
            <input
              name="inviteCode"
              required
              autoCapitalize="characters"
              className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-3 py-2 uppercase tracking-widest text-white"
              placeholder="ABCD2345"
            />
          </label>
          {loginState.error && (
            <p className="text-sm text-red-300">{loginState.error}</p>
          )}
          <button
            type="submit"
            disabled={loginPending}
            className="rounded-xl bg-gold-400 px-4 py-2.5 font-semibold text-navy-950 disabled:opacity-60"
          >
            {loginPending ? "Checking…" : "Continue"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode("join")}
          className="text-center text-sm text-silver-400"
        >
          New here? <span className="text-gold-300">Join the family</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={joinAction} className="flex flex-col gap-3 rounded-2xl border border-gold-400/20 bg-navy-800/85 p-4">
        <h2 className="text-lg font-semibold text-gold-200">Join the family</h2>
        <label className="text-sm text-silver-300">
          Invite code
          <input
            name="inviteCode"
            required
            autoCapitalize="characters"
            className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-3 py-2 uppercase tracking-widest text-white"
            placeholder="ABCD2345"
          />
        </label>
        <label className="text-sm text-silver-300">
          Your name
          <input
            name="displayName"
            required
            maxLength={24}
            className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm text-silver-300">
          Choose a PIN (4–8 digits)
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            required
            minLength={4}
            maxLength={8}
            className="mt-1 w-full rounded-lg border border-white/10 bg-navy-950/60 px-3 py-2 text-white"
          />
        </label>
        {joinState.error && (
          <p className="text-sm text-red-300">{joinState.error}</p>
        )}
        <button
          type="submit"
          disabled={joinPending}
          className="rounded-xl bg-gold-400 px-4 py-2.5 font-semibold text-navy-950 disabled:opacity-60"
        >
          {joinPending ? "Joining…" : "Join Family"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode("login")}
        className="rounded-xl border border-white/15 px-4 py-2.5 font-semibold text-silver-200"
      >
        Already have a profile? Log in
      </button>
    </div>
  );
}
