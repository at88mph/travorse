/** Max page size accepted by the BFF (maps to VOSpace `limit`). */
export const LISTING_MAX_PAGE_SIZE = 500;

export const LISTING_MIN_PAGE_SIZE = 1;

/** Default when paging is enabled and the user has not chosen another size. */
export const LISTING_DEFAULT_PAGE_SIZE = 50;

/** Presets offered in the folder listing UI when paging is enabled. */
export const LISTING_PAGE_SIZE_OPTIONS: readonly number[] = [25, 50, 100, 200, 500];

export const LISTING_PAGE_SIZE_STORAGE_KEY = 'travorse-listing-page-size';

export function clampListingPageSize(value: number): number {
  const n = Math.floor(value);
  if (Number.isNaN(n) || n < LISTING_MIN_PAGE_SIZE) return LISTING_DEFAULT_PAGE_SIZE;
  return Math.min(n, LISTING_MAX_PAGE_SIZE);
}

export function readStoredListingPageSize(): number {
  if (typeof window === 'undefined') return LISTING_DEFAULT_PAGE_SIZE;
  try {
    const raw = localStorage.getItem(LISTING_PAGE_SIZE_STORAGE_KEY);
    if (raw == null) return LISTING_DEFAULT_PAGE_SIZE;
    return clampListingPageSize(parseInt(raw, 10));
  } catch {
    return LISTING_DEFAULT_PAGE_SIZE;
  }
}

export function writeStoredListingPageSize(size: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LISTING_PAGE_SIZE_STORAGE_KEY, String(clampListingPageSize(size)));
  } catch {
    // ignore quota / private mode
  }
}
