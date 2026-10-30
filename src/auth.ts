import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import {
  accessTokenRefreshMarginMs,
  getOidcConfig,
  tokenEndpoint,
} from '@/lib/oidc-config';
import { authApiBasePath, getEnv, normalizedBasePath } from '@/lib/env';

interface OidcProfile {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
}

function secureCookiesEnabled(): boolean | undefined {
  const authUrl = getEnv('AUTH_URL') ?? getEnv('NEXTAUTH_URL');
  return authUrl?.startsWith('https:') ? true : undefined;
}

function isAccessTokenValid(expiresAt: number | undefined): boolean {
  if (!expiresAt) return false;
  return Date.now() < expiresAt - accessTokenRefreshMarginMs();
}

const refreshInFlight = new Map<string, Promise<Record<string, unknown>>>();

async function refreshAccessToken(token: Record<string, unknown>): Promise<Record<string, unknown>> {
  const refreshToken = token.refreshToken as string | undefined;
  if (!refreshToken) {
    return { ...token, accessToken: undefined, accessTokenExpires: undefined, error: 'RefreshAccessTokenError' };
  }

  const existing = refreshInFlight.get(refreshToken);
  if (existing) return existing;

  const oidc = getOidcConfig();
  const promise = (async () => {
    try {
      const response = await fetch(tokenEndpoint(oidc.issuer), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: oidc.clientId,
          client_secret: oidc.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        access_token?: string;
        expires_in?: number;
        refresh_token?: string;
        error?: string;
      };

      if (!response.ok) {
        const terminal = response.status >= 400 && response.status < 500;
        return {
          ...token,
          accessToken: undefined,
          accessTokenExpires: undefined,
          error: terminal ? 'RefreshAccessTokenError' : undefined,
        };
      }

      return {
        ...token,
        accessToken: body.access_token,
        accessTokenExpires: Date.now() + (body.expires_in ?? 300) * 1000,
        refreshToken: body.refresh_token ?? refreshToken,
        error: undefined,
      };
    } catch {
      return { ...token, accessToken: undefined, accessTokenExpires: undefined };
    }
  })().finally(() => refreshInFlight.delete(refreshToken));

  refreshInFlight.set(refreshToken, promise);
  return promise;
}

const authConfig: NextAuthConfig = {
  secret: getEnv('AUTH_SECRET'),
  trustHost: getEnv('AUTH_TRUST_HOST') === 'true' ? true : undefined,
  basePath: authApiBasePath(),
  useSecureCookies: secureCookiesEnabled(),
  pages: {
    signIn: `${normalizedBasePath() || ''}/`,
  },
  providers: [],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account && user) {
        const p = profile as OidcProfile | undefined;
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          preferredUsername: p?.preferred_username ?? user.name,
          error: undefined,
        };
      }

      if (isAccessTokenValid(token.accessTokenExpires as number | undefined)) {
        return token;
      }

      return await refreshAccessToken({ ...token });
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.sub ?? session.user.id,
        preferredUsername: (token.preferredUsername as string | null) ?? session.user.name,
      };
      if (token.error === 'RefreshAccessTokenError') {
        session.error = 'RefreshAccessTokenError';
      }
      return session;
    },
  },
};

function buildProvider() {
  const oidc = getOidcConfig(true);
  return {
    id: 'oidc',
    name: 'Sign in with Identity Provider',
    type: 'oidc' as const,
    issuer: oidc.issuer,
    clientId: oidc.clientId,
    clientSecret: oidc.clientSecret,
    authorization: { params: { scope: oidc.scope } },
    checks: ['pkce', 'state'] as ('pkce' | 'state')[],
    profile(profile: OidcProfile) {
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name ?? profile.preferred_username,
        preferredUsername: profile.preferred_username,
      };
    },
  };
}

authConfig.providers = [buildProvider()];

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/** Bearer token for server-side VOSpace/GMS calls. Never send to the client. */
export async function getServerAccessToken(): Promise<string | undefined> {
  const session = await auth();
  if (session?.error === 'RefreshAccessTokenError') return undefined;

  const { cookies } = await import('next/headers');
  const { getToken } = await import('next-auth/jwt');
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const jwt = await getToken({
    secret: getEnv('AUTH_SECRET'),
    secureCookie: secureCookiesEnabled() ?? false,
    req: { headers: { cookie: cookieHeader } } as unknown as Request,
  });

  return typeof jwt?.accessToken === 'string' ? jwt.accessToken : undefined;
}
