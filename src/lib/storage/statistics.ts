import { propertyValue } from '../vospace/node';
import type { VospaceNode } from '../vospace/node';
import { NodeNotFoundError } from '../vospace/errors';
import { PROPERTY_LENGTH, PROPERTY_QUOTA } from '../vospace/standards';
import type { StorageStatisticsResponse } from '@/lib/storage/entries-client';
import { formatBytes } from './listing';
import type { NodeReader } from './listing';
import { parentFolderPath } from './folder-path';

const NODE_DETAIL = 'detail=min';

/** Placeholder when no ancestor folder reports a quota property. */
export function statisticsNotAvailable(): StorageStatisticsResponse {
  return {
    kind: 'none',
    message: 'Storage quota is not available for this location.',
  };
}

function readByteProperty(node: VospaceNode, uri: string): number | null {
  const raw = propertyValue(node, uri);
  if (raw == null || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function quotaFromNode(node: VospaceNode, resolvedAgainstPath: string): StorageStatisticsResponse | null {
  const quotaBytes = readByteProperty(node, PROPERTY_QUOTA);
  if (quotaBytes === null) return null;

  const usedBytes = readByteProperty(node, PROPERTY_LENGTH);
  const remainingBytes =
    usedBytes === null ? null : Math.max(0, quotaBytes - usedBytes);
  const usedPercent =
    usedBytes === null || quotaBytes <= 0
      ? null
      : Math.min(100, Math.round((usedBytes / quotaBytes) * 100));

  return {
    kind: 'quota',
    resolvedAgainstPath,
    quotaBytes,
    usedBytes,
    remainingBytes,
    quotaDisplay: formatBytes(quotaBytes),
    usedDisplay: usedBytes === null ? '—' : formatBytes(usedBytes),
    remainingDisplay: remainingBytes === null ? '—' : formatBytes(remainingBytes),
    usedPercent,
  };
}

/** Walk from `folderPath` toward root until a folder carries {@link PROPERTY_QUOTA}. */
export async function resolveFolderStatistics(
  reader: NodeReader,
  folderPath: string,
): Promise<StorageStatisticsResponse> {
  let path = folderPath === '' ? '/' : folderPath;

  while (true) {
    let node: VospaceNode;
    try {
      node = await reader.getNode(path === '/' ? '' : path, NODE_DETAIL);
    } catch (err) {
      if (err instanceof NodeNotFoundError) {
        if (path === '/') return statisticsNotAvailable();
        const parent = parentFolderPath(path);
        path = parent ?? '/';
        continue;
      }
      throw err;
    }

    if (node.type === 'ContainerNode') {
      const stats = quotaFromNode(node, path);
      if (stats) return stats;
    }

    if (path === '/') return statisticsNotAvailable();
    const parent = parentFolderPath(path);
    path = parent ?? '/';
  }
}
