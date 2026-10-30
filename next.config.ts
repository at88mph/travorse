import type { NextConfig } from 'next';

function nextBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!raw || raw === '/') return '';
  return raw.startsWith('/') ? raw.replace(/\/$/, '') : `/${raw.replace(/\/$/, '')}`;
}

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  basePath: nextBasePath(),
};

export default nextConfig;
