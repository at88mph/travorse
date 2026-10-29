import { createVospaceClient } from '@/lib/vospace/vospace-config';
import { getServerAccessToken } from '@/lib/server-auth';
import { folderPathFromPutSegments } from '@/lib/storage/api-paths';
import { createFolderAtPath } from '@/lib/storage/create-folder';
import { folderPathFromSegments, InvalidFolderPathError } from '@/lib/storage/folder-path';
import { listingErrorResponse } from '@/lib/storage/listing-error';
import { listFolderEntries } from '@/lib/storage/listing';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
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

  const url = new URL(request.url);
  const pageSizeRaw = url.searchParams.get('pageSize');
  const pageSize = pageSizeRaw ? parseInt(pageSizeRaw, 10) : undefined;
  const startUri = url.searchParams.get('startUri') ?? undefined;

  const accessToken = await getServerAccessToken();
  try {
    const listing = await listFolderEntries(createVospaceClient(accessToken), folderPath, {
      ...(pageSize != null && !Number.isNaN(pageSize) && pageSize > 0 ? { pageSize } : {}),
      ...(startUri ? { startUri } : {}),
    });
    return Response.json(listing, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const mapped = listingErrorResponse(err);
    return jsonMessage(mapped.message, mapped.status);
  }
}

export async function PUT(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  let folderPath: string;
  try {
    folderPath = folderPathFromPutSegments(path);
  } catch (err) {
    if (err instanceof InvalidFolderPathError) {
      return jsonMessage(err.message, 400);
    }
    throw err;
  }

  const accessToken = await getServerAccessToken();
  try {
    const entry = await createFolderAtPath(folderPath, accessToken);
    return Response.json(entry, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const mapped = listingErrorResponse(err);
    return jsonMessage(mapped.message, mapped.status);
  }
}

function jsonMessage(message: string, status: number) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
