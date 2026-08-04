'use client';

import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#1668dc',
            borderRadius: 8,
            colorBgLayout: '#0d1117',
            colorBgContainer: '#161b22',
            colorBgElevated: '#1c2128',
            colorBorder: '#30363d',
            colorBorderSecondary: '#21262d',
            fontSize: 14,
          },
          components: {
            Layout: {
              siderBg: '#0d1117',
              headerBg: '#161b22',
              bodyBg: '#0d1117',
            },
            Menu: {
              itemBg: 'transparent',
              itemSelectedBg: '#1f6feb22',
              itemSelectedColor: '#58a6ff',
              itemHoverBg: '#1f6feb11',
            },
            Table: {
              headerBg: '#161b22',
              headerColor: '#8b949e',
              rowHoverBg: '#1c2128',
              borderColor: '#21262d',
            },
            Card: {
              colorBgContainer: '#161b22',
              colorBorderSecondary: '#21262d',
            },
            Modal: {
              contentBg: '#161b22',
              headerBg: '#161b22',
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
