import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { authApiBasePath, normalizedBasePath, withBasePath } from './base-path';

describe('base path', () => {
  const previous = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previous;
  });

  it('normalizes empty, root, and prefixed values', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    assert.equal(normalizedBasePath(), '');

    process.env.NEXT_PUBLIC_BASE_PATH = '/';
    assert.equal(normalizedBasePath(), '');

    process.env.NEXT_PUBLIC_BASE_PATH = 'storage';
    assert.equal(normalizedBasePath(), '/storage');

    process.env.NEXT_PUBLIC_BASE_PATH = '/storage/';
    assert.equal(normalizedBasePath(), '/storage');
  });

  it('builds auth and app paths under a context prefix', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/storage';
    assert.equal(authApiBasePath(), '/storage/api/auth');
    assert.equal(withBasePath('/browse'), '/storage/browse');
    assert.equal(withBasePath('api/health'), '/storage/api/health');
  });
});
