import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTransferEndpoint, writePullTransferXml } from '@/lib/vospace/transfer-xml';

describe('transfer-xml', () => {
  it('writes pullFromVoSpace transfer request', () => {
    const xml = writePullTransferXml('vos://example~svc/home/file.fits');
    assert.match(xml, /pullFromVoSpace/);
    assert.match(xml, /vos:\/\/example~svc\/home\/file\.fits/);
    assert.match(xml, /httpsget/);
  });

  it('parses negotiated endpoint from transfer response', () => {
    const xml = `<?xml version="1.0"?>
<vos:transfer xmlns:vos="http://www.ivoa.net/xml/VOSpace/v2.0" version="2.1">
  <vos:target>vos://example~svc/home/.bash_history</vos:target>
  <vos:direction>pullFromVoSpace</vos:direction>
  <vos:protocol uri="ivo://ivoa.net/vospace/core#httpsget">
    <vos:endpoint>https://data.example/preauth/abc123</vos:endpoint>
  </vos:protocol>
</vos:transfer>`;
    assert.equal(parseTransferEndpoint(xml), 'https://data.example/preauth/abc123');
  });
});
