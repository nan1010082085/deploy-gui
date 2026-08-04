'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, message, Popconfirm, Typography, Tooltip, Avatar } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { api, type ServerItem } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import ServerFormModal from './_components/ServerFormModal';

const { Title } = Typography;

export default function ServersPage() {
  const { servers, setServers, setSelectedServer } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServerItem | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, 'success' | 'fail'>>({});

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.listServers();
      setServers(list);
    } catch (e) {
      message.error('加载失败: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await api.testServer(id);
      setTestResults(prev => ({ ...prev, [id]: result.success ? 'success' : 'fail' }));
      if (result.success) message.success(result.message);
      else message.error(result.message);
    } catch (e) {
      setTestResults(prev => ({ ...prev, [id]: 'fail' }));
      message.error('测试失败');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteServer(id);
      message.success('已删除');
      load();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (text: string, record: ServerItem) => (
        <Space>
          <Avatar size={32} style={{ background: '#1668dc', flexShrink: 0 }}>
            {text.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{text}</div>
            <div style={{ fontSize: 11, color: '#8b949e' }}>{record.username}@{record.host}</div>
          </div>
        </Space>
      ),
    },
    { title: '主机', dataIndex: 'host', key: 'host', render: (h: string) => <span style={{ fontFamily: 'monospace' }}>{h}</span> },
    { title: '端口', dataIndex: 'port', key: 'port', width: 70 },
    {
      title: '认证', dataIndex: 'auth_type', key: 'auth_type', width: 80,
      render: (v: string) => v === 'key' ? <Tag color="blue">密钥</Tag> : <Tag color="green">密码</Tag>,
    },
    {
      title: '状态', key: 'status', width: 70,
      render: (_: unknown, record: ServerItem) => {
        const result = testResults[record.id];
        if (result === 'success') return <CheckCircleOutlined style={{ color: '#3fb950', fontSize: 18 }} />;
        if (result === 'fail') return <CloseCircleOutlined style={{ color: '#f85149', fontSize: 18 }} />;
        return <span style={{ color: '#8b949e' }}>—</span>;
      },
    },
    {
      title: '操作', key: 'actions', width: 220,
      render: (_: unknown, record: ServerItem) => (
        <Space size={4}>
          <Button
            size="small"
            type="text"
            icon={<ApiOutlined />}
            loading={testingId === record.id}
            onClick={() => handleTest(record.id)}
          >
            测试
          </Button>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => { setEditing(record); setModalOpen(true); }}
          />
          <Popconfirm title="确定删除此服务器？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>服务器管理</Title>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
            添加服务器
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={servers}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
      />
      <ServerFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />
    </Card>
  );
}
