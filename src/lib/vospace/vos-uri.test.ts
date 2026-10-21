import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeNodePath, parseVospacePrefix, VosUri } from './vos-uri';

describe('VosUri', () => {
  it('extracts the registry resource id from ! and ~ authorities', () => {
    const bang = new VosUri('vos://cadc.nrc.ca!vospace/zhangsa/nodeWithPropertiesA');
    const tilde = new VosUri('vos://cadc.nrc.ca~vospace/temp/tempFile.txt');
    assert.equal(bang.getServiceURI(), 'ivo://cadc.nrc.ca/vospace');
    assert.equal(tilde.getServiceURI(), 'ivo://cadc.nrc.ca/vospace');
    assert.equal(bang.path, '/zhangsa/nodeWithPropertiesA');
    assert.equal(bang.getName(), 'nodeWithPropertiesA');
    assert.equal(bang.getParent(), '/zhangsa');
    assert.equal(bang.getParentURI()?.toString(), 'vos://cadc.nrc.ca!vospace/zhangsa');
  });

  it('treats ~ and ! as the same service and prefers ~ in common form', () => {
    const bang = new VosUri('vos://cadc.nrc.ca!vospace/temp/tempFile.txt');
    const tilde = new VosUri('vos://cadc.nrc.ca~vospace/temp/tempFile.txt');
    assert.equal(bang.equals(tilde), true);
    assert.equal(bang.toCommonForm().toString(), 'vos://cadc.nrc.ca~vospace/temp/tempFile.txt');
    assert.equal(tilde.toCommonForm(), tilde);
  });

  it('strips a trailing slash and treats the prefix as root', () => {
    const root = new VosUri('vos://cadc.nrc.ca~arc/');
    assert.equal(root.isRoot(), true);
    assert.equal(root.getName(), '');
    assert.equal(root.getParent(), null);
    assert.equal(root.getParentURI(), null);
    assert.equal(root.toString(), 'vos://cadc.nrc.ca~arc');
    assert.equal(root.getPrefix(), 'vos://cadc.nrc.ca~arc');
  });

  it('builds a vos URI from an ivo resource id', () => {
    const uri = VosUri.fromResourceId('ivo://cadc.nrc.ca/arc', '/home/jdoe');
    assert.equal(uri.toString(), 'vos://cadc.nrc.ca~arc/home/jdoe');
    assert.equal(uri.getServiceURI(), 'ivo://cadc.nrc.ca/arc');

    const nested = VosUri.fromResourceId('ivo://cadc.nrc.ca/vospace/files');
    assert.equal(nested.getPrefix(), 'vos://cadc.nrc.ca~vospace~files');
    assert.equal(nested.getServiceURI(), 'ivo://cadc.nrc.ca/vospace/files');
  });

  it('resolves a path under a prefix and decodes the node name', () => {
    const prefix = new VosUri('vos://cadc.nrc.ca~arc');
    const file = prefix.resolve('/home/my file.txt');
    assert.equal(file.path, '/home/my file.txt');
    assert.equal(file.toString(), 'vos://cadc.nrc.ca~arc/home/my%20file.txt');
    assert.equal(file.getName(), 'my file.txt');
    assert.equal(new VosUri(file.toString()).path, file.path);
  });

  it('rejects a non-vos scheme and a prefix that cannot name a service', () => {
    assert.throws(() => new VosUri('https://example.com/arc'), /scheme must be vos/);
    assert.throws(() => parseVospacePrefix('vos://cadc.nrc.ca/arc'), /authority must contain/);
    const prefix = parseVospacePrefix('vos://cadc.nrc.ca!arc/home');
    assert.equal(prefix.getServiceURI(), 'ivo://cadc.nrc.ca/arc');
  });

  it('rejects parent-segment paths', () => {
    assert.throws(() => normalizeNodePath('/home/../secret'), /Invalid VOSpace path/);
    assert.throws(() => new VosUri('vos://cadc.nrc.ca~arc').resolve('a/../../b'), /Invalid VOSpace path/);
  });
});
