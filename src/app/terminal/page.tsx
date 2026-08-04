'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, Empty, Button, Space, Tag, message } from 'antd';
import { PlusOutlined, CloseOutlined, CodeOutlined } from '@ant-design/icons';
import { useAppStore } from '@/lib/store';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface TermSession {
  key: string;
  serverId: number;
  serverName: string;
  terminal: Terminal;
  fitAddon: FitAddon;
  ws: WebSocket | null;
  destroyed: boolean;
}

function TerminalView({ session }: { session: TermSession }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || session.destroyed) return;
    const container = containerRef.current;

    // 清空容器
    container.innerHTML = '';

    // 打开终端
    session.terminal.open(container);

    // 延迟 fit 确保容器已渲染
    requestAnimationFrame(() => {
      try {
        session.fitAddon.fit();
      } catch {}
    });

    // ResizeObserver 监听容器大小变化
    const ro = new ResizeObserver(() => {
      try {
        session.fitAddon.fit();
      } catch {}
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [session]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

export default function TerminalPage() {
  const { selectedServer, terminalTabs, addTerminalTab, removeTerminalTab } = useAppStore();
  const [activeKey, setActiveKey] = useState('');
  const [sessions, setSessions] = useState<TermSession[]>([]);
  const sessionsRef = useRef<TermSession[]>([]);
  sessionsRef.current = sessions;

  // 打开新终端
  const openTerminal = (serverId: number, serverName: string) => {
    // 已有同服务器的终端，直接激活
    const existing = sessions.find(s => s.serverId === serverId && !s.destroyed);
    if (existing) {
      setActiveKey(existing.key);
      return;
    }

    const key = `term-${serverId}-${Date.now()}`;

    const terminal = new Terminal({
      fontSize: 14,
      fontFamily: '"MesloLGS NF", Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#c9d1d9',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    const session: TermSession = {
      key, serverId, serverName,
      terminal, fitAddon, ws: null, destroyed: false,
    };

    // 连接 WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${bp}/ws/terminal/${serverId}`;
    const ws = new WebSocket(wsUrl);
    session.ws = ws;
    let ready = false;

    ws.onopen = () => {
      terminal.write('\x1b[33m正在连接...\x1b[0m\r\n');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ready') {
          ready = true;
          terminal.clear();
          ws.send(JSON.stringify({
            type: 'resize',
            rows: terminal.rows,
            cols: terminal.cols,
          }));
        } else if (msg.type === 'output') {
          terminal.write(atob(msg.data));
        } else if (msg.type === 'error') {
          terminal.write(`\r\n\x1b[31m${msg.message}\x1b[0m\r\n`);
        } else if (msg.type === 'closed') {
          terminal.write('\r\n\x1b[33m[连接已关闭]\x1b[0m\r\n');
        }
      } catch {}
    };

    ws.onclose = () => {
      if (ready) {
        terminal.write('\r\n\x1b[33m[连接已断开]\x1b[0m\r\n');
      }
    };

    terminal.onData((data) => {
      if (ready && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data: btoa(data) }));
      }
    });

    terminal.onResize(({ cols, rows }) => {
      if (ready && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', rows, cols }));
      }
    });

    setSessions(prev => [...prev, session]);
    setActiveKey(key);
  };

  // 关闭终端
  const closeTerminal = (key: string) => {
    const session = sessions.find(s => s.key === key);
    if (session) {
      session.destroyed = true;
      if (session.ws) session.ws.close();
      session.terminal.dispose();
    }
    const remaining = sessions.filter(s => s.key !== key);
    setSessions(remaining);
    if (activeKey === key && remaining.length > 0) {
      setActiveKey(remaining[remaining.length - 1].key);
    }
  };

  // 清理已关闭的 sessions
  useEffect(() => {
    return () => {
      sessionsRef.current.forEach(s => {
        s.destroyed = true;
        if (s.ws) s.ws.close();
        s.terminal.dispose();
      });
    };
  }, []);

  const activeSession = sessions.find(s => s.key === activeKey);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          {sessions.map(s => (
            <Tag
              key={s.key}
              color={s.key === activeKey ? 'blue' : 'default'}
              style={{ cursor: 'pointer', padding: '2px 12px', borderRadius: 6 }}
              onClick={() => setActiveKey(s.key)}
              closable
              onClose={(e) => { e.preventDefault(); closeTerminal(s.key); }}
            >
              <CodeOutlined style={{ marginRight: 4 }} />
              {s.serverName}
            </Tag>
          ))}
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!selectedServer}
          onClick={() => selectedServer && openTerminal(selectedServer.id, selectedServer.name)}
        >
          新建终端
        </Button>
      </div>

      {/* 终端区域 */}
      <div style={{
        flex: 1,
        background: '#0d1117',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        minHeight: 0,
      }}>
        {!activeSession ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Empty
              description={selectedServer ? `点击「新建终端」连接 ${selectedServer.name}` : '请先选择服务器'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <TerminalView key={activeSession.key} session={activeSession} />
        )}
      </div>
    </div>
  );
}
