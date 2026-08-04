'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, Select, Button, Tabs, Empty, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, type ServerItem } from '@/lib/api';
import { createTerminal, type TerminalSession } from '@/lib/terminal';

export default function TerminalPage() {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeKey, setActiveKey] = useState<string>('');
  const [selectedServerId, setSelectedServerId] = useState<number | undefined>();
  const sessionCounter = useRef(0);

  useEffect(() => {
    api.listServers().then(setServers).catch(() => {});
  }, []);

  const openTerminal = (serverId: number) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    const id = `term-${++sessionCounter.current}`;

    // 先创建占位 tab
    setSessions(prev => [...prev, {
      id,
      serverId,
      serverName: server.name,
      handle: null as any,
    }]);
    setActiveKey(id);

    // 等待 DOM 渲染后初始化终端
    setTimeout(() => {
      const container = document.getElementById(`terminal-container-${id}`);
      if (!container) return;

      const handle = createTerminal(
        container,
        serverId,
        () => {},
        () => message.info(`${server.name} 连接已关闭`),
        (msg) => message.error(msg)
      );

      setSessions(prev => prev.map(s => s.id === id ? { ...s, handle } : s));
    }, 100);
  };

  const closeTerminal = (id: string) => {
    setSessions(prev => {
      const session = prev.find(s => s.id === id);
      if (session?.handle) session.handle.destroy();
      const remaining = prev.filter(s => s.id !== id);
      if (activeKey === id && remaining.length > 0) {
        setActiveKey(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  };

  const tabItems = sessions.map(s => ({
    key: s.id,
    label: `${s.serverName}`,
    children: (
      <div
        id={`terminal-container-${s.id}`}
        style={{
          height: 'calc(100vh - 220px)',
          minHeight: 400,
          background: '#1a1a2e',
          padding: 4,
        }}
      />
    ),
  }));

  return (
    <Card
      title="Web 终端"
      extra={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select
            placeholder="选择服务器"
            style={{ width: 200 }}
            value={selectedServerId}
            onChange={setSelectedServerId}
            options={servers.map(s => ({
              value: s.id,
              label: `${s.name} (${s.host})`,
            }))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!selectedServerId}
            onClick={() => selectedServerId && openTerminal(selectedServerId)}
          >
            打开终端
          </Button>
        </div>
      }
    >
      {sessions.length === 0 ? (
        <Empty description="选择服务器并打开终端" style={{ marginTop: 80 }} />
      ) : (
        <Tabs
          type="editable"
          hideAdd
          activeKey={activeKey}
          onChange={setActiveKey}
          onEdit={(key, action) => action === 'remove' && closeTerminal(key as string)}
          items={tabItems}
          destroyInactiveTabPane={false}
        />
      )}
    </Card>
  );
}
