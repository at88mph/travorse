import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  browseHref,
  folderBreadcrumbs,
  folderPathFromBrowseSegments,
  folderPathFromSegments,
  InvalidFolderPathError,
} from './folder-path';
import { listFolderEntries, NotAFolderError, toFolderListing } from './listing';
import type { VospaceNode } from '../vospace/node';
import {
  PROPERTY_CREATOR,
  PROPERTY_DATE,
  PROPERTY_GROUP_READ,
  PROPERTY_GROUP_WRITE,
  PROPERTY_IS_PUBLIC,
  PROPERTY_LENGTH,
  PROPERTY_WRITABLE,
} from '../vospace/standards';
import { VosUri } from '../vospace/vos-uri';

const prefix = new VosUri('vos://cadc.nrc.ca~arc');

function prop(uri: string, value: string | null) {
  return { uri, value };
}

describe('folder path', () => {
  it('treats /folders/entries as the root', () => {
    assert.equal(folderPathFromSegments(['entries']), '/');
    assert.equal(folderPathFromSegments(['home', 'docs', 'entries']), '/home/docs');
    assert.equal(folderPathFromSegments(['home']), null);
  });

  it('rejects parent segments', () => {
    assert.throws(() => folderPathFromSegments(['home', '..', 'entries']), InvalidFolderPathError);
  });

  it('maps browse URLs onto folder paths', () => {
    assert.equal(folderPathFromBrowseSegments(undefined), '/');
    assert.equal(folderPathFromBrowseSegments([]), '/');
    assert.equal(folderPathFromBrowseSegments(['home', 'My docs']), '/home/My docs');
    assert.equal(browseHref('/'), '/browse');
    assert.equal(browseHref('/home/My docs'), '/browse/home/My%20docs');
    assert.deepEqual(
      folderBreadcrumbs('/home/docs').map((crumb) => crumb.href),
      ['/browse', '/browse/home', '/browse/home/docs'],
    );
    assert.throws(() => folderPathFromBrowseSegments(['home', '..']), InvalidFolderPathError);
  });
});

describe('folder listing', () => {
  it('maps a root container to files, folders, and links', () => {
    const node: VospaceNode = {
      type: 'ContainerNode',
      uri: 'vos://cadc.nrc.ca~arc',
      properties: [prop(PROPERTY_WRITABLE, 'true')],
      children: [
        {
          type: 'DataNode',
          uri: 'vos://cadc.nrc.ca~arc/notes.txt',
          properties: [
            prop(PROPERTY_LENGTH, '1536'),
            prop(PROPERTY_DATE, '2026-10-21T18:04:00.000'),
            prop(PROPERTY_CREATOR, 'ada'),
            prop(PROPERTY_IS_PUBLIC, 'false'),
          ],
        },
        {
          type: 'ContainerNode',
          uri: 'vos://cadc.nrc.ca~arc/Projects',
          properties: [
            prop(PROPERTY_GROUP_READ, 'ivo://cadc.nrc.ca/gms?CADC%20staff ivo://cadc.nrc.ca/gms?reviewers'),
            prop(PROPERTY_GROUP_WRITE, 'ivo://cadc.nrc.ca/gms?writers'),
            prop(PROPERTY_WRITABLE, 'false'),
          ],
        },
        {
          type: 'LinkNode',
          uri: 'vos://cadc.nrc.ca~arc/shortcut',
          properties: [],
          target: 'vos://cadc.nrc.ca~arc/Projects',
        },
        {
          type: 'LinkNode',
          uri: 'vos://cadc.nrc.ca~arc/external',
          properties: [],
          target: 'https://example.com/data',
        },
      ],
    };

    const listing = toFolderListing(node, prefix, '/');
    assert.equal(listing.folderPath, '/');
    assert.equal(listing.parentPath, null);
    assert.equal(listing.canRead, true);
    assert.equal(listing.canWrite, true);
    assert.deepEqual(
      listing.entries.map((entry) => entry.kind),
      ['folder', 'file', 'link', 'link'],
    );

    const folder = listing.entries[0];
    assert.equal(folder?.name, 'Projects');
    assert.equal(folder?.path, '/Projects');
    assert.equal(folder?.icon, 'folder');
    assert.deepEqual(folder?.readGroups, ['CADC staff', 'reviewers']);
    assert.deepEqual(folder?.writeGroups, ['writers']);
    assert.equal(folder?.canWrite, false);

    const file = listing.entries[1];
    assert.equal(file?.kind, 'file');
    if (file?.kind === 'file') {
      assert.equal(file.sizeBytes, 1536);
      assert.equal(file.sizeDisplay, '1.5 KB');
      assert.equal(file.owner, 'ada');
      assert.equal(file.modified, '2026-10-21T18:04:00.000Z');
      assert.match(file.modifiedDisplay, /UTC/);
    }

    const shortcut = listing.entries.find((entry) => entry.name === 'shortcut');
    assert.equal(shortcut?.kind, 'link');
    if (shortcut?.kind === 'link') {
      assert.equal(shortcut.target, 'vos://cadc.nrc.ca~arc/Projects');
      assert.equal(shortcut.navigatePath, '/Projects');
    }
    const external = listing.entries.find((entry) => entry.name === 'external');
    if (external?.kind === 'link') {
      assert.equal(external.navigatePath, undefined);
    }
  });

  it('asks VOSpace for the root at maximum detail', async () => {
    let seenPath = 'unset';
    let seenQuery = 'unset';
    const listing = await listFolderEntries(
      {
        uriPrefix: prefix,
        async getNode(path, query) {
          seenPath = path;
          seenQuery = query ?? '';
          return {
            type: 'ContainerNode',
            uri: 'vos://cadc.nrc.ca~arc',
            properties: [],
            children: [],
          };
        },
      },
      '/',
    );
    assert.equal(seenPath, '/');
    assert.equal(seenQuery, 'detail=max');
    assert.deepEqual(listing.entries, []);
    assert.equal(listing.parentPath, null);
  });

  it('rejects a file path', () => {
    assert.throws(
      () =>
        toFolderListing(
          { type: 'DataNode', uri: 'vos://cadc.nrc.ca~arc/notes.txt', properties: [] },
          prefix,
          '/notes.txt',
        ),
      NotAFolderError,
    );
  });
});
