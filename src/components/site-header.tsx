import { SignInOut } from '@/components/sign-in-out';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="brand">
        Travorse
        <span>CANFAR storage browser</span>
      </div>
      <SignInOut />
    </header>
  );
}
