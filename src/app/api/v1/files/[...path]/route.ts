import { createVospaceClient } from '@/lib/vospace/vospace-config';
import { getServerAccessToken } from '@/lib/server-auth';
import { filePathFromDownloadSegments } from '@/lib/storage/api-paths';
import { InvalidFolderPathError } from '@/lib/storage/folder-path';
import { listingErrorResponse } from '@/lib/storage/listing-error';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  let filePath: string;
  try {
    filePath = filePathFromDownloadSegments(path);
  } catch (err) {
    if (err instanceof InvalidFolderPathError) {
      return jsonMessage(err.message, 400);
    }
    throw err;
  }

  const accessToken = await getServerAccessToken();
  try {
    const client = createVospaceClient(accessToken);
    const node = await client.getNode(filePath, 'detail=min');
    if (node.type !== 'DataNode') {
      return jsonMessage('That path is not a file', 409);
    }

    const location = await client.resolveBrowserDownloadURL(filePath);
    return Response.redirect(location, 303);
  } catch (err) {
    const mapped = listingErrorResponse(err);
    return jsonMessage(mapped.message, mapped.status);
  }
}

function jsonMessage(message: string, status: number) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
