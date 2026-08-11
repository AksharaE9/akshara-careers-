/**
 * lib/errors.ts
 *
 * F7: this codebase's tsconfig has `strict: true`, which implies
 * `useUnknownInCatchVariables` — a bare `catch (err)` types `err` as
 * `unknown`, not `any`. ~50 catch blocks across the app were annotated
 * `catch (err: any)` specifically to read `err.message` afterwards, which
 * defeats that safety (and is what @typescript-eslint/no-explicit-any was
 * flagging). This helper narrows safely without reintroducing `any`
 * anywhere.
 */
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Narrows an unknown catch value to a Postgres driver error shape, for
 * reading `.code` (SQLSTATE, e.g. '23505' unique_violation) and
 * `.constraint` without falling back to `any`.
 */
export interface PostgresErrorLike {
  code?: string
  constraint?: string
}

export function isPostgresError(err: unknown): err is PostgresErrorLike {
  return typeof err === 'object' && err !== null && ('code' in err || 'constraint' in err)
}
