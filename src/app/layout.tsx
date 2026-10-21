import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { VersionFooter } from '@/components/version-footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Travorse',
  description: 'CANFAR VOSpace storage browser',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <VersionFooter />
        </Providers>
      </body>
    </html>
  );
}
