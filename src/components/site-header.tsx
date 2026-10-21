import Link from 'next/link';
import { SignInOut } from '@/components/sign-in-out';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/browse" className="brand">
        Tra<span className="brand-mark">vo</span>rse
        <span className="brand-tagline">CANFAR storage browser</span>
      </Link>
      <SignInOut />
    </header>
  );
}
