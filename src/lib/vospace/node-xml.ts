import { NodeParsingError } from './errors';
import type { VospaceNode, VospaceNodeType, VospaceProperty } from './node';
import { VOSPACE_XML_NS, XSI_NS } from './standards';

interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlElement[];
  text: string;
}

/**
 * Read a VOSpace node document. Accepts the `vos:` prefix used by OpenCADC
 * `NodeWriter` and a default-namespace document.
 */
export function parseNodeXml(xml: string): VospaceNode {
  const root = parseRoot(xml);
  if (root.name !== 'node') {
    throw new NodeParsingError('VOSpace response did not contain a node');
  }
  return xmlToNode(root);
}

/** Write a node document in the OpenCADC `vos:` prefixed form. */
export function writeNodeXml(node: VospaceNode): string {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  writeNode(node, lines, 0, true);
  return lines.join('\n');
}

function xmlToNode(el: XmlElement): VospaceNode {
  const type = nodeTypeName(attr(el, 'type'));
  const node: VospaceNode = {
    type,
    uri: attr(el, 'uri') ?? '',
    properties: readProperties(el),
  };
  const busy = attr(el, 'busy');
  if (busy !== undefined) node.busy = busy === 'true';

  if (type === 'LinkNode' || el.children.some((child) => child.name === 'target')) {
    node.target = el.children.find((child) => child.name === 'target')?.text ?? '';
  }
  if (
    type === 'DataNode' ||
    el.children.some((child) => child.name === 'accepts' || child.name === 'provides')
  ) {
    node.accepts = readViews(el, 'accepts');
    node.provides = readViews(el, 'provides');
  }
  const nodes = el.children.find((child) => child.name === 'nodes');
  if (type === 'ContainerNode' || nodes) {
    node.children = (nodes?.children ?? [])
      .filter((child) => child.name === 'node')
      .map(xmlToNode);
  }
  return node;
}

function readProperties(el: XmlElement): VospaceProperty[] {
  const block = el.children.find((child) => child.name === 'properties');
  if (!block) return [];
  return block.children
    .filter((child) => child.name === 'property')
    .map((child) => {
      const nil = attr(child, 'nil') === 'true';
      const property: VospaceProperty = {
        uri: attr(child, 'uri') ?? '',
        value: nil ? null : child.text,
      };
      if (attr(child, 'readOnly') === 'true') property.readOnly = true;
      return property;
    });
}

function readViews(el: XmlElement, name: string): string[] {
  const block = el.children.find((child) => child.name === name);
  if (!block) return [];
  return block.children
    .filter((child) => child.name === 'view')
    .map((child) => attr(child, 'uri') ?? '')
    .filter((uri) => uri.length > 0);
}

function nodeTypeName(value: string | undefined): VospaceNodeType | string {
  if (!value) return 'Node';
  const colon = value.lastIndexOf(':');
  const local = colon >= 0 ? value.slice(colon + 1) : value;
  if (local === 'ContainerNode' || local === 'DataNode' || local === 'LinkNode' || local === 'Node') {
    return local;
  }
  return local;
}

function writeNode(node: VospaceNode, lines: string[], depth: number, root: boolean): void {
  if (!node.uri) {
    throw new NodeParsingError('Cannot write a VOSpace node without a uri');
  }
  const pad = '  '.repeat(depth);
  const attrs = [
    root ? `xmlns:vos="${VOSPACE_XML_NS}"` : '',
    root ? `xmlns:xsi="${XSI_NS}"` : '',
    `uri="${escapeAttr(node.uri)}"`,
    `xsi:type="vos:${node.type}"`,
    node.type === 'DataNode' && typeof node.busy === 'boolean' ? `busy="${node.busy}"` : '',
  ].filter(Boolean);
  lines.push(`${pad}<vos:node ${attrs.join(' ')}>`);

  writeProperties(node.properties, lines, depth + 1);
  if (node.type === 'ContainerNode' || node.children) {
    writeChildren(node.children ?? [], lines, depth + 1);
  } else if (node.type === 'DataNode') {
    writeViews('accepts', node.accepts ?? [], lines, depth + 1);
    writeViews('provides', node.provides ?? [], lines, depth + 1);
  } else if (node.type === 'LinkNode') {
    if (!node.target) throw new NodeParsingError('Link node is missing a target');
    lines.push(`${'  '.repeat(depth + 1)}<vos:target>${escapeText(node.target)}</vos:target>`);
  }

  lines.push(`${pad}</vos:node>`);
}

function writeProperties(properties: VospaceProperty[], lines: string[], depth: number): void {
  const pad = '  '.repeat(depth);
  if (properties.length === 0) {
    lines.push(`${pad}<vos:properties/>`);
    return;
  }
  lines.push(`${pad}<vos:properties>`);
  const inner = '  '.repeat(depth + 1);
  for (const property of properties) {
    const readOnly = property.readOnly ? ' readOnly="true"' : '';
    const uri = `uri="${escapeAttr(property.uri)}"`;
    if (property.value === null) {
      lines.push(`${inner}<vos:property ${uri}${readOnly} xsi:nil="true"/>`);
    } else {
      lines.push(`${inner}<vos:property ${uri}${readOnly}>${escapeText(property.value)}</vos:property>`);
    }
  }
  lines.push(`${pad}</vos:properties>`);
}

function writeChildren(children: VospaceNode[], lines: string[], depth: number): void {
  const pad = '  '.repeat(depth);
  if (children.length === 0) {
    lines.push(`${pad}<vos:nodes/>`);
    return;
  }
  lines.push(`${pad}<vos:nodes>`);
  for (const child of children) writeNode(child, lines, depth + 1, false);
  lines.push(`${pad}</vos:nodes>`);
}

