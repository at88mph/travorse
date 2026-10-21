import { getVersionInfo } from '@/lib/version';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    status: 'ok',
    ...getVersionInfo(),
  });
}
