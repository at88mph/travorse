import { getServerAccessToken } from '@/lib/server-auth';
import { handleFolderUploadRequest } from '@/lib/storage/upload-handler';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const accessToken = await getServerAccessToken();
  return handleFolderUploadRequest(request, path, accessToken);
}
