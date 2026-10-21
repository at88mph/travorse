import { auth } from '@/auth';
import { FolderListingView } from '@/components/folder-listing';
import { SiteHeader } from '@/components/site-header';

export default async function HomePage() {
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
        <FolderListingView folderPath="/" />
      </main>
    </div>
  );
}
