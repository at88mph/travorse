import { evaluateReadiness } from '@/lib/readiness';
import { getVersionInfo } from '@/lib/version';

export const dynamic = 'force-dynamic';

export function GET() {
  const readiness = evaluateReadiness();
  const body = {
    status: readiness.ready ? 'ready' : 'not_ready',
    version: getVersionInfo(),
    checks: readiness.checks,
    ...(readiness.message ? { message: readiness.message } : {}),
  };

  return Response.json(body, { status: readiness.ready ? 200 : 503 });
}
