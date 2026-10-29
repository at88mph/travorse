import { notFound } from 'next/navigation';
import { FolderListingView } from '@/components/folder-listing';
import { folderPathFromBrowseSegments, InvalidFolderPathError } from '@/lib/storage/folder-path';

interface BrowsePageProps {
  params: Promise<{ path?: string[] }>;
}

export default async function BrowsePage({ params }: BrowsePageProps) {
  const { path } = await params;
  try {
    folderPathFromBrowseSegments(path);
  } catch (err) {
    if (err instanceof InvalidFolderPathError) notFound();
    throw err;
  }

  return <FolderListingView />;
}
