import { getEnv } from '@/lib/env';

/** Base path for user home folders (for example `/home`). */
export function getUserHomeDir(): string {
  const raw = getEnv('VOSPACE_USER_HOME_DIR') ?? '/home';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

/** Shared projects tree path (for example `/projects`). */
export function getProjectsFolderPath(): string {
  const raw = getEnv('VOSPACE_PROJECTS_FOLDER_PATH') ?? '/projects';
  return raw.startsWith('/') ? raw : `/${raw}`;
}
