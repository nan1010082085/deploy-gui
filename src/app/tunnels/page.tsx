'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, Switch, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { api, type ServerItem } from '@/lib/api';

const { Title } = Typography;

interface TunnelItem {
  id: number;
  name: string;
  server_id: number;
  server_name: string;
  server_host: string;
  local_port: number;
  remote_host: string;
  remote_port: number;
  auto_start: number;
  status: string;
}

export default function TunnelsPage() {
  const [tunnels, setTunnels] = useState<TunnelItem[]>([]);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TunnelItem | null>(null);
  const [form] = Form.useForm();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tunnelRes, serverRes] = await Promise.all([
        fetch('/api/tunnels').then(r => r.json()),
        api.listServers(),
      ]);
      setTunnels(tunnelRes);
      setServers(serverRes);
    } catch (e) {
      message.error('加载失败: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStart = async (id: number) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/tunnels/${id}/start`, { method: 'POST' }).then(r => r.json());
      if (res.success) message.success('隧道已启动');
      else message.error(res.error || '启动失败');
      load();
    } catch (e) {
      message.error('启动失败: ' + (e as Error).message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleStop = async (id: number) => {
    setTogglingId(id);
    try {
      await fetch(`/api/tunnels/${id}/stop`, { method: 'POST' });
      message.success('隧道已停止');
      load();
    } catch (e) {
      message.error('停止失败: ' + (e as Error).message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/tunnels/${id}`, { method: 'DELETE' });
      message.success('已删除');
      load();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const handleEdit = (tunnel: TunnelItem) => {
    setEditing(tunnel);
    form.setFieldsValue({
      name: tunnel.name,
      server_id: tunnel.server_id,
      local_port: tunnel.local_port,
      remote_host: tunnel.remote_host,
      remote_port: tunnel.remote_port,
      auto_start: tunnel.auto_start === 1,
    });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ remote_host: '127.0.0.1', auto_start: false });
    setModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, auto_start: values.auto_start ? 1 : 0 };
      if (editing) {
        await fetch(`/api/tunnels/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        message.success('更新成功');
      } else {
        await fetch('/api/tunnels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        message.success('创建成功');
      }
      setModalOpen(false);
      load();
    } catch { /* form validation */ }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (t: string) => <strong>{t}</strong> },
    {
      title: '服务器', key: 'server',
      render: (_: unknown, r: TunnelItem) => `${r.server_name} (${r.server_host})`,
    },
    {
      title: '转发', key: 'forward',
      render: (_: unknown, r: TunnelItem) => (
        <span>
          <Tag color="blue">本地:{r.local_port}</Tag>
          →
          <Tag color="cyan">{r.remote_host}:{r.remote_port}</Tag>
        </span>
      ),
    },
    {
      title: '自动启动', dataIndex: 'auto_start', key: 'auto_start', width: 90,
      render: (v: number) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => s === 'running'
        ? <Tag color="success">● 运行中</Tag>
        : <Tag color="default">○ 已停止</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 260,
      render: (_: unknown, r: TunnelItem) => (
        <Space>
          {r.status === 'running' ? (
            <Button size="small" icon={<PauseCircleOutlined />} loading={togglingId === r.id} onClick={() => handleStop(r.id)}>停止</Button>
          ) : (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />} loading={togglingId === r.id} onClick={() => handleStart(r.id)}>启动</Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>SSH 隧道</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加隧道</Button>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={tunnels}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editing ? '编辑隧道' : '添加隧道'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        width={480}
        okText={editing ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：MySQL 隧道" />
          </Form.Item>
          <Form.Item name="server_id" label="服务器" rules={[{ required: true, message: '请选择服务器' }]}>
            <Select
              placeholder="选择服务器"
              options={servers.map(s => ({ value: s.id, label: `${s.name} (${s.host})` }))}
            />
          </Form.Item>
          <Form.Item name="local_port" label="本地端口" rules={[{ required: true, message: '请输入本地端口' }]}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="3306" />
          </Form.Item>
          <Form.Item name="remote_host" label="远程主机" rules={[{ required: true }]}>
            <Input placeholder="127.0.0.1" />
          </Form.Item>
          <Form.Item name="remote_port" label="远程端口" rules={[{ required: true, message: '请输入远程端口' }]}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="3306" />
          </Form.Item>
          <Form.Item name="auto_start" label="自动启动" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
