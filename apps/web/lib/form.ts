import type { ApiError } from './api';

/** Minimal structural type so we don't need a direct zod dependency here. */
type SafeParsable = {
  safeParse: (v: unknown) =>
    | { success: true }
    | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };
};

/** Client-side validation against a shared zod schema → { field: message }. */
export function validate(schema: SafeParsable, value: unknown): Record<string, string> {
  const r = schema.safeParse(value);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Map the API's error envelope `fieldErrors[]` back onto form fields. */
export function serverFieldErrors(err: ApiError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of err.fieldErrors ?? []) if (!out[f.path]) out[f.path] = f.message;
  if (Object.keys(out).length === 0) out._form = err.message;
  return out;
}
