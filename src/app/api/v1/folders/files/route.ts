import { getServerAccessToken } from '@/lib/server-auth';
import { handleFolderUploadRequest } from '@/lib/storage/upload-handler';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const accessToken = await getServerAccessToken();
  return handleFolderUploadRequest(request, [], accessToken);
}
