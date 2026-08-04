import axios from 'axios';
import { getDb } from './db';

/**
 * Jenkins API 封装
 * 文档: https://www.jenkins.io/doc/book/using/remote-access-api/
 */

function getJenkinsConfig() {
  const db = getDb();
  const url = db.prepare('SELECT value FROM config WHERE key = ?').get('jenkins_url') as { value: string } | undefined;
  const user = db.prepare('SELECT value FROM config WHERE key = ?').get('jenkins_user') as { value: string } | undefined;
  const token = db.prepare('SELECT value FROM config WHERE key = ?').get('jenkins_token') as { value: string } | undefined;

  const jenkinsUrl = url?.value || process.env.JENKINS_URL || '';
  const jenkinsUser = user?.value || process.env.JENKINS_USER || '';
  const jenkinsToken = token?.value || process.env.JENKINS_TOKEN || '';

  if (!jenkinsUrl) throw new Error('Jenkins 未配置，请先在设置中填写 Jenkins URL');

  return { jenkinsUrl, jenkinsUser, jenkinsToken };
}

function client() {
  const { jenkinsUrl, jenkinsUser, jenkinsToken } = getJenkinsConfig();
  return axios.create({
    baseURL: jenkinsUrl.replace(/\/$/, ''),
    auth: { username: jenkinsUser, password: jenkinsToken },
    timeout: 15000,
  });
}

export interface JenkinsJob {
  name: string;
  color: string;  // blue=成功, red=失败, notbuilt=未构建, disabled=禁用, anime=构建中
  url: string;
}

export interface JenkinsBuild {
  number: number;
  result: 'SUCCESS' | 'FAILURE' | 'ABORTED' | 'BUILDING' | null;
  timestamp: number;
  duration: number;
  building: boolean;
  url: string;
}

export function saveJenkinsConfig(url: string, user: string, token: string) {
  const db = getDb();
  const upsert = db.prepare(
    'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
  );
  upsert.run('jenkins_url', url, url);
  upsert.run('jenkins_user', user, user);
  upsert.run('jenkins_token', token, token);
}

export function getJenkinsConfigPublic() {
  const db = getDb();
  const url = db.prepare('SELECT value FROM config WHERE key = ?').get('jenkins_url') as { value: string } | undefined;
  const user = db.prepare('SELECT value FROM config WHERE key = ?').get('jenkins_user') as { value: string } | undefined;
  const jenkinsUrl = url?.value || process.env.JENKINS_URL || '';
  const jenkinsUser = user?.value || process.env.JENKINS_USER || '';
  return { url: jenkinsUrl, user: jenkinsUser, configured: !!jenkinsUrl };
}

export async function listJobs(): Promise<JenkinsJob[]> {
  const res = await client().get('/api/json', {
    params: { tree: 'jobs[name,color,url]' },
  });
  return res.data.jobs || [];
}

export async function triggerBuild(jobName: string, params?: Record<string, string>): Promise<{ success: boolean; message: string }> {
  const http = client();
  const encodedJob = encodeURIComponent(jobName);

  try {
    if (params && Object.keys(params).length > 0) {
      // 参数化构建
      const query = new URLSearchParams(params).toString();
      await http.post(`/job/${encodedJob}/buildWithParameters?${query}`);
    } else {
      await http.post(`/job/${encodedJob}/build`);
    }
    return { success: true, message: '构建已触发' };
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 201) {
      return { success: true, message: '构建已触发' };
    }
    return { success: false, message: (e as Error).message };
  }
}

export async function getBuilds(jobName: string, limit = 10): Promise<JenkinsBuild[]> {
  const encodedJob = encodeURIComponent(jobName);
  const res = await client().get(`/job/${encodedJob}/api/json`, {
    params: {
      tree: `builds[number,result,timestamp,duration,building,url]{0,${limit}}`,
    },
  });
  return res.data.builds || [];
}

export async function getBuildLog(jobName: string, buildNumber: number): Promise<string> {
  const encodedJob = encodeURIComponent(jobName);
  const res = await client().get(`/job/${encodedJob}/${buildNumber}/consoleText`, {
    responseType: 'text',
    transformResponse: [(data) => data],
  });
  return res.data;
}

export async function getQueue(): Promise<any[]> {
  const res = await client().get('/queue/api/json');
  return res.data.items || [];
}
