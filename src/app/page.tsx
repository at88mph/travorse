import { auth } from '@/auth';
import { SiteHeader } from '@/components/site-header';

export default async function HomePage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="card">
        <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Welcome to Travorse</h1>
        {signedIn ? (
          <>
            <p>
              You are signed in
              {session?.user?.name ? (
                <>
                  {' '}
                  as <strong>{session.user.name}</strong>
                </>
              ) : null}
              .
            </p>
            <p className="muted">
              File and folder browsing will appear here in a later release. OIDC via your configured
              Identity Provider is active.
            </p>
          </>
        ) : (
          <>
            <p>Sign in with your platform Identity Provider (Keycloak / OIDC) to access storage.</p>
            <p className="muted">
              Configure <code>OIDC_ISSUER</code>, <code>OIDC_CLIENT_ID</code>, and{' '}
              <code>OIDC_CLIENT_SECRET</code> in <code>.env.local</code> (see <code>.env.example</code>
              ).
            </p>
          </>
        )}
      </main>
    </div>
  );
}
