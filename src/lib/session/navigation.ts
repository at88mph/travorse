import type { Session } from 'next-auth';
import { getProjectsFolderPath, getUserHomeDir } from '@/lib/deployment-config';
import { NodeNotFoundError } from '@/lib/vospace/errors';
import { createVospaceClient } from '@/lib/vospace/vospace-config';

export interface SessionNavigation {
  homePath: string | null;
  projectsPath: string;
}

function canonicalUsername(session: Session): string | null {
  const raw = session.user?.preferredUsername ?? session.user?.name ?? session.user?.email;
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Resolve per-user quick-link targets for this deployment. */
export async function resolveSessionNavigation(
  session: Session | null,
  accessToken?: string,
): Promise<SessionNavigation> {
  const projectsPath = getProjectsFolderPath();
  if (!session?.user) {
    return { homePath: null, projectsPath };
  }

  const username = canonicalUsername(session);
  if (!username) {
    return { homePath: null, projectsPath };
  }

  const homeDir = getUserHomeDir();
  const homePath = `${homeDir}/${username}`;

  try {
    const client = createVospaceClient(accessToken);
    await client.getNode(homePath, 'detail=min');
    return { homePath, projectsPath };
  } catch (err) {
    if (err instanceof NodeNotFoundError) {
      return { homePath: null, projectsPath };
    }
    throw err;
  }
}
