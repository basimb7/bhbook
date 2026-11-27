import type { ActionState } from "@/lib/types";

export function ActionMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`rounded-lg px-3 py-2 text-sm ${
        state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}
