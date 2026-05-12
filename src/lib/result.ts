// Discriminated-union result type. Compute functions never throw; they return
// either { ok: true, data } or { ok: false, reason }. UI pattern-matches on
// `ok`. Spec §5.4 Rule 2.

export type Result<T, R extends string = string> =
  | { ok: true; data: T }
  | { ok: false; reason: R };

export const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });

export const fail = <R extends string>(reason: R): { ok: false; reason: R } => ({
  ok: false,
  reason,
});
