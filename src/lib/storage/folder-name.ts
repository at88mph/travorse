/** One path segment; unreserved URI characters only (no spaces or slashes). */
const FOLDER_NAME_PATTERN = /^[A-Za-z0-9._~-]+$/;

export class InvalidFolderNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFolderNameError';
  }
}

export function validateNewFolderName(raw: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = raw.trim();
  if (!name) {
    return { ok: false, message: 'Enter a folder name.' };
  }
  if (name === '.' || name === '..') {
    return { ok: false, message: 'That name is not allowed.' };
  }
  if (/\s/.test(name)) {
    return { ok: false, message: 'Spaces are not allowed. Use letters, numbers, or - . _ ~' };
  }
  if (name.includes('/') || name.includes('\\')) {
    return { ok: false, message: 'Folder name cannot contain slashes.' };
  }
  if (!FOLDER_NAME_PATTERN.test(name)) {
    return {
      ok: false,
      message: 'Use URI-safe characters only: letters, digits, and - . _ ~',
    };
  }
  if (name.length > 255) {
    return { ok: false, message: 'Name is too long (max 255 characters).' };
  }
  return { ok: true, name };
}

/** Full folder path for a new child under `parentFolderPath`. */
export function childFolderPath(parentFolderPath: string, segmentName: string): string {
  const validated = validateNewFolderName(segmentName);
  if (!validated.ok) throw new InvalidFolderNameError(validated.message);
  if (parentFolderPath === '/' || parentFolderPath === '') {
    return `/${validated.name}`;
  }
  return `${parentFolderPath}/${validated.name}`;
}
