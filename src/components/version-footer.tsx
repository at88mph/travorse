'use client';

import { withBasePath } from '@/lib/env-client';
import { useEffect, useState } from 'react';

export function VersionFooter() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    fetch(withBasePath('/api/version'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { version?: string } | null) => {
        if (data?.version) setLabel(data.version);
      })
      .catch(() => {});
  }, []);

  if (!label) return null;

  return (
    <footer className="version-footer" aria-label="Application version">
      Travorse {label}
    </footer>
  );
}
