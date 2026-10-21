import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/** Public session summary for the UI — no tokens (ADR-0005). */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      name: session.user.name,
      email: session.user.email,
      preferredUsername: session.user.preferredUsername,
    },
    error: session.error ?? null,
  });
}
