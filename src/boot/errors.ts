/**
 * Startup and module failures: only the code, HTTP status and request id are logged (never the
 * raw error, which may carry tokens or player data); the player sees only the code.
 */
interface Failure { readonly code?: unknown; readonly httpStatus?: unknown; readonly rid?: unknown; readonly id?: unknown }

export function failureCode(error: unknown): string {
  const code = (error as Failure | null)?.code;
  return typeof code === 'string' && code ? code : 'UNKNOWN';
}

export function reportFailure(what: string, error: unknown): void {
  const failure = (error ?? {}) as Failure;
  console.error(what, { code: failure.code, status: failure.httpStatus, rid: failure.rid,
    ...(failure.id !== undefined ? { module: failure.id } : {}) });
}
