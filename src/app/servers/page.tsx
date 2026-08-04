'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, ApiOutlined } from '@ant-design/icons';
import { api, type ServerItem } from '@/lib/api';
import ServerFormModal from './_components/ServerFormModal';

const { Title } = Typography;

export default function ServersPage() {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServerItem | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setServers(await api.listServers());
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
      if (result.success) message.success(result.message);
      else message.error(result.message);
    } catch (e) {
      message.error('测试失败: ' + (e as Error).message);
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
      message.error('删除失败: ' + (e as Error).message);
    }
  };

  const columns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    { title: '主机', dataIndex: 'host', key: 'host' },
    { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '认证方式', dataIndex: 'auth_type', key: 'auth_type', width: 100,
      render: (v: string) => v === 'key' ? <Tag color="blue">密钥</Tag> : <Tag color="green">密码</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 240,
      render: (_: unknown, record: ServerItem) => (
        <Space>
          <Button
            size="small"
            icon={<ApiOutlined />}
            loading={testingId === record.id}
            onClick={() => handleTest(record.id)}
          >
            测试
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => { setEditing(record); setModalOpen(true); }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>服务器管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditing(null); setModalOpen(true); }}
          >
            添加服务器
          </Button>
        </Space>
      </div>
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
