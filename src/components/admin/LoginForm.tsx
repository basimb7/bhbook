"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { ActionMessage } from "@/components/admin/ActionMessage";
import type { ActionState } from "@/lib/types";

export function LoginForm({ notAdmin }: { notAdmin?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, null);
  return (
    <form action={action} className="space-y-4">
      {notAdmin && !state && (
        <ActionMessage state={{ ok: false, message: "This account does not have admin access." }} />
      )}
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Username</span>
        <input
          name="username"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </label>
      <ActionMessage state={state} />
      <button
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
