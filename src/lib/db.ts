import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_DIR = resolve(__dirname, '../../data');
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = resolve(DATA_DIR, 'deploy-gui.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = readFileSync(resolve(__dirname, '../db/schema.sql'), 'utf-8');
    db.exec(schema);
  }
  return db;
}

// 类型定义
export interface ServerRow {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  credential: string;
  created_at: string;
  updated_at: string;
}

export interface TunnelRow {
  id: number;
  name: string;
  server_id: number;
  local_port: number;
  remote_host: string;
  remote_port: number;
  auto_start: number;
  status: string;
}

export interface ProjectRow {
  id: number;
  name: string;
  server_id: number | null;
  jenkins_job: string;
  deploy_path: string | null;
  description: string | null;
  created_at: string;
}

/** 返回给前端时隐藏凭据 */
export function sanitizeServer(s: ServerRow) {
  const { credential, ...rest } = s;
  return { ...rest, has_credential: !!credential };
}

export type SanitizedServer = ReturnType<typeof sanitizeServer>;
