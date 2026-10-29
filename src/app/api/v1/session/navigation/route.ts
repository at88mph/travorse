import { auth } from '@/auth';
import { getServerAccessToken } from '@/lib/server-auth';
import { resolveSessionNavigation } from '@/lib/session/navigation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const accessToken = await getServerAccessToken();
  try {
    const navigation = await resolveSessionNavigation(session, accessToken);
    return Response.json(navigation, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to resolve session navigation';
    return Response.json({ message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
