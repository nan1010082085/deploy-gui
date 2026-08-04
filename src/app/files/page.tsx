'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Select, Table, Button, Space, Breadcrumb, Input, Modal, message, Upload, Typography } from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  HomeOutlined,
  ReloadOutlined,
  FolderAddOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { api, type ServerItem } from '@/lib/api';
import { fileApi, type FileItem } from '@/lib/file-api';

const { Title } = Typography;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatTime(mtime: number): string {
  return new Date(mtime * 1000).toLocaleString('zh-CN');
}

export default function FilesPage() {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<number | undefined>();
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newDirName, setNewDirName] = useState('');

  useEffect(() => {
    api.listServers().then(setServers).catch(() => {});
  }, []);

  const loadFiles = useCallback(async () => {
    if (!selectedServerId) return;
    setLoading(true);
    try {
      const result = await fileApi.list(selectedServerId, currentPath);
      // 排序：目录在前
      const sorted = [...result.items].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.filename.localeCompare(b.filename);
      });
      setFiles(sorted);
    } catch (e) {
      message.error('加载失败: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedServerId, currentPath]);

  useEffect(() => {
    if (selectedServerId) loadFiles();
  }, [selectedServerId, currentPath, loadFiles]);

  const handleEnterDir = (dirname: string) => {
    const newPath = currentPath.endsWith('/')
      ? currentPath + dirname
      : currentPath + '/' + dirname;
    setCurrentPath(newPath.replace(/\/+/g, '/'));
  };

  const handlePathSegment = (index: number) => {
    const parts = currentPath.split('/').filter(Boolean);
    const newPath = '/' + parts.slice(0, index + 1).join('/');
    setCurrentPath(newPath === '' ? '/' : newPath);
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  const breadcrumbItems = [
    { title: <a onClick={() => setCurrentPath('/')}><HomeOutlined /> /</a> },
    ...pathParts.map((part, i) => ({
      title: <a onClick={() => handlePathSegment(i)}>{part}</a>,
    })),
  ];

  const handleUpload = async (file: File) => {
    if (!selectedServerId) return false;
    try {
      await fileApi.upload(selectedServerId, currentPath, file);
      message.success(`${file.name} 上传成功`);
      loadFiles();
    } catch (e) {
      message.error('上传失败: ' + (e as Error).message);
    }
    return false; // 阻止 antd Upload 自动上传
  };

  const handleDownload = (file: FileItem) => {
    if (!selectedServerId) return;
    const filePath = currentPath.endsWith('/')
      ? currentPath + file.filename
      : currentPath + '/' + file.filename;
    window.open(fileApi.downloadUrl(selectedServerId, filePath), '_blank');
  };

  const handleDelete = async (file: FileItem) => {
    if (!selectedServerId) return;
    const filePath = currentPath.endsWith('/')
      ? currentPath + file.filename
      : currentPath + '/' + file.filename;
    try {
      if (file.type === 'dir') {
        await fileApi.rmdir(selectedServerId, filePath);
      } else {
        await fileApi.delete(selectedServerId, filePath);
      }
      message.success('已删除');
      loadFiles();
    } catch (e) {
      message.error('删除失败: ' + (e as Error).message);
    }
  };

  const handleMkdir = async () => {
    if (!selectedServerId || !newDirName) return;
    const fullPath = currentPath.endsWith('/')
      ? currentPath + newDirName
      : currentPath + '/' + newDirName;
    try {
      await fileApi.mkdir(selectedServerId, fullPath);
      message.success('目录已创建');
      setMkdirOpen(false);
      setNewDirName('');
      loadFiles();
    } catch (e) {
      message.error('创建失败: ' + (e as Error).message);
    }
  };

  const handleRename = async () => {
    if (!selectedServerId || !renameTarget || !newName) return;
    const oldPath = currentPath.endsWith('/')
      ? currentPath + renameTarget.filename
      : currentPath + '/' + renameTarget.filename;
    const newPath = currentPath.endsWith('/')
      ? currentPath + newName
      : currentPath + '/' + newName;
    try {
      await fileApi.rename(selectedServerId, oldPath, newPath);
      message.success('重命名成功');
      setRenameOpen(false);
      setRenameTarget(null);
      setNewName('');
      loadFiles();
    } catch (e) {
      message.error('重命名失败: ' + (e as Error).message);
    }
  };

  const columns = [
    {
      title: '名称', key: 'filename', ellipsis: true,
      render: (_: unknown, record: FileItem) => (
        <Space>
          {record.type === 'dir' ? <FolderOutlined style={{ color: '#faad14' }} /> : <FileOutlined />}
          {record.type === 'dir' ? (
            <a onClick={() => handleEnterDir(record.filename)}>{record.filename}</a>
          ) : (
            <span>{record.filename}</span>
          )}
        </Space>
      ),
    },
    { title: '大小', key: 'size', width: 100, render: (_: unknown, r: FileItem) => r.type === 'dir' ? '-' : formatSize(r.size) },
    { title: '修改时间', key: 'mtime', width: 180, render: (_: unknown, r: FileItem) => formatTime(r.mtime) },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_: unknown, record: FileItem) => (
        <Space>
          {record.type === 'file' && (
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>下载</Button>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => { setRenameTarget(record); setNewName(record.filename); setRenameOpen(true); }}
          />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>文件管理</Title>
        <Select
          placeholder="选择服务器"
          style={{ width: 240 }}
          value={selectedServerId}
          onChange={(v) => { setSelectedServerId(v); setCurrentPath('/'); }}
          options={servers.map(s => ({ value: s.id, label: `${s.name} (${s.host})` }))}
        />
      </div>

      {selectedServerId && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Breadcrumb items={breadcrumbItems} />
            <Space>
              <Upload beforeUpload={handleUpload} showUploadList={false} multiple={false}>
                <Button icon={<UploadOutlined />}>上传</Button>
              </Upload>
              <Button icon={<FolderAddOutlined />} onClick={() => setMkdirOpen(true)}>新建目录</Button>
              <Button icon={<ReloadOutlined />} onClick={loadFiles}>刷新</Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={files}
            rowKey={(r) => r.filename + r.type}
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ y: 'calc(100vh - 340px)' }}
          />
        </>
      )}

      <Modal
        title="新建目录"
        open={mkdirOpen}
        onOk={handleMkdir}
        onCancel={() => setMkdirOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="目录名"
          value={newDirName}
          onChange={e => setNewDirName(e.target.value)}
          onPressEnter={handleMkdir}
        />
      </Modal>

      <Modal
        title="重命名"
        open={renameOpen}
        onOk={handleRename}
        onCancel={() => setRenameOpen(false)}
        okText="确认"
        cancelText="取消"
      >
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={handleRename}
        />
      </Modal>
    </Card>
  );
}
