import { VOSPACE_XML_NS } from './standards';

/** OpenCADC {@link org.opencadc.vospace.VOS#PROTOCOL_HTTPS_GET}. */
export const VOSPACE_PROTOCOL_HTTPS_GET = 'ivo://ivoa.net/vospace/core#httpsget';

/** OpenCADC {@link org.opencadc.vospace.VOS#VIEW_DEFAULT}. */
export const VOSPACE_VIEW_DEFAULT = 'ivo://ivoa.net/vospace/core#defaultview';

/** Build a sync-2.1 pull transfer document (storage-ui `FileItemServerResource.toEndpoint`). */
export function writePullTransferXml(targetVosUri: string): string {
  const target = escapeXmlText(targetVosUri);
  return `<?xml version="1.0" encoding="UTF-8"?>
<vos:transfer xmlns:vos="${VOSPACE_XML_NS}" version="2.1">
  <vos:target>${target}</vos:target>
  <vos:direction>pullFromVoSpace</vos:direction>
  <vos:view uri="${VOSPACE_VIEW_DEFAULT}"/>
  <vos:protocol uri="${VOSPACE_PROTOCOL_HTTPS_GET}"/>
  <vos:keepBytes>true</vos:keepBytes>
</vos:transfer>`;
}

/** First negotiated HTTPS GET endpoint from a sync transfer response document. */
export function parseTransferEndpoint(transferXml: string): string | null {
  const protocolBlocks = transferXml.match(/<(?:[\w.-]+:)?protocol[\s\S]*?<\/(?:[\w.-]+:)?protocol>/gi);
  if (!protocolBlocks) return null;
  for (const block of protocolBlocks) {
    if (!/httpsget/i.test(block)) continue;
    const endpoint = block.match(/<(?:[\w.-]+:)?endpoint[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?endpoint>/i);
    if (endpoint?.[1]) {
      const value = endpoint[1].trim();
      if (value) return value;
    }
  }
  const anyEndpoint = transferXml.match(
    /<(?:[\w.-]+:)?endpoint[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?endpoint>/i,
  );
  const fallback = anyEndpoint?.[1]?.trim();
  return fallback || null;
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
