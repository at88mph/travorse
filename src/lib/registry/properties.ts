/**
 * Parse Java-style `.properties` maps served by the IVOA Registry
 * (`resource-caps`, `applications` canned queries).
 */
export function parseJavaProperties(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(value);
    map.set(key, list);
  }

  return map;
}

export function getSingleProperty(map: Map<string, string[]>, key: string): string {
  const values = map.get(key);
  if (!values || values.length === 0) {
    throw new Error(`Property not found: ${key}`);
  }
  if (values.length > 1) {
    throw new Error(`Property has multiple values: ${key}`);
  }
  return values[0];
}
