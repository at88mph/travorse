import { buildPublicConfig } from '@/lib/public-config';

export const dynamic = 'force-dynamic';

/** Sanitized deployment config for the browser (no Registry calls). */
export async function GET() {
  return Response.json(buildPublicConfig(), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
