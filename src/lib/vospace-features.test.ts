import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { getVospaceFeatures } from './vospace-features';

const env = process.env;

describe('getVospaceFeatures', () => {
  beforeEach(() => {
    process.env = { ...env };
    delete process.env.VOSPACE_FEATURE_PAGING;
  });

  afterEach(() => {
    process.env = env;
  });

  it('defaults paging to false', () => {
    assert.equal(getVospaceFeatures().paging, false);
  });

  it('reads paging from env', () => {
    process.env.VOSPACE_FEATURE_PAGING = 'true';
    assert.equal(getVospaceFeatures().paging, true);
  });
});
