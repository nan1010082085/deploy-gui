'use client';

import { create } from 'zustand';
import type { ServerItem } from './api';

interface AppState {
  // 全局选中的服务器
  selectedServer: ServerItem | null;
  setSelectedServer: (s: ServerItem | null) => void;

  // 服务器列表缓存
  servers: ServerItem[];
  setServers: (s: ServerItem[]) => void;

  // 终端标签页
  terminalTabs: { serverId: number; serverName: string; key: string }[];
  addTerminalTab: (serverId: number, serverName: string) => void;
  removeTerminalTab: (key: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedServer: null,
  setSelectedServer: (s) => set({ selectedServer: s }),

  servers: [],
  setServers: (s) => set({ servers: s }),

  terminalTabs: [],
  addTerminalTab: (serverId, serverName) =>
    set((state) => {
      const exists = state.terminalTabs.find((t) => t.serverId === serverId);
      if (exists) return state;
      return {
        terminalTabs: [
          ...state.terminalTabs,
          { serverId, serverName, key: `term-${serverId}-${Date.now()}` },
        ],
      };
    }),
  removeTerminalTab: (key) =>
    set((state) => ({
      terminalTabs: state.terminalTabs.filter((t) => t.key !== key),
    })),
}));
