import { createVospaceClient } from '@/lib/vospace/vospace-config';
import { getServerAccessToken } from '@/lib/server-auth';
import { folderPathFromSegments, InvalidFolderPathError } from '@/lib/storage/folder-path';
import { listingErrorResponse } from '@/lib/storage/listing-error';
import { listFolderEntries } from '@/lib/storage/listing';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  let folderPath: string | null;
  try {
    folderPath = folderPathFromSegments(path);
  } catch (err) {
    if (err instanceof InvalidFolderPathError) {
      return jsonMessage(err.message, 400);
    }
    throw err;
  }
  if (folderPath === null) return jsonMessage('Not found', 404);

  const accessToken = await getServerAccessToken();
  try {
    const listing = await listFolderEntries(createVospaceClient(accessToken), folderPath);
    return Response.json(listing, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const mapped = listingErrorResponse(err);
    return jsonMessage(mapped.message, mapped.status);
  }
}

function jsonMessage(message: string, status: number) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
