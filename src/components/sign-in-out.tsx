'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { normalizedBasePath } from '@/lib/env-client';

export function SignInOut() {
  const { data: session, status } = useSession();
  const home = normalizedBasePath() || '/';

  if (status === 'loading') {
    return <span className="muted">Checking session…</span>;
  }

  if (!session?.user) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => signIn('oidc')}>
        Sign in
      </button>
    );
  }

  const label = session.user.name ?? session.user.preferredUsername ?? session.user.email ?? 'Signed in';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <span className="muted">{label}</span>
      <button type="button" className="btn" onClick={() => signOut({ callbackUrl: home })}>
        Sign out
      </button>
    </div>
  );
}
