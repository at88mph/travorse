import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LISTING_DEFAULT_PAGE_SIZE,
  clampListingPageSize,
} from '@/lib/storage/listing-page-size';

describe('clampListingPageSize', () => {
  it('defaults invalid values to 50', () => {
    assert.equal(clampListingPageSize(Number.NaN), LISTING_DEFAULT_PAGE_SIZE);
    assert.equal(clampListingPageSize(0), LISTING_DEFAULT_PAGE_SIZE);
  });

  it('clamps to max 500', () => {
    assert.equal(clampListingPageSize(999), 500);
  });

  it('accepts user sizes in range', () => {
    assert.equal(clampListingPageSize(50), 50);
    assert.equal(clampListingPageSize(50.9), 50);
  });
});
