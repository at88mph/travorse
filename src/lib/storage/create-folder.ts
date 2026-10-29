import { containerNode } from '../vospace/node';
import { createVospaceClient } from '../vospace/vospace-config';
import { toStorageEntry } from './listing';
import type { FolderEntry } from './types';

export async function createFolderAtPath(
  folderPath: string,
  accessToken?: string,
): Promise<FolderEntry> {
  const client = createVospaceClient(accessToken);
  const created = await client.createNode(folderPath, containerNode([]));
  const uri = created.uri || client.uriPrefix.resolve(folderPath).toString();
  const entry = toStorageEntry({ ...created, type: 'ContainerNode', uri }, client.uriPrefix);
  if (!entry || entry.kind !== 'folder') {
    throw new Error('Failed to map created folder');
  }
  return entry;
}
