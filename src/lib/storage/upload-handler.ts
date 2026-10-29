import { createVospaceClient } from '@/lib/vospace/vospace-config';
import { folderPathFromUploadSegments } from '@/lib/storage/api-paths';
import { uploadIntoFolder } from '@/lib/storage/file-transfer';
import { listingErrorResponse } from '@/lib/storage/listing-error';

export async function handleFolderUploadRequest(
  request: Request,
  pathSegments: string[],
  accessToken?: string,
): Promise<Response> {
  let folderPath: string;
  try {
    folderPath = folderPathFromUploadSegments(pathSegments);
  } catch {
    return jsonMessage('Invalid folder path', 400);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonMessage('Expected multipart form data', 400);
  }

  const files = formData.getAll('file').filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return jsonMessage('No files provided', 400);
  }

  try {
    const client = createVospaceClient(accessToken);
    const uploaded: { path: string; name: string }[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const result = await uploadIntoFolder(
        client,
        folderPath,
        file.name,
        buffer,
        file.type || 'application/octet-stream',
      );
      uploaded.push({ path: result.path, name: file.name });
    }
    return Response.json({ uploaded }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const mapped = listingErrorResponse(err);
    return jsonMessage(mapped.message, mapped.status);
  }
}

function jsonMessage(message: string, status: number) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
