'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Breadcrumb, Input, Modal, message, Upload, Typography, Tooltip } from 'antd';
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
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/lib/store';
import { fileApi, type FileItem } from '@/lib/file-api';

const { Title, Text } = Typography;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatTime(mtime: number): string {
  return new Date(mtime * 1000).toLocaleString('zh-CN');
}

function formatPerms(mode: number): string {
  const perms = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
  const octal = (mode & 0o777).toString(8).padStart(3, '0');
  let str = '';
  for (const c of octal) {
    str += perms[parseInt(c)];
  }
  return str;
}

export default function FilesPage() {
  const { selectedServer } = useAppStore();
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newDirName, setNewDirName] = useState('');

  const loadFiles = useCallback(async () => {
    if (!selectedServer) return;
    setLoading(true);
    try {
      const result = await fileApi.list(selectedServer.id, currentPath);
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
  }, [selectedServer, currentPath]);

  useEffect(() => {
    if (selectedServer) {
      setCurrentPath('/');
      loadFiles();
    }
  }, [selectedServer?.id]);

  useEffect(() => {
    if (selectedServer) loadFiles();
  }, [currentPath, loadFiles]);

  const joinPath = (base: string, name: string) => {
    return (base.endsWith('/') ? base + name : base + '/' + name).replace(/\/+/g, '/');
  };

  const handleEnterDir = (dirname: string) => {
    setCurrentPath(joinPath(currentPath, dirname));
  };

  const handlePathSegment = (index: number) => {
    const parts = currentPath.split('/').filter(Boolean);
    const newPath = '/' + parts.slice(0, index + 1).join('/');
    setCurrentPath(newPath === '' ? '/' : newPath);
  };

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath('/' + parts.join('/'));
  };

  const pathParts = currentPath.split('/').filter(Boolean);
  const breadcrumbItems = [
    { title: <a onClick={() => setCurrentPath('/')}><HomeOutlined /></a> },
    ...pathParts.map((part, i) => ({
      title: <a onClick={() => handlePathSegment(i)}>{part}</a>,
    })),
  ];

  const handleUpload = async (file: File) => {
    if (!selectedServer) return false;
    try {
      await fileApi.upload(selectedServer.id, currentPath, file);
      message.success(`${file.name} 上传成功`);
      loadFiles();
    } catch (e) {
      message.error('上传失败: ' + (e as Error).message);
    }
    return false;
  };

  const handleDownload = (file: FileItem) => {
    if (!selectedServer) return;
    window.open(fileApi.downloadUrl(selectedServer.id, joinPath(currentPath, file.filename)), '_blank');
  };

  const handleDelete = async (file: FileItem) => {
    if (!selectedServer) return;
    const filePath = joinPath(currentPath, file.filename);
    try {
      if (file.type === 'dir') await fileApi.rmdir(selectedServer.id, filePath);
      else await fileApi.delete(selectedServer.id, filePath);
      message.success('已删除');
      loadFiles();
    } catch (e) {
      message.error('删除失败: ' + (e as Error).message);
    }
  };

  const handleMkdir = async () => {
    if (!selectedServer || !newDirName) return;
    try {
      await fileApi.mkdir(selectedServer.id, joinPath(currentPath, newDirName));
      message.success('目录已创建');
      setMkdirOpen(false);
      setNewDirName('');
      loadFiles();
    } catch (e) {
      message.error('创建失败: ' + (e as Error).message);
    }
  };

  const handleRename = async () => {
    if (!selectedServer || !renameTarget || !newName) return;
    try {
      await fileApi.rename(
        selectedServer.id,
        joinPath(currentPath, renameTarget.filename),
        joinPath(currentPath, newName)
      );
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
          {record.type === 'dir'
            ? <FolderOutlined style={{ color: '#faad14', fontSize: 16 }} />
            : <FileOutlined style={{ color: '#8b949e', fontSize: 16 }} />}
          {record.type === 'dir' ? (
            <a style={{ fontWeight: 500 }} onClick={() => handleEnterDir(record.filename)}>{record.filename}</a>
          ) : (
            <span>{record.filename}</span>
          )}
        </Space>
      ),
    },
    { title: '大小', key: 'size', width: 100, render: (_: unknown, r: FileItem) => r.type === 'dir' ? '-' : formatSize(r.size) },
    { title: '权限', key: 'perms', width: 100, render: (_: unknown, r: FileItem) => <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatPerms(r.mode)}</Text> },
    { title: '修改时间', key: 'mtime', width: 170, render: (_: unknown, r: FileItem) => <Text type="secondary" style={{ fontSize: 12 }}>{formatTime(r.mtime)}</Text> },
    {
      title: '', key: 'actions', width: 120,
      render: (_: unknown, record: FileItem) => (
        <Space size={4}>
          {record.type === 'file' && (
            <Tooltip title="下载">
              <Button size="small" type="text" icon={<DownloadOutlined />} onClick={() => handleDownload(record)} />
            </Tooltip>
          )}
          <Tooltip title="重命名">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setRenameTarget(record); setNewName(record.filename); setRenameOpen(true); }} />
          </Tooltip>
          <Tooltip title="删除">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!selectedServer) {
    return <Card><div style={{ padding: 40, textAlign: 'center', color: '#8b949e' }}>请先在左侧选择服务器</div></Card>;
  }

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* 工具栏 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Space>
          {currentPath !== '/' && (
            <Button size="small" type="text" icon={<ArrowLeftOutlined />} onClick={goUp} />
          )}
          <Breadcrumb items={breadcrumbItems} />
        </Space>
        <Space>
          <Upload beforeUpload={handleUpload} showUploadList={false} multiple={false}>
            <Button size="small" icon={<UploadOutlined />}>上传</Button>
          </Upload>
          <Button size="small" icon={<FolderAddOutlined />} onClick={() => setMkdirOpen(true)}>新建目录</Button>
          <Button size="small" type="text" icon={<ReloadOutlined />} onClick={loadFiles} />
        </Space>
      </div>

      {/* 文件列表 */}
      <Table
        columns={columns}
        dataSource={files}
        rowKey={(r) => r.filename + r.type}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ y: 'calc(100vh - 280px)' }}
        style={{ flex: 1 }}
      />

      <Modal title="新建目录" open={mkdirOpen} onOk={handleMkdir} onCancel={() => setMkdirOpen(false)} okText="创建" cancelText="取消">
        <Input placeholder="目录名" value={newDirName} onChange={e => setNewDirName(e.target.value)} onPressEnter={handleMkdir} />
      </Modal>

      <Modal title="重命名" open={renameOpen} onOk={handleRename} onCancel={() => setRenameOpen(false)} okText="确认" cancelText="取消">
        <Input value={newName} onChange={e => setNewName(e.target.value)} onPressEnter={handleRename} />
      </Modal>
    </Card>
  );
}
