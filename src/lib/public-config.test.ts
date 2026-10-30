import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { buildPublicConfig } from './public-config';

const env = process.env;

describe('buildPublicConfig', () => {
  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it('omits invalid logo URLs from the public payload', () => {
    process.env.BRANDING_LOGO_URL = 'javascript:evil';
    const config = buildPublicConfig();
    assert.equal(config.logoUrl, undefined);
  });

  it('includes valid logo URLs', () => {
    process.env.BRANDING_LOGO_URL = 'https://cdn.example/logo.png';
    const config = buildPublicConfig();
    assert.equal(config.logoUrl, 'https://cdn.example/logo.png');
  });
});
