import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VospaceNode } from '../vospace/node';
import { NodeNotFoundError } from '../vospace/errors';
import { PROPERTY_LENGTH, PROPERTY_QUOTA } from '../vospace/standards';
import { VosUri } from '../vospace/vos-uri';
import type { NodeReader } from './listing';
import { resolveFolderStatistics, statisticsNotAvailable } from './statistics';

const prefix = new VosUri('vos://cadc.nrc.ca~arc');

function prop(uri: string, value: string) {
  return { uri, value };
}

function reader(nodes: Record<string, VospaceNode>): NodeReader {
  return {
    uriPrefix: prefix,
    async getNode(path: string) {
      const key = path === '' ? '/' : path;
      const node = nodes[key];
      if (!node) throw new NodeNotFoundError(`missing ${key}`);
      return node;
    },
  };
}

describe('folder statistics', () => {
  it('returns none when no quota property exists on the walk', async () => {
    const stats = await resolveFolderStatistics(
      reader({
        '/home/ada/docs': {
          type: 'ContainerNode',
          uri: 'vos://cadc.nrc.ca~arc/home/ada/docs',
          properties: [],
        },
        '/home/ada': {
          type: 'ContainerNode',
          uri: 'vos://cadc.nrc.ca~arc/home/ada',
          properties: [prop(PROPERTY_LENGTH, '1000')],
        },
        '/': {
          type: 'ContainerNode',
          uri: 'vos://cadc.nrc.ca~arc',
          properties: [],
        },
      }),
      '/home/ada/docs',
    );
    assert.deepEqual(stats, statisticsNotAvailable());
  });

  it('walks toward root until quota is found', async () => {
    const stats = await resolveFolderStatistics(
      reader({
        '/home/ada/docs': {
          type: 'ContainerNode',
          uri: 'vos://cadc.nrc.ca~arc/home/ada/docs',
          properties: [],
        },
        '/home/ada': {
          type: 'ContainerNode',
          uri: 'vos://cadc.nrc.ca~arc/home/ada',
          properties: [
            prop(PROPERTY_QUOTA, `${5 * 1024 * 1024 * 1024}`),
            prop(PROPERTY_LENGTH, `${2 * 1024 * 1024 * 1024}`),
          ],
        },
      }),
      '/home/ada/docs',
    );
    assert.equal(stats.kind, 'quota');
    if (stats.kind !== 'quota') return;
    assert.equal(stats.resolvedAgainstPath, '/home/ada');
    assert.equal(stats.quotaBytes, 5 * 1024 * 1024 * 1024);
    assert.equal(stats.usedBytes, 2 * 1024 * 1024 * 1024);
    assert.equal(stats.quotaDisplay, '5 GB');
    assert.equal(stats.usedDisplay, '2 GB');
    assert.equal(stats.remainingDisplay, '3 GB');
    assert.equal(stats.usedPercent, 40);
  });

  it('skips missing folders while walking', async () => {
    const stats = await resolveFolderStatistics(
      reader({
        '/': {
          type: 'ContainerNode',
          uri: 'vos://cadc.nrc.ca~arc',
          properties: [prop(PROPERTY_QUOTA, '1073741824'), prop(PROPERTY_LENGTH, '536870912')],
        },
      }),
      '/missing/deep',
    );
    assert.equal(stats.kind, 'quota');
    if (stats.kind !== 'quota') return;
    assert.equal(stats.resolvedAgainstPath, '/');
    assert.equal(stats.usedPercent, 50);
  });
});
