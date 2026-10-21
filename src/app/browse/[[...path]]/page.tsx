import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { FolderListingView } from '@/components/folder-listing';
import { SiteHeader } from '@/components/site-header';
import { folderPathFromBrowseSegments, InvalidFolderPathError } from '@/lib/storage/folder-path';

interface BrowsePageProps {
  params: Promise<{ path?: string[] }>;
}

export default async function BrowsePage({ params }: BrowsePageProps) {
  const { path } = await params;
  let folderPath: string;
  try {
    folderPath = folderPathFromBrowseSegments(path);
  } catch (err) {
    if (err instanceof InvalidFolderPathError) notFound();
    throw err;
  }

  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="app-shell">
      <SiteHeader />
      <main>
        {signedIn ? (
          <p className="muted" style={{ marginTop: 0 }}>
            Signed in
            {session?.user?.name ? (
              <>
                {' '}
                as <strong>{session.user.name}</strong>
              </>
            ) : null}
            .
          </p>
        ) : null}
        <FolderListingView folderPath={folderPath} />
      </main>
    </div>
  );
}
