export interface ServerItem {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  has_credential: boolean;
  created_at: string;
  updated_at: string;
}

const apiBase = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  listServers: () => request<ServerItem[]>('/servers'),
  createServer: (data: {
    name: string; host: string; port?: number; username: string;
    auth_type: 'password' | 'key'; credential: string;
  }) => request<ServerItem>('/servers', { method: 'POST', body: JSON.stringify(data) }),
  updateServer: (id: number, data: Partial<{
    name: string; host: string; port: number; username: string;
    auth_type: 'password' | 'key'; credential: string;
  }>) => request<ServerItem>(`/servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteServer: (id: number) => request<{ success: boolean }>(`/servers/${id}`, { method: 'DELETE' }),
  testServer: (id: number) => request<{ success: boolean; message: string }>(`/servers/${id}`, { method: 'POST' }),
  testServerDirect: (data: {
    host: string; port?: number; username: string;
    auth_type: 'password' | 'key'; credential: string;
  }) => request<{ success: boolean; message: string }>('/servers/test', { method: 'POST', body: JSON.stringify(data) }),
};
