'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalHandle {
  terminal: Terminal;
  fitAddon: FitAddon;
  ws: WebSocket;
  container: HTMLElement;
  destroy: () => void;
}

export interface TerminalSession {
  id: string;
  serverId: number;
  serverName: string;
  handle: TerminalHandle;
}

/** 创建一个终端实例并连接 WebSocket */
export function createTerminal(
  container: HTMLElement,
  serverId: number,
  onReady?: () => void,
  onClose?: () => void,
  onError?: (msg: string) => void
): TerminalHandle {
  const terminal = new Terminal({
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
    theme: {
      background: '#1a1a2e',
      foreground: '#e0e0e0',
      cursor: '#ffffff',
    },
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(container);
  fitAddon.fit();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${serverId}`;
  const ws = new WebSocket(wsUrl);

  let ready = false;

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'ready') {
        ready = true;
        // 发送初始尺寸
        ws.send(JSON.stringify({
          type: 'resize',
          rows: terminal.rows,
          cols: terminal.cols,
        }));
        onReady?.();
      } else if (msg.type === 'output') {
        terminal.write(atob(msg.data));
      } else if (msg.type === 'error') {
        terminal.write(`\r\n\x1b[31m[错误] ${msg.message}\x1b[0m\r\n`);
        onError?.(msg.message);
      } else if (msg.type === 'closed') {
        terminal.write('\r\n\x1b[33m[连接已关闭]\x1b[0m\r\n');
        onClose?.();
      }
    } catch { /* ignore */ }
  };

  // 键盘输入 -> WS
  terminal.onData((data) => {
    if (ready) {
      ws.send(JSON.stringify({
        type: 'input',
        data: btoa(data),
      }));
    }
  });

  // 窗口大小变化
  const onResize = () => {
    fitAddon.fit();
    if (ready) {
      ws.send(JSON.stringify({
        type: 'resize',
        rows: terminal.rows,
        cols: terminal.cols,
      }));
    }
  };
  window.addEventListener('resize', onResize);

  const destroy = () => {
    window.removeEventListener('resize', onResize);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    terminal.dispose();
  };

  return { terminal, fitAddon, ws, container, destroy };
}
