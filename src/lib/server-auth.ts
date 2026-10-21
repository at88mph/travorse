import { auth, getServerAccessToken } from '@/auth';

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session;
}

export { getServerAccessToken };
