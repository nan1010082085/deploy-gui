'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Button, Tag, Modal, Input, Form, message, Typography, Spin, Empty, Tabs, Badge } from 'antd';
import { RocketOutlined, SettingOutlined, ReloadOutlined, PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface JenkinsJob {
  name: string;
  color: string;
  url: string;
}

interface JenkinsBuild {
  number: number;
  result: string | null;
  timestamp: number;
  duration: number;
  building: boolean;
  url: string;
}

interface JenkinsConfig {
  url: string;
  user: string;
  configured: boolean;
}

function colorToStatus(color: string): { tag: React.ReactNode; label: string } {
  if (!color || color === 'notbuilt') return { tag: <Tag>未构建</Tag>, label: 'notbuilt' };
  if (color === 'disabled') return { tag: <Tag color="default">禁用</Tag>, label: 'disabled' };
  if (color.includes('anime')) return { tag: <Tag color="processing">构建中...</Tag>, label: 'building' };
  if (color.startsWith('blue')) return { tag: <Tag color="success">成功</Tag>, label: 'success' };
  if (color.startsWith('red')) return { tag: <Tag color="error">失败</Tag>, label: 'failed' };
  if (color.startsWith('yellow')) return { tag: <Tag color="warning">不稳定</Tag>, label: 'unstable' };
  return { tag: <Tag>{color}</Tag>, label: color };
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default function DeployPage() {
  const [jobs, setJobs] = useState<JenkinsJob[]>([]);
  const [config, setConfig] = useState<JenkinsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configForm] = Form.useForm();
  const [buildingJobs, setBuildingJobs] = useState<Set<string>>(new Set());
  const [logModal, setLogModal] = useState<{ jobName: string; buildNumber: number; log: string } | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [buildsModal, setBuildsModal] = useState<{ jobName: string; builds: JenkinsBuild[] } | null>(null);
  const [buildsLoading, setBuildsLoading] = useState(false);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/jenkins/config').then(r => r.json());
      setConfig(res);
      configForm.setFieldsValue({ url: res.url, user: res.user });
    } catch { /* */ }
  };

  const loadJobs = useCallback(async () => {
    if (!config?.configured && !config?.url) return;
    setLoading(true);
    try {
      const res = await fetch('/api/jenkins/jobs').then(r => r.json());
      if (res.error) {
        message.error(res.error);
        setJobs([]);
      } else {
        setJobs(res);
      }
    } catch (e) {
      message.error('加载 Job 失败');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { loadConfig(); }, []);
  useEffect(() => { if (config?.configured) loadJobs(); }, [config, loadJobs]);

  // 自动刷新（构建中时每 5s 轮询）
  useEffect(() => {
    const hasBuilding = jobs.some(j => j.color?.includes('anime'));
    if (!hasBuilding) return;
    const timer = setInterval(loadJobs, 5000);
    return () => clearInterval(timer);
  }, [jobs, loadJobs]);

  const handleBuild = async (jobName: string) => {
    setBuildingJobs(prev => new Set(prev).add(jobName));
    try {
      const res = await fetch(`/api/jenkins/jobs/${encodeURIComponent(jobName)}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then(r => r.json());
      if (res.success) {
        message.success(`${jobName}: ${res.message}`);
        setTimeout(loadJobs, 2000);
      } else {
        message.error(`${jobName}: ${res.message || res.error}`);
      }
    } catch (e) {
      message.error('触发失败');
    } finally {
      setBuildingJobs(prev => { const s = new Set(prev); s.delete(jobName); return s; });
    }
  };

  const handleShowBuilds = async (jobName: string) => {
    setBuildsLoading(true);
    setBuildsModal({ jobName, builds: [] });
    try {
      const builds = await fetch(`/api/jenkins/jobs/${encodeURIComponent(jobName)}/builds`).then(r => r.json());
      if (builds.error) {
        message.error(builds.error);
        setBuildsModal(null);
      } else {
        setBuildsModal({ jobName, builds });
      }
    } catch {
      message.error('获取构建历史失败');
      setBuildsModal(null);
    } finally {
      setBuildsLoading(false);
    }
  };

  const handleShowLog = async (jobName: string, buildNumber: number) => {
    setLogLoading(true);
    setLogModal({ jobName, buildNumber, log: '' });
    try {
      const log = await fetch(`/api/jenkins/jobs/${encodeURIComponent(jobName)}/builds?log=${buildNumber}`).then(r => r.text());
      setLogModal({ jobName, buildNumber, log });
    } catch {
      message.error('获取日志失败');
      setLogModal(null);
    } finally {
      setLogLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      await fetch('/api/jenkins/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      message.success('配置已保存');
      setConfigOpen(false);
      loadConfig();
    } catch { /* */ }
  };

  if (!config) return <Card><Spin /></Card>;

  if (!config.configured) {
    return (
      <Card>
        <Empty
          description="Jenkins 未配置"
          style={{ marginTop: 80 }}
        >
          <Button type="primary" icon={<SettingOutlined />} onClick={() => setConfigOpen(true)}>
            配置 Jenkins
          </Button>
        </Empty>
        <Modal
          title="Jenkins 配置"
          open={configOpen}
          onOk={handleSaveConfig}
          onCancel={() => setConfigOpen(false)}
        >
          <Form form={configForm} layout="vertical">
            <Form.Item name="url" label="Jenkins URL" rules={[{ required: true }]}>
              <Input placeholder="http://jenkins.example.com:8080" />
            </Form.Item>
            <Form.Item name="user" label="用户名" rules={[{ required: true }]}>
              <Input placeholder="admin" />
            </Form.Item>
            <Form.Item name="token" label="API Token" rules={[{ required: true }]}>
              <Input.Password placeholder="在 Jenkins > 用户 > 配置 > API Token 获取" />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RocketOutlined />
          <span>部署面板</span>
          <Tag color="blue">{config.url}</Tag>
        </div>
      }
      extra={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={loadJobs}>刷新</Button>
          <Button icon={<SettingOutlined />} onClick={() => { configForm.setFieldsValue({ url: config.url, user: config.user }); setConfigOpen(true); }}>设置</Button>
        </div>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : jobs.length === 0 ? (
        <Empty description="没有找到 Jenkins Job" />
      ) : (
        <Row gutter={[16, 16]}>
          {jobs.map(job => {
            const status = colorToStatus(job.color);
            const isBuilding = buildingJobs.has(job.name);
            return (
              <Col key={job.name} xs={24} sm={12} md={8} lg={6}>
                <Card
                  size="small"
                  hoverable
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      loading={isBuilding}
                      onClick={() => handleBuild(job.name)}
                    >
                      部署
                    </Button>,
                    <Button
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => handleShowBuilds(job.name)}
                    >
                      历史
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong ellipsis style={{ maxWidth: 140 }}>{job.name}</Text>
                        {status.tag}
                      </div>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {job.url}
                      </Text>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Jenkins 配置弹窗 */}
      <Modal
        title="Jenkins 配置"
        open={configOpen}
        onOk={handleSaveConfig}
        onCancel={() => setConfigOpen(false)}
      >
        <Form form={configForm} layout="vertical">
          <Form.Item name="url" label="Jenkins URL" rules={[{ required: true }]}>
            <Input placeholder="http://jenkins.example.com:8080" />
          </Form.Item>
          <Form.Item name="user" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="admin" />
          </Form.Item>
          <Form.Item name="token" label="API Token" rules={[{ required: true }]}>
            <Input.Password placeholder="留空不修改" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 构建历史弹窗 */}
      <Modal
        title={`${buildsModal?.jobName || ''} - 构建历史`}
        open={!!buildsModal}
        onCancel={() => setBuildsModal(null)}
        footer={null}
        width={600}
      >
        {buildsLoading ? <Spin /> : (
          <div>
            {(buildsModal?.builds || []).map(b => (
              <div
                key={b.number}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <Text strong>#{b.number}</Text>
                  {' '}
                  {b.building ? <Tag color="processing">构建中</Tag> :
                   b.result === 'SUCCESS' ? <Tag color="success">成功</Tag> :
                   b.result === 'FAILURE' ? <Tag color="error">失败</Tag> :
                   b.result === 'ABORTED' ? <Tag>中止</Tag> :
                   <Tag>{b.result}</Tag>}
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatTime(b.timestamp)} · {formatDuration(b.duration)}
                  </Text>
                </div>
                <Button size="small" onClick={() => handleShowLog(buildsModal!.jobName, b.number)}>
                  日志
                </Button>
              </div>
            ))}
            {buildsModal?.builds.length === 0 && <Empty description="无构建记录" />}
          </div>
        )}
      </Modal>

      {/* 日志弹窗 */}
      <Modal
        title={`${logModal?.jobName || ''} #${logModal?.buildNumber || ''} - 构建日志`}
        open={!!logModal}
        onCancel={() => setLogModal(null)}
        footer={null}
        width={800}
      >
        {logLoading ? <Spin /> : (
          <pre style={{
            maxHeight: '60vh', overflow: 'auto',
            background: '#1a1a2e', color: '#e0e0e0',
            padding: 12, borderRadius: 6, fontSize: 13,
            fontFamily: 'Menlo, Monaco, monospace',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {logModal?.log || '(空)'}
          </pre>
        )}
      </Modal>
    </Card>
  );
}
