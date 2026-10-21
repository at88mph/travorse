export interface EntryBase {
  kind: 'folder' | 'file' | 'link';
  name: string;
  path: string;
  /** vos:// URI. Support/debug field; the UI labels entries by name. */
  uri: string;
  modified: string;
  modifiedDisplay: string;
  owner: string;
  canRead: boolean;
  canWrite: boolean;
  locked: boolean;
  isPublic: boolean;
  readGroups: string[];
  writeGroups: string[];
  /** Semantic icon key: `folder`, `file`, or `link`. */
  icon: string;
}

export interface FolderEntry extends EntryBase {
  kind: 'folder';
}

export interface FileEntry extends EntryBase {
  kind: 'file';
  sizeBytes: number;
  sizeDisplay: string;
}

export interface LinkEntry extends EntryBase {
  kind: 'link';
  target: string;
  navigatePath?: string;
}

export type StorageEntry = FolderEntry | FileEntry | LinkEntry;

export interface FolderListing {
  folderPath: string;
  parentPath: string | null;
  canWrite: boolean;
  canRead: boolean;
  entries: StorageEntry[];
  nextStartUri?: string;
  totalCount?: number;
}
