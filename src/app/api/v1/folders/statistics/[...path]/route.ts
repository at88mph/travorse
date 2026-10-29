import { createVospaceClient } from '@/lib/vospace/vospace-config';
import { getServerAccessToken } from '@/lib/server-auth';
import { InvalidFolderPathError, normalizeStatisticsFolderPath } from '@/lib/storage/folder-path';
import { listingErrorResponse } from '@/lib/storage/listing-error';
import { resolveFolderStatistics } from '@/lib/storage/statistics';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  let folderPath: string;
  try {
    folderPath = normalizeStatisticsFolderPath(path);
  } catch (err) {
    if (err instanceof InvalidFolderPathError) {
      return Response.json({ message: err.message }, { status: 400 });
    }
    throw err;
  }

  const accessToken = await getServerAccessToken();
  try {
    const stats = await resolveFolderStatistics(createVospaceClient(accessToken), folderPath);
    return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const mapped = listingErrorResponse(err);
    return Response.json({ message: mapped.message }, { status: mapped.status });
  }
}
