'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Menu, Select, theme, Badge, Tooltip } from 'antd';
import {
  DesktopOutlined,
  CodeOutlined,
  FolderOutlined,
  SwapOutlined,
  RocketOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/servers', icon: <DesktopOutlined />, label: '服务器' },
  { key: '/terminal', icon: <CodeOutlined />, label: '终端' },
  { key: '/files', icon: <FolderOutlined />, label: '文件' },
  { key: '/tunnels', icon: <SwapOutlined />, label: '隧道' },
  { key: '/deploy', icon: <RocketOutlined />, label: '部署' },
];

// 需要全局服务器选择的页面
const serverDependentPages = ['/terminal', '/files', '/tunnels'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { token } = theme.useToken();

  const { selectedServer, setSelectedServer, servers, setServers } = useAppStore();

  // 加载服务器列表
  useEffect(() => {
    api.listServers().then(list => {
      setServers(list);
      // 如果没有选中的服务器，自动选第一个
      if (!selectedServer && list.length > 0) {
        setSelectedServer(list[0]);
      }
    }).catch(() => {});
  }, []);

  const showServerSelector = serverDependentPages.some(p => pathname?.startsWith(p));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 20px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <CloudServerOutlined style={{ fontSize: 22, color: token.colorPrimary }} />
          {!collapsed && (
            <span style={{
              color: token.colorText,
              fontWeight: 700,
              fontSize: 16,
              whiteSpace: 'nowrap',
            }}>
              Deploy GUI
            </span>
          )}
        </div>

        {/* 导航 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />

        {/* 服务器快速选择 */}
        {!collapsed && showServerSelector && (
          <div style={{
            padding: '12px 16px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            marginTop: 8,
          }}>
            <div style={{
              fontSize: 11,
              color: token.colorTextTertiary,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              当前服务器
            </div>
            <Select
              size="small"
              style={{ width: '100%' }}
              value={selectedServer?.id}
              onChange={(id) => {
                const s = servers.find(s => s.id === id);
                if (s) setSelectedServer(s);
              }}
              options={servers.map(s => ({
                value: s.id,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Badge color="green" />
                    <span>{s.name}</span>
                    <span style={{ color: token.colorTextTertiary, fontSize: 11 }}>{s.host}</span>
                  </div>
                ),
              }))}
              placeholder="选择服务器"
            />
          </div>
        )}
      </Sider>

      <Layout style={{ background: token.colorBgLayout }}>
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          height: 56,
          lineHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedServer && showServerSelector && (
              <Tooltip title={`${selectedServer.username}@${selectedServer.host}:${selectedServer.port}`}>
                <Badge color="green" text={
                  <span style={{ color: token.colorText, fontSize: 14 }}>
                    {selectedServer.name}
                    <span style={{ color: token.colorTextTertiary, marginLeft: 8, fontSize: 12 }}>
                      {selectedServer.host}
                    </span>
                  </span>
                }/>
              </Tooltip>
            )}
            {!showServerSelector && (
              <span style={{ color: token.colorTextSecondary, fontSize: 14 }}>
                {menuItems.find(m => m.key === pathname)?.label || 'Deploy GUI'}
              </span>
            )}
          </div>
        </Header>

        <Content style={{
          margin: 0,
          padding: 20,
          overflow: 'auto',
          height: 'calc(100vh - 56px)',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
