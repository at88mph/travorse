'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useEffect, type ReactNode } from 'react';
import { QueryProvider } from '@/components/query-provider';
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

export function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session} basePath={authApiBasePath()} refetchInterval={5 * 60}>
      <QueryProvider>
        <SessionErrorRecovery />
        {children}
      </QueryProvider>
    </SessionProvider>
  );
}
