'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Space, message } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import { api, type ServerItem } from '@/lib/api';

interface Props {
  open: boolean;
  editing: ServerItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ServerFormModal({ open, editing, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({
          name: editing.name,
          host: editing.host,
          port: editing.port,
          username: editing.username,
          auth_type: editing.auth_type,
          credential: '', // 不回填密码
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ port: 22, auth_type: 'password' });
      }
    }
  }, [open, editing, form]);

  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      const result = await api.testServerDirect({
        host: values.host,
        port: values.port,
        username: values.username,
        auth_type: values.auth_type,
        credential: values.credential,
      });
      if (result.success) message.success(result.message);
      else message.error(result.message);
    } catch (e) {
      if ((e as Error).message) message.error('表单验证失败');
    } finally {
      setTesting(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editing) {
        const data: Record<string, unknown> = {
          name: values.name,
          host: values.host,
          port: values.port,
          username: values.username,
          auth_type: values.auth_type,
        };
        // 只在填了密码/密钥时才更新凭据
        if (values.credential) {
          data.credential = values.credential;
        }
        await api.updateServer(editing.id, data);
        message.success('更新成功');
      } else {
        await api.createServer(values);
        message.success('创建成功');
      }
      onClose();
      onSuccess();
    } catch (e) {
      if ((e as Error).message) message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={editing ? '编辑服务器' : '添加服务器'}
      open={open}
      onCancel={onClose}
      width={520}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button icon={<ApiOutlined />} loading={testing} onClick={handleTest}>
            测试连接
          </Button>
          <Button type="primary" loading={submitting} onClick={handleOk}>
            {editing ? '保存' : '创建'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ port: 22, auth_type: 'password' }}>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如：生产-Web01" />
        </Form.Item>
        <Form.Item name="host" label="主机" rules={[{ required: true, message: '请输入主机地址' }]}>
          <Input placeholder="IP 或域名" />
        </Form.Item>
        <Form.Item name="port" label="端口" rules={[{ required: true }]}>
          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input placeholder="root" />
        </Form.Item>
        <Form.Item name="auth_type" label="认证方式" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="password">密码</Select.Option>
            <Select.Option value="key">私钥</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          name="credential"
          label={editing ? '密码/私钥（留空不修改）' : '密码/私钥'}
          rules={editing ? [] : [{ required: true, message: '请输入凭据' }]}
        >
          <Input.TextArea
            rows={editing ? 2 : 4}
            placeholder={form.getFieldValue('auth_type') === 'key' ? '粘贴私钥内容' : '输入密码'}
            autoComplete="off"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
