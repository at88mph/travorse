'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useEffect, type ReactNode } from 'react';
import { authApiBasePath, normalizedBasePath } from '@/lib/env-client';

function SessionErrorRecovery() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.error !== 'RefreshAccessTokenError') return;
    const callbackUrl = normalizedBasePath() || '/';
    void signOut({ callbackUrl });
  }, [session?.error, status]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider basePath={authApiBasePath()} refetchInterval={5 * 60}>
      <SessionErrorRecovery />
      {children}
    </SessionProvider>
  );
}
