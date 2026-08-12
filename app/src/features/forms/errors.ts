import type { ZodError } from "zod";

export function fieldErrors(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [
      String(issue.path[0] ?? "form"),
      issue.message,
    ]),
  );
}

export function errorMessage(
  error: unknown,
  fallback = "Die Aktion konnte nicht ausgeführt werden.",
): string {
  return error instanceof Error ? error.message : fallback;
}
