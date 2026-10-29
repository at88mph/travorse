import { dataNode } from '../vospace/node';
import { NodeAlreadyExistsError } from '../vospace/errors';
import type { VOSpaceClient } from '../vospace/vospace-client';

function nodePathInFolder(folderPath: string, fileName: string): string {
  const safeName = fileName.replace(/[/\\]/g, '_');
  if (folderPath === '/' || folderPath === '') return `/${safeName}`;
  return `${folderPath}/${safeName}`;
}

/** Create a data node (if needed) and upload bytes via the Files capability. */
export async function uploadIntoFolder(
  client: VOSpaceClient,
  folderPath: string,
  fileName: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<{ path: string }> {
  const path = nodePathInFolder(folderPath, fileName);
  try {
    await client.createNode(path, dataNode([]));
  } catch (err) {
    if (!(err instanceof NodeAlreadyExistsError)) throw err;
  }
  await client.putFileStream(path, body, contentType || 'application/octet-stream');
  return { path };
}
