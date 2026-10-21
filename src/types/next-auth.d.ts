import 'next-auth';
import 'next-auth/jwt';

/** Client-visible session: no access or refresh tokens (ADR-0005). */
declare module 'next-auth' {
  interface Session {
    error?: 'RefreshAccessTokenError';
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      preferredUsername?: string | null;
    };
  }

  interface User {
    preferredUsername?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: 'RefreshAccessTokenError';
    preferredUsername?: string | null;
  }
}
