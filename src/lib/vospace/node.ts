export type VospaceNodeType = 'ContainerNode' | 'DataNode' | 'LinkNode' | 'Node';

export interface VospaceProperty {
  uri: string;
  /** `null` is `xsi:nil` — a set-node request deletes this property. */
  value: string | null;
  readOnly?: boolean;
}

/** VOSpace node document. Internal to the server; not a public API shape. */
export interface VospaceNode {
  type: VospaceNodeType | string;
  uri: string;
  properties: VospaceProperty[];
  children?: VospaceNode[];
  busy?: boolean;
  accepts?: string[];
  provides?: string[];
  target?: string;
}

export function propertyValue(node: VospaceNode, uri: string): string | null | undefined {
  return node.properties.find((property) => property.uri === uri)?.value;
}

export function containerNode(
  properties: VospaceProperty[] = [],
  children: VospaceNode[] = [],
): VospaceNode {
  return { type: 'ContainerNode', uri: '', properties, children };
}

export function dataNode(properties: VospaceProperty[] = []): VospaceNode {
  return { type: 'DataNode', uri: '', properties, accepts: [], provides: [] };
}

export function linkNode(target: string, properties: VospaceProperty[] = []): VospaceNode {
  return { type: 'LinkNode', uri: '', properties, target };
}
