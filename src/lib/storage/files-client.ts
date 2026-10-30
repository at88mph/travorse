import { withBasePath } from '@/lib/env-client';

export function fileDownloadUrl(filePath: string): string {
  const segments = filePath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return withBasePath(`/api/v1/files/${segments}`);
}

export function folderUploadUrl(folderPath: string): string {
  if (folderPath === '/' || folderPath === '') {
    return withBasePath('/api/v1/folders/files');
  }
  const segments = folderPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return withBasePath(`/api/v1/folders/files/${segments}`);
}

export interface UploadProgressEvent {
  fileName: string;
  loaded: number;
  total: number;
  percent: number | null;
}

export function uploadFilesToFolder(
  folderPath: string,
  files: File[],
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<{ uploaded: { path: string; name: string }[] }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('file', file);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', folderUploadUrl(folderPath));
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!onProgress || files.length !== 1) return;
      const total = event.lengthComputable ? event.total : 0;
      const percent = event.lengthComputable && total > 0 ? Math.round((event.loaded / total) * 100) : null;
      onProgress({
        fileName: files[0].name,
        loaded: event.loaded,
        total,
        percent,
      });
    };

    xhr.onload = () => {
      let body: { uploaded?: { path: string; name: string }[]; message?: string } = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        // ignore
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.uploaded) {
        resolve({ uploaded: body.uploaded });
        return;
      }
      reject(new Error(body.message || xhr.statusText || `Upload failed (HTTP ${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(formData);
  });
}

export interface BrowserDownloadItem {
  path: string;
  name?: string;
}

/**
 * Start download via the BFF (session cookie on first hop). A hidden iframe follows
 * BFF 303 → VOSpace pre-auth URL without `fetch(..., redirect: 'manual')`, which
 * yields opaque status 0 when Location is cross-origin.
 */
export function triggerBrowserDownload(filePath: string): void {
  const url = fileDownloadUrl(filePath);
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.title = 'Download';
  frame.src = url;
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 120_000);
}

export function triggerBrowserDownloads(items: BrowserDownloadItem[]): void {
  items.forEach((item, index) => {
    const run = () => triggerBrowserDownload(item.path);
    if (index === 0) run();
    else window.setTimeout(run, index * 250);
  });
}
