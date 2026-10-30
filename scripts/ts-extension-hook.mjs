/** Resolve extensionless relative imports and `@/` aliases for the Node test runner. */

import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const path = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url);
    return nextResolve(pathToFileURL(path.pathname).href, context);
  }
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.(?:[cm]?[jt]s|json|node)$/.test(specifier)
  ) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
