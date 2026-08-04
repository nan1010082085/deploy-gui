import { api } from './api';

export interface FileItem {
  filename: string;
  longname: string;
  type: 'dir' | 'file';
  size: number;
  mode: number;
  mtime: number;
  uid: number;
  gid: number;
}

export interface FileListResult {
  path: string;
  items: FileItem[];
}

import { basePath } from './api';
const base = `${basePath}/api/files`;

export const fileApi = {
  list: (serverId: number, path: string) =>
    fetch(`${base}/${serverId}?path=${encodeURIComponent(path)}`).then(r => r.json()) as Promise<FileListResult>,

  mkdir: (serverId: number, path: string) =>
    fetch(`${base}/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mkdir', path }),
    }).then(r => r.json()),

  rmdir: (serverId: number, path: string) =>
    fetch(`${base}/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rmdir', path }),
    }).then(r => r.json()),

  delete: (serverId: number, path: string) =>
    fetch(`${base}/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', path }),
    }).then(r => r.json()),

  rename: (serverId: number, oldPath: string, newPath: string) =>
    fetch(`${base}/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', path: oldPath, newPath }),
    }).then(r => r.json()),

  upload: (serverId: number, remotePath: string, file: File) => {
    const formData = new FormData();
    formData.append('remotePath', remotePath);
    formData.append('file', file);
    return fetch(`${base}/${serverId}/upload`, {
      method: 'POST',
      body: formData,
    }).then(r => r.json());
  },

  downloadUrl: (serverId: number, path: string) =>
    `${base}/${serverId}/download?path=${encodeURIComponent(path)}`,
};

export { api };
