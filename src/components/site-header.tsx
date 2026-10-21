import Link from 'next/link';
import { SignInOut } from '@/components/sign-in-out';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/browse" className="brand">
        Travorse
        <span>CANFAR storage browser</span>
      </Link>
      <SignInOut />
    </header>
  );
}
