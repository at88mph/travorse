import type { PublicConfig } from '@/lib/public-config';
import { fetchFolderEntries, folderEntriesQueryKey } from '@/lib/storage/entries-client';
import { LISTING_DEFAULT_PAGE_SIZE } from '@/lib/storage/listing-page-size';
import type { FolderListing } from '@/lib/storage/types';

export function folderEntriesInfiniteQueryOptions(
  folderPath: string,
  config: PublicConfig | undefined,
  listingPageSize: number = LISTING_DEFAULT_PAGE_SIZE,
) {
  const paging = config?.features.paging ?? false;
  return {
    queryKey: folderEntriesQueryKey.infinite(folderPath, paging, paging ? listingPageSize : undefined),
    queryFn: ({ pageParam, signal }: { pageParam: string | undefined; signal?: AbortSignal }) =>
      fetchFolderEntries({
        folderPath,
        ...(paging
          ? {
              pageSize: listingPageSize,
              startUri: pageParam,
            }
          : {}),
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: FolderListing) => (paging ? lastPage.nextStartUri : undefined),
    staleTime: 45_000,
  };
}
