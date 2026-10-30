import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateHttpLogoUrl } from './branding-config';

describe('validateHttpLogoUrl', () => {
  it('accepts https URLs', () => {
    assert.equal(validateHttpLogoUrl('https://cdn.example/logo.png'), 'https://cdn.example/logo.png');
  });

  it('rejects non-http schemes', () => {
    assert.throws(() => validateHttpLogoUrl('javascript:alert(1)'), /scheme must be http or https/);
  });

  it('rejects invalid URLs', () => {
    assert.throws(() => validateHttpLogoUrl('not-a-url'), /not a URL/);
  });
});
