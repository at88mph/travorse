import { createVospaceClient } from '@/lib/vospace/vospace-config';
import { getServerAccessToken } from '@/lib/server-auth';
import { listingErrorResponse } from '@/lib/storage/listing-error';
import { resolveFolderStatistics } from '@/lib/storage/statistics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const accessToken = await getServerAccessToken();
  try {
    const stats = await resolveFolderStatistics(createVospaceClient(accessToken), '/');
    return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const mapped = listingErrorResponse(err);
    return Response.json({ message: mapped.message }, { status: mapped.status });
  }
}
