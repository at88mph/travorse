import { BrowseShell } from '@/components/browse/browse-shell';

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <BrowseShell>{children}</BrowseShell>;
}
