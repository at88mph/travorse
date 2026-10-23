'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { normalizedBasePath } from '@/lib/env-client';
import { browseHref, folderBreadcrumbs } from '@/lib/storage/folder-path';
import type { FolderListing, StorageEntry } from '@/lib/storage/types';

interface FolderListingViewProps {
  folderPath: string;
}

type LoadState =
  | { status: 'loading'; slow: boolean }
  | { status: 'ready'; listing: FolderListing }
  | { status: 'error'; message: string; httpStatus?: number };

export function FolderListingView({ folderPath }: FolderListingViewProps) {
  const { status: sessionStatus } = useSession();
  const [state, setState] = useState<LoadState>({ status: 'loading', slow: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', slow: false });
    const slowTimer = window.setTimeout(() => {
      setState((current) => (current.status === 'loading' ? { status: 'loading', slow: true } : current));
    }, 2000);

    const url = entriesUrl(folderPath);
    fetch(url, { credentials: 'same-origin', signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as FolderListing & { message?: string };
        if (!response.ok) {
          if (!controller.signal.aborted) {
            setState({
              status: 'error',
              message: body.message || response.statusText || `HTTP ${response.status}`,
              httpStatus: response.status,
            });
          }
          return;
        }
        if (!controller.signal.aborted) setState({ status: 'ready', listing: body });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ status: 'error', message });
      });

    return () => {
      controller.abort();
      window.clearTimeout(slowTimer);
    };
  }, [folderPath, attempt]);

  return (
    <section className="card" aria-busy={state.status === 'loading'} aria-labelledby="folder-heading">
      <FolderPath folderPath={folderPath} />
      <p className="muted folder-summary">
        <FolderSummary folderPath={folderPath} state={state} />
      </p>
      {state.status === 'loading' ? <LoadingNotice slow={state.slow} /> : null}
      {state.status === 'error' ? (
        <div className="banner-error" role="alert">
          <p>{state.message}</p>
          <div className="banner-actions">
            {(state.httpStatus === 401 || state.httpStatus === 403) && sessionStatus !== 'authenticated' ? (
              <button type="button" className="btn btn-primary" onClick={() => signIn('oidc')}>
                Sign in
              </button>
            ) : null}
            <button type="button" className="btn" onClick={() => setAttempt((value) => value + 1)}>
              Retry
            </button>
          </div>
        </div>
      ) : null}
      {state.status === 'ready' ? <ListingTable listing={state.listing} /> : null}
    </section>
  );
}

function LoadingNotice({ slow }: { slow: boolean }) {
  return (
    <div role="status">
      <p>Loading folder contents…</p>
      {slow ? <p className="muted">This folder may be large; still loading…</p> : null}
      <div className="skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function FolderPath({ folderPath }: { folderPath: string }) {
  const crumbs = folderBreadcrumbs(folderPath);
  return (
    <>
      {crumbs.length > 0 ? (
        <nav aria-label="Folder path">
          <ol className="breadcrumb">
            {crumbs.map((crumb, index) => (
              <li key={crumb.href}>
                {index > 0 ? <PathChevron /> : null}
                <Link href={crumb.href}>{crumb.label}</Link>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <h1 id="folder-heading" className="sr-only">
        {folderPath === '/' ? 'Root' : folderPath}
      </h1>
    </>
  );
}

function PathChevron() {
  return (
    <svg className="breadcrumb-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function FolderSummary({ folderPath, state }: { folderPath: string; state: LoadState }) {
  if (state.status !== 'ready') return <strong>{folderPath}</strong>;
  const count = state.listing.entries.length;
  const noun = count === 1 ? 'item' : 'items';
  return (
    <>
      <strong>{count}</strong> {noun} in <strong>{state.listing.folderPath}</strong>
    </>
  );
}

function ListingTable({ listing }: { listing: FolderListing }) {
  if (listing.entries.length === 0) {
    return <p className="empty-state">This folder is empty.</p>;
  }
  return (
    <div className="table-scroll">
      <table className="listing-table">
        <caption className="sr-only">Contents of {listing.folderPath}</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Size</th>
            <th scope="col">Modified (UTC)</th>
            <th scope="col">Read groups</th>
            <th scope="col">Write groups</th>
            <th scope="col">Owner</th>
          </tr>
        </thead>
        <tbody>
          {listing.entries.map((entry) => (
            <EntryRow key={entry.path} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntryRow({ entry }: { entry: StorageEntry }) {
  return (
    <tr>
      <th scope="row">
        <span className="entry-name">
          <EntryIcon kind={entry.kind} />
          {entry.kind === 'folder' ? <Link href={browseHref(entry.path)}>{entry.name}</Link> : entry.name}
        </span>
      </th>
      <td>{entry.kind === 'file' ? entry.sizeDisplay : ''}</td>
      <td title={entry.modified}>{entry.modifiedDisplay}</td>
      <td>{entry.readGroups.join(', ')}</td>
      <td>{entry.writeGroups.join(', ')}</td>
      <td>{entry.owner}</td>
    </tr>
  );
}

function EntryIcon({ kind }: { kind: StorageEntry['kind'] }) {
  const label = kind === 'folder' ? 'Folder' : kind === 'file' ? 'File' : 'Link';
  return (
    <span className={`entry-icon entry-icon-${kind}`} role="img" aria-label={label}>
      {kind === 'folder' ? <FolderGlyph /> : kind === 'file' ? <FileGlyph /> : <LinkGlyph />}
    </span>
  );
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3.5 7.25A2.25 2.25 0 0 1 5.75 5h3.1l1.7 1.75h7.7a2.25 2.25 0 0 1 2.25 2.25v8A2.25 2.25 0 0 1 18.25 19.5H5.75A2.25 2.25 0 0 1 3.5 17.25v-10z" />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 3.5H7.75A2.25 2.25 0 0 0 5.5 5.75v12.5A2.25 2.25 0 0 0 7.75 20.5h8.5a2.25 2.25 0 0 0 2.25-2.25V8.5L14 3.5z" />
      <path d="M14 3.5V8.5h6" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10.2 13.2a4.25 4.25 0 0 0 6.01.15l1.55-1.55a4.25 4.25 0 0 0-6.01-6.01L10.4 7.14" />
      <path d="M13.8 10.8a4.25 4.25 0 0 0-6.01-.15l-1.55 1.55a4.25 4.25 0 0 0 6.01 6.01l1.35-1.35" />
    </svg>
  );
}

function entriesUrl(folderPath: string): string {
  const base = normalizedBasePath();
  if (folderPath === '/' || folderPath === '') return `${base}/api/v1/folders/entries`;
  const segments = folderPath.split('/').filter(Boolean).map(encodeURIComponent);
  return `${base}/api/v1/folders/${segments.join('/')}/entries`;
}
