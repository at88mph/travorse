import pkg from '../../package.json';

export interface VersionInfo {
  name: 'travorse';
  version: string;
}

/** Version of the running application artifact (from package.json at build time). */
export function getVersionInfo(): VersionInfo {
  return {
    name: 'travorse',
    version: pkg.version,
  };
}