function writeViews(name: string, uris: string[], lines: string[], depth: number): void {
  const pad = '  '.repeat(depth);
  if (uris.length === 0) {
    lines.push(`${pad}<vos:${name}/>`);
    return;
  }
  lines.push(`${pad}<vos:${name}>`);
  for (const uri of uris) {
    lines.push(`${'  '.repeat(depth + 1)}<vos:view uri="${escapeAttr(uri)}"/>`);
  }
  lines.push(`${pad}</vos:${name}>`);
}

function attr(el: XmlElement, local: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(el.attrs, local)) return el.attrs[local];
  const suffix = `:${local}`;
  for (const [key, value] of Object.entries(el.attrs)) {
    if (key.endsWith(suffix)) return value;
  }
  return undefined;
}

function parseRoot(xml: string): XmlElement {
  const cursor = { i: 0 };
  skipProlog(xml, cursor);
  const element = parseElement(xml, cursor);
  if (!element) throw new NodeParsingError('VOSpace response did not contain a node');
  return element;
}

function skipProlog(xml: string, cursor: { i: number }): void {
  for (;;) {
    skipWs(xml, cursor);
    if (xml.startsWith('<?', cursor.i)) {
      const end = xml.indexOf('?>', cursor.i + 2);
      if (end < 0) throw new NodeParsingError('Unclosed XML declaration');
      cursor.i = end + 2;
      continue;
    }
    if (xml.startsWith('<!--', cursor.i)) {
      cursor.i = endOf(xml, '-->', cursor.i + 4, 'Unclosed XML comment');
      continue;
    }
    if (xml.startsWith('<!', cursor.i)) {
      cursor.i = endOf(xml, '>', cursor.i + 2, 'Unclosed XML declaration');
      continue;
    }
    return;
  }
}

function parseElement(xml: string, cursor: { i: number }): XmlElement | null {
  skipWs(xml, cursor);
  if (cursor.i >= xml.length) return null;
  if (xml.startsWith('<!--', cursor.i)) {
    cursor.i = endOf(xml, '-->', cursor.i + 4, 'Unclosed XML comment');
    return parseElement(xml, cursor);
  }
  if (xml[cursor.i] !== '<' || xml.startsWith('</', cursor.i)) return null;

  const tag = readTag(xml, cursor.i + 1);
  cursor.i = tag.end;
  const { name, attrs } = parseStartTag(tag.raw);
  const element: XmlElement = { name, attrs, children: [], text: '' };
  if (tag.selfClosing) return element;

  let text = '';
  while (cursor.i < xml.length) {
    if (xml.startsWith('</', cursor.i)) {
      const closeEnd = xml.indexOf('>', cursor.i + 2);
      if (closeEnd < 0) throw new NodeParsingError(`Unclosed XML element ${name}`);
      const closeName = localName(xml.slice(cursor.i + 2, closeEnd).trim());
      if (closeName !== name) {
        throw new NodeParsingError(`Unexpected closing tag ${closeName} for ${name}`);
      }
      cursor.i = closeEnd + 1;
      element.text = decodeXml(text).trim();
      return element;
    }
    if (xml.startsWith('<!--', cursor.i)) {
      cursor.i = endOf(xml, '-->', cursor.i + 4, 'Unclosed XML comment');
      continue;
    }
    if (xml.startsWith('<![CDATA[', cursor.i)) {
      const end = xml.indexOf(']]>', cursor.i + 9);
      if (end < 0) throw new NodeParsingError('Unclosed CDATA section');
      text += xml.slice(cursor.i + 9, end);
      cursor.i = end + 3;
      continue;
    }
    if (xml[cursor.i] === '<') {
      const child = parseElement(xml, cursor);
      if (child) element.children.push(child);
      continue;
    }
    text += xml[cursor.i];
    cursor.i += 1;
  }
  throw new NodeParsingError(`Unclosed XML element ${name}`);
}

function readTag(xml: string, start: number): { raw: string; end: number; selfClosing: boolean } {
  let i = start;
  let quote: string | null = null;
  while (i < xml.length) {
    const ch = xml[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      let raw = xml.slice(start, i).trim();
      const selfClosing = raw.endsWith('/');
      if (selfClosing) raw = raw.slice(0, -1).trim();
      return { raw, end: i + 1, selfClosing };
    }
    i += 1;
  }
  throw new NodeParsingError('Unclosed XML tag');
}

function parseStartTag(raw: string): { name: string; attrs: Record<string, string> } {
  const match = /^([^\s/>]+)([\s\S]*)$/.exec(raw);
  if (!match) throw new NodeParsingError(`Invalid XML tag: ${raw}`);
  const attrs: Record<string, string> = {};
  const attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let found: RegExpExecArray | null;
  while ((found = attrRe.exec(match[2])) !== null) {
    attrs[found[1]] = decodeXml(found[3] ?? found[4] ?? '');
  }
  return { name: localName(match[1]), attrs };
}

function localName(qname: string): string {
  const colon = qname.lastIndexOf(':');
  return colon >= 0 ? qname.slice(colon + 1) : qname;
}

function skipWs(xml: string, cursor: { i: number }): void {
  while (cursor.i < xml.length && /\s/.test(xml[cursor.i])) cursor.i += 1;
}

function endOf(xml: string, marker: string, from: number, message: string): number {
  const end = xml.indexOf(marker, from);
  if (end < 0) throw new NodeParsingError(message);
  return end + marker.length;
}

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (match, token: string) => {
    switch (token) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default: {
        const codePoint = token[1] === 'x' || token[1] === 'X'
          ? Number.parseInt(token.slice(2), 16)
          : Number.parseInt(token.slice(1), 10);
        if (!Number.isFinite(codePoint)) return match;
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
    }
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
