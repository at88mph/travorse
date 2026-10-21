import {
  NotAuthenticatedError,
  PermissionDeniedError,
  VospaceError,
} from '../vospace/errors';
import { InvalidFolderPathError } from './folder-path';
import { NotAFolderError } from './listing';

/** Shown when VOSpace itself refuses the caller. Signing in is not guaranteed to help. */
export const LOGIN_MAY_BE_NEEDED =
  'A login may be needed to view this folder. Signing in may still not grant access if your group memberships do not allow it.';

/** Map a listing failure to an HTTP response. Only 401 and 403 are rewritten. */
export function listingErrorResponse(err: unknown): { status: number; message: string } {
  if (isAccessDenied(err)) {
    const status = err instanceof VospaceError && (err.status === 401 || err.status === 403) ? err.status : 401;
    return { status, message: LOGIN_MAY_BE_NEEDED };
  }
  if (err instanceof NotAFolderError) return { status: 409, message: err.message };
  if (err instanceof InvalidFolderPathError) return { status: 400, message: err.message };
  if (err instanceof VospaceError) {
    return { status: err.status && err.status >= 400 ? err.status : 502, message: err.message };
  }
  if (err instanceof Error) return { status: 502, message: err.message };
  return { status: 502, message: String(err) };
}

function isAccessDenied(err: unknown): boolean {
  return (
    err instanceof NotAuthenticatedError ||
    err instanceof PermissionDeniedError ||
    (err instanceof VospaceError && (err.status === 401 || err.status === 403))
  );
}
