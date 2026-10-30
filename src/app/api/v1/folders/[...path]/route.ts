import { createVospaceClient } from '@/lib/vospace/vospace-config';
import { getServerAccessToken } from '@/lib/server-auth';
import { folderPathFromPutSegments } from '@/lib/storage/api-paths';
import { createFolderAtPath } from '@/lib/storage/create-folder';
import { folderPathFromSegments, InvalidFolderPathError } from '@/lib/storage/folder-path';
import { listingErrorResponse } from '@/lib/storage/listing-error';
import { listFolderEntries, type ListFolderOptions } from '@/lib/storage/listing';
import { LISTING_DEFAULT_PAGE_SIZE, LISTING_MAX_PAGE_SIZE } from '@/lib/storage/listing-page-size';
import { getVospaceFeatures } from '@/lib/vospace-features';

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
  const features = getVospaceFeatures();
  const listOptions: ListFolderOptions = {};
  if (features.paging) {
    const pageSizeRaw = url.searchParams.get('pageSize');
    const parsed = pageSizeRaw ? parseInt(pageSizeRaw, 10) : undefined;
    if (parsed != null && !Number.isNaN(parsed) && parsed > 0) {
      listOptions.pageSize = Math.min(Math.floor(parsed), LISTING_MAX_PAGE_SIZE);
    } else {
      listOptions.pageSize = LISTING_DEFAULT_PAGE_SIZE;
    }
    const startUri = url.searchParams.get('startUri');
    if (startUri) listOptions.startUri = startUri;
  }

  const accessToken = await getServerAccessToken();
  const started = Date.now();
  try {
    const listing = await listFolderEntries(createVospaceClient(accessToken), folderPath, listOptions);
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    const elapsed = Date.now() - started;
    headers['Server-Timing'] = `bff;dur=${elapsed}, entries;desc=${listing.entries.length}, paged;desc=${features.paging}`;
    return Response.json(listing, { headers });
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
