import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NodeNotFoundError, NotAuthenticatedError, ServiceNotFoundError } from './errors';
import { containerNode } from './node';
import { VOSPACE_FILES, VOSPACE_FILES_20, VOSPACE_NODES_20, VOSPACE_SYNC_21 } from './standards';
import { VOSpaceClient, type ServiceDirectory } from './vospace-client';

const NODES = 'https://ws.example/vault/nodes';

function client(options: {
  endpoints?: Record<string, string | null>;
  fetchImpl?: typeof fetch;
  token?: string;
  uriPrefix?: string;
}): VOSpaceClient {
  const endpoints = options.endpoints ?? { [VOSPACE_NODES_20]: NODES };
  const services: ServiceDirectory = {
    async getServiceURL(resourceId, standardId) {
      assert.equal(resourceId, 'ivo://cadc.nrc.ca/arc');
      return endpoints[standardId] ?? null;
    },
  };
  return new VOSpaceClient({
    uriPrefix: options.uriPrefix ?? 'vos://cadc.nrc.ca!arc',
    services,
    accessToken: options.token,
    fetchImpl: options.fetchImpl,
  });
}

describe('VOSpaceClient', () => {
  it('derives the resource id and the server base URL from the vos prefix', async () => {
    const vos = client({});
    assert.equal(vos.resourceId, 'ivo://cadc.nrc.ca/arc');
    assert.equal(vos.uriPrefix.toString(), 'vos://cadc.nrc.ca~arc');
    assert.equal(await vos.getBaseURL(), 'https://ws.example/vault');
    assert.equal(await vos.getServiceURL(VOSPACE_NODES_20), NODES);
  });

  it('falls back to the deprecated files standard and uses sync 2.1 only', async () => {
    const vos = client({
      endpoints: {
        [VOSPACE_NODES_20]: NODES,
        [VOSPACE_FILES]: null,
        [VOSPACE_FILES_20]: 'https://ws.example/vault/files/',
        [VOSPACE_SYNC_21]: 'https://ws.example/vault/synctrans',
      },
    });
    assert.equal(await vos.getFilesServiceURL(), 'https://ws.example/vault/files');
    assert.equal(await vos.getSyncServiceURL(), 'https://ws.example/vault/synctrans');
  });

  it('GETs the node URL with the bearer token', async () => {
    let seen = '';
    let auth = '';
    const vos = client({
      token: 'access-token',
      fetchImpl: async (input, init) => {
        seen = String(input);
        auth = new Headers(init?.headers).get('authorization') ?? '';
        const xml = `<?xml version="1.0"?>
          <node xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" uri="vos://cadc.nrc.ca~arc/home/my%20file.txt" xsi:type="vos:DataNode">
            <properties/>
            <accepts/>
            <provides/>
          </node>`;
        return new Response(xml, { status: 200 });
      },
    });

    const node = await vos.getNode('/home/my file.txt', 'detail=min');
    assert.equal(seen, 'https://ws.example/vault/nodes/home/my%20file.txt?detail=min');
    assert.equal(auth, 'Bearer access-token');
    assert.equal(node.type, 'DataNode');
    assert.equal(node.uri, 'vos://cadc.nrc.ca~arc/home/my%20file.txt');
  });

  it('PUTs a container under the configured path prefix', async () => {
    let method = '';
    let url = '';
    let body = '';
    const vos = client({
      uriPrefix: 'vos://cadc.nrc.ca~arc/projects',
      fetchImpl: async (input, init) => {
        method = init?.method ?? '';
        url = String(input);
        body = String(init?.body ?? '');
        return new Response('', { status: 201 });
      },
    });

    const created = await vos.createNode('survey', containerNode());
    assert.equal(method, 'PUT');
    assert.equal(url, 'https://ws.example/vault/nodes/projects/survey');
    assert.match(body, /uri="vos:\/\/cadc\.nrc\.ca~arc\/projects\/survey"/);
    assert.match(body, /xsi:type="vos:ContainerNode"/);
    assert.equal(created.uri, 'vos://cadc.nrc.ca~arc/projects/survey');
    assert.equal(created.type, 'ContainerNode');
  });

  it('maps node-not-found and unauthenticated responses', async () => {
    const missing = client({
      fetchImpl: async () =>
        new Response('<fault><code>NodeNotFound</code><message>missing</message></fault>', {
          status: 404,
        }),
    });
    await assert.rejects(() => missing.getNode('/gone'), (err: unknown) => {
      assert.ok(err instanceof NodeNotFoundError);
      assert.match(err.message, /missing/);
      return true;
    });

    const anon = client({
      fetchImpl: async () => new Response('denied', { status: 401 }),
    });
    await assert.rejects(() => anon.deleteNode('/secret'), NotAuthenticatedError);
  });

  it('fails when the registry has no nodes capability', async () => {
    const vos = client({ endpoints: {} });
    await assert.rejects(() => vos.getBaseURL(), ServiceNotFoundError);
  });
});
