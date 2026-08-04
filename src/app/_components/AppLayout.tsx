'use client';

import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DesktopOutlined,
  CodeOutlined,
  FolderOutlined,
  SwapOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/servers', icon: <DesktopOutlined />, label: '服务器' },
  { key: '/terminal', icon: <CodeOutlined />, label: '终端' },
  { key: '/files', icon: <FolderOutlined />, label: '文件' },
  { key: '/tunnels', icon: <SwapOutlined />, label: '隧道' },
  { key: '/deploy', icon: <RocketOutlined />, label: '部署' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{
          height: 48,
          margin: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: token.colorPrimary,
          fontWeight: 700,
          fontSize: collapsed ? 14 : 18,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          {collapsed ? 'DG' : 'Deploy GUI'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          height: 48,
          lineHeight: '48px',
          display: 'flex',
          alignItems: 'center',
        }}>
          <span style={{ color: token.colorTextSecondary, fontSize: 14 }}>
            一体化运维面板
          </span>
        </Header>
        <Content style={{ margin: 16 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
